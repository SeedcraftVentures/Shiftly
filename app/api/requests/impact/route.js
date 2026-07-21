import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

// Approval guardrail: what does approving this time off actually cost?
//
// Two situations, deliberately answered differently:
//   A. A rota already exists for the affected week. Then we know exactly which
//      shifts this person holds, so we report those. No solver, no guessing.
//   B. No rota yet. Then we compare, day by day, the staff each shift needs
//      against who is actually available, once with this person and once
//      without. The DELTA is the true cost of approving, so we never blame them
//      for a shortfall that existed anyway.
//
// Deliberately does NOT call the Python solver: that would put a slow, timeout
// exposed network call in front of every approval. This coverage analysis is
// instant and deterministic. It will not catch every subtle infeasibility a full
// solve would (rest rules, consecutive-day limits), but it catches the ones that
// actually happen: too few people, nobody free, no keyholder.
export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const toMin = (t) => { const [h, m] = String(t || '0:0').slice(0, 5).split(':').map(Number); return (h || 0) * 60 + (m || 0) }
function durationHours(start, end) {
  let d = toMin(end) - toMin(start)
  if (d <= 0) d += 1440 // shift crosses midnight
  return d / 60
}
function eachDate(startStr, endStr) {
  const out = []
  const d = new Date(startStr + 'T00:00:00Z')
  const last = new Date(endStr + 'T00:00:00Z')
  while (d <= last) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1) }
  return out
}
// Monday of the week containing this date, matching how Rotas.week_start is stored.
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
const dayIndexOf = (dateStr) => (new Date(dateStr + 'T00:00:00Z').getUTCDay() + 6) % 7

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.length) return NextResponse.json({ error: 'No teams in scope' }, { status: 403 })

    const { data: req } = await supabaseAdmin.from('Requests').select('*').eq('id', id).single()
    if (!req || !teamIds.includes(req.team_id)) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // Only absence types remove someone from the rota.
    if (!['holiday', 'sick'].includes(req.type) || !req.start_date) {
      return NextResponse.json({ hasImpact: false, mode: 'none' })
    }

    const dates = eachDate(req.start_date, req.end_date || req.start_date)
    if (!dates.length) return NextResponse.json({ hasImpact: false, mode: 'none' })

    const [teamRes, staffRes, patternsRes, personRes] = await Promise.all([
      supabaseAdmin.from('Teams').select('team_id, name, location_id').eq('team_id', req.team_id).single(),
      supabaseAdmin.from('Staff').select('staff_id, name, availability, is_keyholder').eq('team_id', req.team_id),
      supabaseAdmin.from('Shift Patterns').select('*').eq('shift_team', req.team_id),
      supabaseAdmin.from('Staff').select('name').eq('staff_id', req.staff_id).single(),
    ])
    const team = teamRes.data
    const teamName = team?.name || 'this team'
    const personName = personRes.data?.name || 'This person'
    if (!team) return NextResponse.json({ hasImpact: false, mode: 'none' })

    // ── Case A: a rota already covers these dates, so report the real shifts ──
    const weekStarts = [...new Set(dates.map(mondayOf))]
    const { data: rotas } = await supabaseAdmin
      .from('Rotas').select('rota_id, week_start, status').eq('location_id', team.location_id).in('week_start', weekStarts)

    if (rotas?.length) {
      const { data: assignments } = await supabaseAdmin
        .from('Rota Assignments').select('shift_id, staff_id, work_date, custom_start, custom_end')
        .in('rota_id', rotas.map((r) => r.rota_id)).eq('staff_id', req.staff_id).in('work_date', dates)

      if (assignments?.length) {
        const patternById = Object.fromEntries((patternsRes.data || []).map((p) => [p.shift_id, p]))
        const shifts = assignments.map((a) => {
          const p = patternById[a.shift_id]
          const start = a.custom_start || p?.start_time
          const end = a.custom_end || p?.end_time
          return {
            work_date: a.work_date,
            day: DAY_NAMES[dayIndexOf(a.work_date)],
            shift_name: p?.shift_name || 'Shift',
            start_time: String(start || '').slice(0, 5),
            end_time: String(end || '').slice(0, 5),
            hours: Math.round(durationHours(start, end) * 10) / 10,
          }
        }).sort((a, b) => a.work_date.localeCompare(b.work_date))

        const totalHours = Math.round(shifts.reduce((n, s) => n + s.hours, 0) * 10) / 10
        const published = rotas.some((r) => r.status === 'Published')
        return NextResponse.json({
          hasImpact: true,
          mode: 'assignments',
          person: personName,
          team_name: teamName,
          published,
          shifts,
          totalHours,
          headline: `${personName} is on ${shifts.length} shift${shifts.length > 1 ? 's' : ''} (${totalHours}h) in ${teamName} ${published ? 'on the published rota' : 'on the draft rota'} for those dates. Approving leaves ${shifts.length > 1 ? 'them' : 'it'} uncovered.`,
        })
      }
      // A rota exists and they are not on it, so approving costs nothing.
      return NextResponse.json({ hasImpact: false, mode: 'assignments', person: personName })
    }

    // ── Case B: no rota yet, so measure the coverage this approval removes ────
    const openDays = new Set(
      ((await supabaseAdmin.from('Location Day Hours').select('day').eq('location_id', team.location_id)).data || []).map((r) => r.day)
    )
    const allStaff = staffRes.data || []
    const patterns = patternsRes.data || []

    // Uncovered shift-hours across the affected dates, counting this person as
    // available and then as away. The difference is what approving actually costs.
    const uncoveredHours = (excludeStaffId) => {
      let hours = 0
      const gaps = []
      for (const date of dates) {
        const di = dayIndexOf(date)
        const dayName = DAY_NAMES[di]
        if (openDays.size > 0 && !openDays.has(dayName)) continue

        const free = allStaff.filter((s) => s.staff_id !== excludeStaffId && s.availability && s.availability[di])
        for (const p of patterns) {
          const runsToday = Array.isArray(p.days) ? p.days.includes(dayName) : false
          if (!runsToday) continue
          const needed = p.num_staff_needed || 1
          const short = Math.max(0, needed - free.length)
          if (short > 0) {
            const h = durationHours(p.start_time, p.end_time) * short
            hours += h
            if (excludeStaffId) gaps.push({ date, day: dayName, shift_name: p.shift_name, short, hours: Math.round(h * 10) / 10 })
          }
          // A keyholder-required shift with no keyholder free is a hard gap too.
          if (p.is_keyholder && !free.some((s) => s.is_keyholder) && excludeStaffId) {
            gaps.push({ date, day: dayName, shift_name: p.shift_name, short: 0, keyholder: true, hours: 0 })
          }
        }
      }
      return { hours: Math.round(hours * 10) / 10, gaps }
    }

    const before = uncoveredHours(null)
    const after = uncoveredHours(req.staff_id)
    const delta = Math.round((after.hours - before.hours) * 10) / 10
    const keyholderGaps = after.gaps.filter((g) => g.keyholder)

    if (delta <= 0 && keyholderGaps.length === 0) {
      return NextResponse.json({ hasImpact: false, mode: 'coverage', person: personName })
    }

    const bits = []
    if (delta > 0) bits.push(`you would need ${delta}h of cover on ${teamName} for that week`)
    if (keyholderGaps.length) bits.push(`${keyholderGaps.length} keyholder shift${keyholderGaps.length > 1 ? 's' : ''} would have no keyholder free`)

    return NextResponse.json({
      hasImpact: true,
      mode: 'coverage',
      person: personName,
      team_name: teamName,
      coverHours: delta,
      keyholderGaps: keyholderGaps.length,
      gaps: after.gaps.slice(0, 8),
      headline: `No rota is built for those dates yet, but with ${personName} away ${bits.join(', and ')}.`,
    })
  } catch (error) {
    console.error('Error checking request impact:', error)
    return NextResponse.json({ error: 'Failed to check impact' }, { status: 500 })
  }
}
