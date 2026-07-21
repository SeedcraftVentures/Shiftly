import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

// Approval guardrail: what does approving this time off actually cost?
//
// Two situations, deliberately answered differently:
//   A. A rota already covers those dates. We read the person's real assignments
//      and report the exact shifts and hours that would go uncovered.
//   B. No rota yet. We compare, per day, TOTAL staffing demand against who is
//      genuinely free, once with this person and once without. The DELTA is the
//      cost of approving, so a request is never blamed for a pre-existing hole.
//
// Deliberately does NOT call the Python solver: that would put a slow, timeout
// exposed call in front of every approval. This is instant and deterministic. It
// misses subtle infeasibility a full solve would catch (rest rules, consecutive
// days) but catches what actually happens: too few people, nobody free, no keyholder.
//
// GET ?id=<requestId>  -> impact for one request
// GET (no id)          -> { impacts: { [id]: impact } } for every PENDING absence
//                         request in scope, so the Inbox can show it inline.
export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const toMin = (t) => { const [h, m] = String(t || '0:0').slice(0, 5).split(':').map(Number); return (h || 0) * 60 + (m || 0) }
function durationHours(start, end) {
  let d = toMin(end) - toMin(start)
  if (d <= 0) d += 1440 // crosses midnight
  return d / 60
}
function eachDate(startStr, endStr) {
  const out = []
  const d = new Date(startStr + 'T00:00:00Z')
  const last = new Date(endStr + 'T00:00:00Z')
  while (d <= last) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1) }
  return out
}
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
const dayIndexOf = (dateStr) => (new Date(dateStr + 'T00:00:00Z').getUTCDay() + 6) % 7
const round1 = (n) => Math.round(n * 10) / 10

// Every individual person-slot a day needs: one entry per head, per shift.
// Aggregating like this is the whole point. Comparing each pattern's own
// requirement against the entire free pool hides the case where four shifts
// each needing one person are covered by two people.
function slotsForDay(patterns, dayName) {
  const slots = []
  for (const p of patterns) {
    if (!Array.isArray(p.days) || !p.days.includes(dayName)) continue
    const hours = durationHours(p.start_time, p.end_time)
    for (let i = 0; i < (p.num_staff_needed || 1); i++) {
      slots.push({ shift_name: p.shift_name, hours, keyholder: !!p.is_keyholder })
    }
  }
  return slots
}

function coverageShortfall({ dates, patterns, allStaff, openDays, excludeStaffId, collectGaps }) {
  let hours = 0
  const gaps = []
  for (const date of dates) {
    const di = dayIndexOf(date)
    const dayName = DAY_NAMES[di]
    if (openDays.size > 0 && !openDays.has(dayName)) continue

    const slots = slotsForDay(patterns, dayName)
    if (!slots.length) continue

    const free = allStaff.filter((s) => s.staff_id !== excludeStaffId && s.availability && s.availability[di])
    const shortCount = Math.max(0, slots.length - free.length)

    if (shortCount > 0) {
      const uncovered = slots.slice(slots.length - shortCount)
      const dayHours = uncovered.reduce((n, s) => n + s.hours, 0)
      hours += dayHours
      if (collectGaps) {
        gaps.push({ date, day: dayName, short: shortCount, hours: round1(dayHours), shift_name: uncovered[0]?.shift_name || 'Shift' })
      }
    }
    // "Nobody can lock up" is a hard gap even when the headcount adds up.
    if (collectGaps && slots.some((s) => s.keyholder) && !free.some((s) => s.is_keyholder)) {
      gaps.push({ date, day: dayName, keyholder: true, short: 0, hours: 0, shift_name: slots.find((s) => s.keyholder)?.shift_name || 'Shift' })
    }
  }
  return { hours: round1(hours), gaps }
}

// Analyse one request against pre-fetched team context.
function analyse(req, ctx) {
  const { team, allStaff, patterns, openDays, rotasByWeek, assignmentsByStaff, personName } = ctx
  const teamName = team?.name || 'this team'
  const dates = eachDate(req.start_date, req.end_date || req.start_date)
  if (!dates.length) return { hasImpact: false, mode: 'none' }

  // ── Case A: a rota already covers these dates ──
  const weekStarts = [...new Set(dates.map(mondayOf))]
  const coveringRotas = weekStarts.map((w) => rotasByWeek[w]).filter(Boolean)
  if (coveringRotas.length) {
    const mine = (assignmentsByStaff[req.staff_id] || []).filter((a) => dates.includes(a.work_date))
    if (mine.length) {
      const patternById = Object.fromEntries(patterns.map((p) => [p.shift_id, p]))
      const shifts = mine.map((a) => {
        const p = patternById[a.shift_id]
        const start = a.custom_start || p?.start_time
        const end = a.custom_end || p?.end_time
        return {
          work_date: a.work_date, day: DAY_NAMES[dayIndexOf(a.work_date)],
          shift_name: p?.shift_name || 'Shift',
          start_time: String(start || '').slice(0, 5), end_time: String(end || '').slice(0, 5),
          hours: round1(durationHours(start, end)),
        }
      }).sort((a, b) => a.work_date.localeCompare(b.work_date))
      const totalHours = round1(shifts.reduce((n, s) => n + s.hours, 0))
      const published = coveringRotas.some((r) => r.status === 'Published')
      return {
        hasImpact: true, mode: 'assignments', person: personName, team_name: teamName,
        published, shifts, totalHours, coverHours: totalHours,
        headline: `${personName} is on ${shifts.length} shift${shifts.length > 1 ? 's' : ''} (${totalHours}h) in ${teamName} on the ${published ? 'published' : 'draft'} rota for those dates. Approving leaves ${shifts.length > 1 ? 'them' : 'it'} uncovered.`,
      }
    }
    return { hasImpact: false, mode: 'assignments', person: personName }
  }

  // ── Case B: no rota yet, so measure the coverage this approval removes ──
  const base = { dates, patterns, allStaff, openDays }
  const before = coverageShortfall({ ...base, excludeStaffId: null, collectGaps: false })
  const after = coverageShortfall({ ...base, excludeStaffId: req.staff_id, collectGaps: true })
  const delta = round1(after.hours - before.hours)
  const keyholderGaps = after.gaps.filter((g) => g.keyholder)

  if (delta <= 0 && keyholderGaps.length === 0) return { hasImpact: false, mode: 'coverage', person: personName }

  const bits = []
  if (delta > 0) bits.push(`you would need ${delta}h of cover on ${teamName}`)
  if (keyholderGaps.length) bits.push(`${keyholderGaps.length} shift${keyholderGaps.length > 1 ? 's' : ''} would have no keyholder free`)

  return {
    hasImpact: true, mode: 'coverage', person: personName, team_name: teamName,
    coverHours: delta, keyholderGaps: keyholderGaps.length,
    gaps: after.gaps.slice(0, 8),
    headline: `No rota is built for those dates yet, but with ${personName} away ${bits.join(', and ')}.`,
  }
}

