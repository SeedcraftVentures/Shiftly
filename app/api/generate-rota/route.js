import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const ANCHOR = { Open: 'open', Close: 'close', Fixed: 'fixed' }

const hhmm = (t) => (t ? String(t).slice(0, 5) : '00:00')
function dateFor(weekStart, week, dayName) {
  const base = new Date(weekStart + 'T00:00:00Z')
  base.setUTCDate(base.getUTCDate() + (week - 1) * 7 + (DAY_INDEX[dayName] ?? 0))
  return base.toISOString().slice(0, 10)
}

// staff.availability ({dayIndex: true | [start,end]}) → scheduler day-level grid.
// (Time-window precision lives in the Staff page UI; the scheduler gets day-level availability.)
function availabilityGrid(avail) {
  const grid = {}
  for (let d = 0; d < 7; d++) grid[SHORT[d]] = avail && avail[d] ? 'available' : 'unavailable'
  return grid
}

async function callScheduler(pythonUrl, payload) {
  const resp = await fetch(`${pythonUrl}/schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!resp.ok) { const txt = await resp.text(); throw new Error(`Scheduler ${resp.status}: ${txt}`) }
  return resp.json()
}

const LEGAL_MAX = 48 // hard weekly cap per staff
function shiftHours(p) {
  const [sh, sm] = hhmm(p.start_time).split(':').map(Number)
  const [eh, em] = hhmm(p.end_time).split(':').map(Number)
  let d = (eh * 60 + em) - (sh * 60 + sm); if (d <= 0) d += 1440
  return d / 60
}
// When a team can't be scheduled even with policy constraints relaxed, work out the
// real, actionable reason: a day short of available people, or not enough staff-hours.
function diagnoseTeam(teamStaff, teamPatterns, openDayNames) {
  let demandH = 0
  const gaps = []
  for (const p of teamPatterns) {
    const need = p.num_staff_needed || 1
    for (const day of (p.days || [])) {
      if (openDayNames.size > 0 && !openDayNames.has(day)) continue
      demandH += shiftHours(p) * need
      const di = DAY_INDEX[day]
      const avail = teamStaff.filter((s) => s.availability && s.availability[di]).length
      if (avail < need) gaps.push(`${p.shift_name} on ${day} needs ${need} but ${avail} available`)
    }
  }
  if (gaps.length) return `Not enough available staff — ${gaps.slice(0, 2).join('; ')}${gaps.length > 2 ? `; +${gaps.length - 2} more` : ''}. Widen availability or add staff.`
  const capacity = teamStaff.reduce((a, s) => a + Math.min(s.max_hours || s.contracted_hours || LEGAL_MAX, LEGAL_MAX), 0)
  if (demandH > capacity + 0.5) return `Needs more staff — ${Math.round(demandH)}h of shifts but only about ${Math.round(capacity)}h of staff capacity (max ${LEGAL_MAX}h each). Add staff or reduce shift coverage.`
  return 'Could not find a valid schedule. Try adding staff, widening availability, or reducing shift coverage.'
}

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

    const body = await request.json()
    const weekStart = body.weekStart || body.startDate
    const weekCount = body.weekCount || 1
    const onlyTeamId = body.team_id || null
    if (!weekStart) return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })

    const { locationIds, teamIds } = await getOrgScope(userId)
    if (teamIds.length === 0) return NextResponse.json({ error: 'No teams found. Complete onboarding and add staff/shifts first.' }, { status: 400 })

    const scopeTeams = onlyTeamId ? teamIds.filter((t) => t === onlyTeamId) : teamIds

    const [teamsRes, staffRes, shiftsRes, rulesRes, hoursRes] = await Promise.all([
      supabaseAdmin.from('Teams').select('team_id, name').in('team_id', scopeTeams),
      supabaseAdmin.from('Staff').select('*').in('team_id', scopeTeams),
      supabaseAdmin.from('Shift Patterns').select('*').in('shift_team', scopeTeams),
      supabaseAdmin.from('Location Rules').select('location_id, solver_rules').in('location_id', locationIds),
      supabaseAdmin.from('Location Day Hours').select('day').in('location_id', locationIds),
    ])
    if (teamsRes.error) throw teamsRes.error
    if (staffRes.error) throw staffRes.error
    if (shiftsRes.error) throw shiftsRes.error

    // only schedule on days the location is actually open (never closed days)
    const openDayNames = new Set((hoursRes.data || []).map((r) => r.day))
    const teamName = Object.fromEntries((teamsRes.data || []).map((t) => [t.team_id, t.name]))
    const rules = (rulesRes.data || [])[0]?.solver_rules || {}
    const pythonUrl = process.env.PYTHON_SCHEDULER_URL || 'https://shiftly-scheduler-e470.onrender.com'

    const allAssignments = []
    const contractIssues = []
    const skipped = []
    const builtTeamIds = new Set()
    const relaxedTeams = new Set()
    let wallTime = 0

    for (const teamId of scopeTeams) {
      const teamStaff = (staffRes.data || []).filter((s) => s.team_id === teamId)
      const teamPatterns = (shiftsRes.data || []).filter((s) => s.shift_team === teamId)
      if (teamStaff.length === 0 || teamPatterns.length === 0) {
        skipped.push({ teamId, teamName: teamName[teamId], reason: teamStaff.length === 0 ? 'No staff' : 'No shifts' })
        continue
      }

      // staff for the scheduler
      const staff = teamStaff.map((s) => ({
        id: s.staff_id,
        name: s.name,
        contracted_hours: s.contracted_hours || 0,
        max_hours: s.max_hours || s.contracted_hours || 48,
        keyholder: !!s.is_keyholder,
        availability_grid: availabilityGrid(s.availability),
        team_id: teamId,
        team_name: teamName[teamId],
      }))

      // expand each Shift Pattern into one shift per day it runs
      const shifts = []
      for (const p of teamPatterns) {
        const days = Array.isArray(p.days) ? p.days : []
        for (const dayName of days) {
          if (openDayNames.size > 0 && !openDayNames.has(dayName)) continue // skip closed days
          shifts.push({
            id: p.shift_id,
            name: p.shift_name,
            day: dayName,
            start_time: hhmm(p.start_time),
            end_time: hhmm(p.end_time),
            staff_required: p.num_staff_needed || 1,
            keyholder_required: !!p.is_keyholder,
            anchor_type: ANCHOR[p.shift_type] || 'fixed',
          })
        }
      }
      if (shifts.length === 0) { skipped.push({ teamId, teamName: teamName[teamId], reason: 'No shift days' }); continue }

      // generate each week independently (avoids the scheduler's cross-week diversity constraint)
      for (let wk = 1; wk <= weekCount; wk++) {
        let result = await callScheduler(pythonUrl, { staff, shifts, rules, weeks: 1 })
        if (!result.success) {
          // Safety net for the deployed solver: drop the contracted-hours minimum so a
          // rota still builds (shortfalls flagged below). No-op once the solver treats
          // contracted as a soft target. Force fair distribution so the fallback still
          // balances hours sensibly rather than dumping them on one person.
          // Relax every policy ("soft") constraint — contracted hours, keyholder, max
          // consecutive days, min rest — leaving only the physically-unavoidable ones
          // (a shift needs N people and only M are available). This honours "the rota
          // always builds, then we flag what couldn't be met": violations show up in the
          // rule-compliance + contracted-hours diagnostics. If it STILL can't build, the
          // failure is real (not enough available staff) and the reason is specific.
          const relaxed = staff.map((s) => ({ ...s, contracted_hours: 0 }))
          const relaxedRules = { ...rules, fair_distribution: true, enforce_keyholder: false, max_consecutive_days: 7, min_rest_hours: 0 }
          result = await callScheduler(pythonUrl, { staff: relaxed, shifts, rules: relaxedRules, weeks: 1 })
          if (result.success) relaxedTeams.add(teamName[teamId])
        }
        if (!result.success) {
          skipped.push({ teamId, teamName: teamName[teamId], reason: diagnoseTeam(teamStaff, teamPatterns, openDayNames) })
          break // skip this team, keep building the rest
        }
        builtTeamIds.add(teamId)
        wallTime += result.stats?.wall_time || 0
        for (const a of result.assignments || []) {
          allAssignments.push({
            team_id: teamId, team_name: teamName[teamId], week: wk,
            shift_id: a.shift_id, shift_name: a.shift_name, day: a.day,
            work_date: dateFor(weekStart, wk, a.day),
            start_time: a.start_time, end_time: a.end_time,
            keyholder_required: a.keyholder_required, staff_id: a.staff_id, staff_name: a.staff_name,
          })
        }
      }
    }

    // ── rule compliance (post-hoc) — the rota built; flag anything not fully met ──
    const keyholderSet = new Set((staffRes.data || []).filter((s) => s.is_keyholder).map((s) => s.staff_id))
    const byStaff = {}
    for (const a of allAssignments) (byStaff[a.staff_id] ||= []).push(a)
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const dms = (d) => new Date(d + 'T00:00:00Z').getTime()
    const compliance = []

    if (rules.enforce_keyholder !== false) {
      const bad = allAssignments.filter((a) => a.keyholder_required && !keyholderSet.has(a.staff_id))
      compliance.push({ key: 'enforce_keyholder', label: 'Keyholder on open & close', ok: bad.length === 0, detail: bad.length ? `${bad.length} open/close shift(s) without a keyholder` : '' })
    }
    const minRest = Number(rules.min_rest_hours ?? 11)
    let restViol = 0
    for (const list of Object.values(byStaff)) {
      const sorted = [...list].sort((a, b) => (dms(a.work_date) + toMin(a.start_time) * 6e4) - (dms(b.work_date) + toMin(b.start_time) * 6e4))
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = dms(sorted[i - 1].work_date) + toMin(sorted[i - 1].end_time) * 6e4
        const nextStart = dms(sorted[i].work_date) + toMin(sorted[i].start_time) * 6e4
        if ((nextStart - prevEnd) / 36e5 < minRest - 0.01) restViol++
      }
    }
    compliance.push({ key: 'min_rest_hours', label: `Minimum ${minRest}h rest between shifts`, ok: restViol === 0, detail: restViol ? `${restViol} shift pair(s) under ${minRest}h rest` : '' })

    const maxConsec = Number(rules.max_consecutive_days ?? 5)
    let consecViol = 0
    for (const list of Object.values(byStaff)) {
      const dates = [...new Set(list.map((a) => a.work_date))].sort()
      let run = 1, maxRun = 1
      for (let i = 1; i < dates.length; i++) { run = (dms(dates[i]) - dms(dates[i - 1])) / 864e5 === 1 ? run + 1 : 1; maxRun = Math.max(maxRun, run) }
      if (maxRun > maxConsec) consecViol++
    }
    compliance.push({ key: 'max_consecutive_days', label: `Max ${maxConsec} consecutive days`, ok: consecViol === 0, detail: consecViol ? `${consecViol} staff over ${maxConsec} days in a row` : '' })

    // ── contracted-hours diagnostics (route-computed from the final assignments) ──
    const hoursByKey = {}
    for (const a of allAssignments) {
      let d = toMin(a.end_time) - toMin(a.start_time); if (d <= 0) d += 1440
      hoursByKey[`${a.staff_id}__${a.week}`] = (hoursByKey[`${a.staff_id}__${a.week}`] || 0) + d / 60
    }
    for (const s of staffRes.data || []) {
      if (!builtTeamIds.has(s.team_id)) continue
      const contracted = s.contracted_hours || 0
      if (!contracted) continue
      for (let wk = 1; wk <= weekCount; wk++) {
        const actual = Math.round((hoursByKey[`${s.staff_id}__${wk}`] || 0) * 10) / 10
        if (actual < contracted - 1) contractIssues.push({ week: wk, staff_id: s.staff_id, staff_name: s.name, team_name: teamName[s.team_id], contracted, actual, reason: actual === 0 ? 'No shifts assigned this week' : 'Fewer hours than contracted' })
      }
    }

    if (allAssignments.length === 0) {
      return NextResponse.json({
        error: 'No rota generated',
        details: skipped.length ? `Skipped: ${skipped.map((s) => `${s.teamName} (${s.reason})`).join(', ')}` : 'No staff or shifts to schedule.',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      weekStart,
      weekCount,
      assignments: allAssignments,
      contract_issues: contractIssues,
      rule_compliance: compliance,
      skipped,
      relaxed_teams: [...relaxedTeams],
      teams: scopeTeams.filter((id) => builtTeamIds.has(id)).map((id) => ({ id, name: teamName[id] })),
      stats: { wall_time: Math.round(wallTime * 100) / 100, assignments: allAssignments.length },
    })
  } catch (error) {
    console.error('[generate-rota] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate rota', details: error.toString() }, { status: 500 })
  }
}