export async function GET(request) {
  // Declared out here so the catch below can still tell single from batch mode.
  let id = null
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    id = new URL(request.url).searchParams.get('id')

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.length) return NextResponse.json(id ? { hasImpact: false, mode: 'none' } : { impacts: {} })

    // Which requests are we analysing?
    let reqs
    if (id) {
      const { data } = await supabaseAdmin.from('Requests').select('*').eq('id', id).single()
      if (!data || !teamIds.includes(data.team_id)) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      reqs = [data]
    } else {
      const { data } = await supabaseAdmin.from('Requests').select('*')
        .in('team_id', teamIds).eq('status', 'pending').in('type', ['holiday', 'sick'])
      reqs = data || []
    }
    reqs = reqs.filter((r) => ['holiday', 'sick'].includes(r.type) && r.start_date)
    if (!reqs.length) return NextResponse.json(id ? { hasImpact: false, mode: 'none' } : { impacts: {} })

    // Pre-fetch everything once, then analyse each request against it.
    const involvedTeams = [...new Set(reqs.map((r) => r.team_id))]
    const staffIds = [...new Set(reqs.map((r) => r.staff_id).filter(Boolean))]
    const [teamsRes, staffRes, patternsRes, namesRes] = await Promise.all([
      supabaseAdmin.from('Teams').select('team_id, name, location_id').in('team_id', involvedTeams),
      supabaseAdmin.from('Staff').select('staff_id, team_id, name, availability, is_keyholder').in('team_id', involvedTeams),
      supabaseAdmin.from('Shift Patterns').select('*').in('shift_team', involvedTeams),
      staffIds.length ? supabaseAdmin.from('Staff').select('staff_id, name').in('staff_id', staffIds) : Promise.resolve({ data: [] }),
    ])
    const teams = teamsRes.data || []
    const nameById = Object.fromEntries((namesRes.data || []).map((s) => [s.staff_id, s.name]))
    const locationIds = [...new Set(teams.map((t) => t.location_id).filter(Boolean))]

    const allWeekStarts = [...new Set(reqs.flatMap((r) => eachDate(r.start_date, r.end_date || r.start_date).map(mondayOf)))]
    const [hoursRes, rotasRes] = await Promise.all([
      supabaseAdmin.from('Location Day Hours').select('location_id, day').in('location_id', locationIds),
      supabaseAdmin.from('Rotas').select('rota_id, week_start, status, location_id').in('location_id', locationIds).in('week_start', allWeekStarts),
    ])
    const rotas = rotasRes.data || []
    const { data: assignments } = rotas.length
      ? await supabaseAdmin.from('Rota Assignments').select('rota_id, shift_id, staff_id, work_date, custom_start, custom_end').in('rota_id', rotas.map((r) => r.rota_id))
      : { data: [] }

    const impacts = {}
    for (const req of reqs) {
      const team = teams.find((t) => t.team_id === req.team_id)
      if (!team) { impacts[req.id] = { hasImpact: false, mode: 'none' }; continue }
      const openDays = new Set((hoursRes.data || []).filter((h) => h.location_id === team.location_id).map((h) => h.day))
      const rotasByWeek = {}
      for (const r of rotas) if (r.location_id === team.location_id) rotasByWeek[r.week_start] = r
      const teamRotaIds = new Set(rotas.filter((r) => r.location_id === team.location_id).map((r) => r.rota_id))
      const assignmentsByStaff = {}
      for (const a of assignments || []) {
        if (!teamRotaIds.has(a.rota_id)) continue
        ;(assignmentsByStaff[a.staff_id] ||= []).push(a)
      }
      impacts[req.id] = analyse(req, {
        team,
        allStaff: (staffRes.data || []).filter((s) => s.team_id === req.team_id),
        patterns: (patternsRes.data || []).filter((p) => p.shift_team === req.team_id),
        openDays, rotasByWeek, assignmentsByStaff,
        personName: nameById[req.staff_id] || 'This person',
      })
    }

    return NextResponse.json(id ? impacts[reqs[0].id] : { impacts })
  } catch (error) {
    console.error('Error checking request impact:', error)
    return NextResponse.json(id ? { error: 'Failed to check impact' } : { impacts: {} }, { status: 500 })
  }
}
