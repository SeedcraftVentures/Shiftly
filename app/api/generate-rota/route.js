import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'
import { requireActive } from '@/lib/entitlement'

export const dynamic = 'force-dynamic'
// The OR-Tools solver can run for tens of seconds on a real week, and longer if the
// hosted scheduler is cold. Vercel kills a function at the plan default (~10-15s)
// unless this is set, which would 504 in production while working fine locally.
// 60s is the Hobby ceiling and safe on Pro too; raise it if the plan allows more.
export const maxDuration = 60

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

// Approved time off is date-ranged, but the scheduler only speaks day-of-week and
// takes ONE availability grid per person for the whole run. So expand each approved
// holiday/sick/days_off request into concrete dates, clamped to the generation
// window. That set is used twice: to mark days unavailable before solving (exact for
// a single week) and to strip anything that slips through afterwards (all runs).
//
// days_off is stored one row per day with start_date == end_date, so it expands to
// exactly the day asked for and needs no special case here.
function expandTimeOff(requests, windowStart, windowEnd) {
  const off = new Set()
  for (const r of requests || []) {
    if (!r.staff_id || !r.start_date) continue
    const rawEnd = r.end_date || r.start_date
    const start = r.start_date < windowStart ? windowStart : r.start_date
    const end = rawEnd > windowEnd ? windowEnd : rawEnd
    if (end < start) continue
    const d = new Date(start + 'T00:00:00Z')
    const last = new Date(end + 'T00:00:00Z')
    while (d <= last) {
      off.add(`${r.staff_id}__${d.toISOString().slice(0, 10)}`)
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }
  return off
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
  const isOpen = (day) => openDayNames.size === 0 || openDayNames.has(day)
  let demandH = 0, totalSlots = 0
  const gaps = []
  const daySlots = {} // day index → staff-slots needed that day
  for (const p of teamPatterns) {
    const need = p.num_staff_needed || 1
    for (const day of (p.days || [])) {
      if (!isOpen(day)) continue
      const di = DAY_INDEX[day]
      demandH += shiftHours(p) * need
      totalSlots += need
      daySlots[di] = (daySlots[di] || 0) + need
      const avail = teamStaff.filter((s) => s.availability && s.availability[di]).length
      if (avail < need) gaps.push(`${p.shift_name} on ${day} needs ${need} but ${avail} available`)
    }
  }
  if (gaps.length) return `Not enough available staff — ${gaps.slice(0, 2).join('; ')}${gaps.length > 2 ? `; +${gaps.length - 2} more` : ''}. Widen availability or add staff.`

  // Linchpin: someone forced to work more days than their max hours allow, because they're
  // the only flexible cover (e.g. teammates are weekday-only / weekend-only). The per-day
  // headcount looks fine, but no single assignment fits within everyone's max hours.
  const avgLen = totalSlots ? demandH / totalSlots : 8
  for (const s of teamStaff) {
    const maxDays = Math.floor(Math.min(s.max_hours || LEGAL_MAX, LEGAL_MAX) / Math.max(avgLen, 1))
    let essential = 0
    for (const di of Object.keys(daySlots)) {
      const avail = teamStaff.filter((x) => x.availability && x.availability[di])
      if (avail.length <= daySlots[di] && avail.some((x) => x.staff_id === s.staff_id)) essential++
    }
    if (essential > maxDays) return `${s.name} would have to work ${essential} days but can only do ${maxDays} within their max hours — they're the only cover available every open day (teammates are limited to certain days). Spread the team's availability across the week, add staff, or raise ${s.name}'s max hours.`
  }

  const capacity = teamStaff.reduce((a, s) => a + Math.min(s.max_hours || s.contracted_hours || LEGAL_MAX, LEGAL_MAX), 0)
  if (demandH > capacity + 0.5) return `Needs more staff — ${Math.round(demandH)}h of shifts but only about ${Math.round(capacity)}h of staff capacity (max ${LEGAL_MAX}h each). Add staff or reduce shift coverage.`
  return 'Could not find a valid schedule. Try widening availability, adding staff, or reducing shift coverage.'
}

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    // Trial/paywall gate: don't burn paid solver compute for an expired trial.
    const denied = await requireActive(userId)
    if (denied) return NextResponse.json({ error: 'trial_ended', ...denied }, { status: 402 })

    const body = await request.json()
    const weekStart = body.weekStart || body.startDate
    const weekCount = body.weekCount || 1
    const onlyTeamId = body.team_id || null
    // Day indices (0=Mon..6=Sun) the manager flagged as busier this run: the solver gets
    // more headroom to add cover on these days.
    const busyDays = Array.isArray(body.busy_days) ? body.busy_days.filter((n) => Number.isInteger(n)) : []
    if (!weekStart) return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })

    const { locationIds, teamIds } = await getOrgScope(userId)
    if (teamIds.length === 0) return NextResponse.json({ error: 'No teams found. Complete onboarding and add staff/shifts first.' }, { status: 400 })

    const scopeTeams = onlyTeamId ? teamIds.filter((t) => t === onlyTeamId) : teamIds

    // Generation window, used to clamp approved time off to the weeks being built.
    const windowStart = weekStart
    const windowEnd = dateFor(weekStart, weekCount, 'Sunday')

    const [teamsRes, staffRes, shiftsRes, rulesRes, hoursRes, timeOffRes] = await Promise.all([
      supabaseAdmin.from('Teams').select('team_id, name').in('team_id', scopeTeams),
      supabaseAdmin.from('Staff').select('*').in('team_id', scopeTeams),
      supabaseAdmin.from('Shift Patterns').select('*').in('shift_team', scopeTeams),
      supabaseAdmin.from('Location Rules').select('location_id, solver_rules').in('location_id', locationIds),
      supabaseAdmin.from('Location Day Hours').select('day').in('location_id', locationIds),
      // Approved time off overlapping the window. Overlap is finished in JS so a null
      // end_date (single-day request) is handled without awkward SQL.
      supabaseAdmin.from('Requests').select('staff_id, type, start_date, end_date')
        .in('team_id', scopeTeams).eq('status', 'approved').in('type', ['holiday', 'sick', 'days_off'])
        .lte('start_date', windowEnd),
    ])
    if (teamsRes.error) throw teamsRes.error
    if (staffRes.error) throw staffRes.error
    if (shiftsRes.error) throw shiftsRes.error

    // only schedule on days the location is actually open (never closed days)
    const openDayNames = new Set((hoursRes.data || []).map((r) => r.day))
    const teamName = Object.fromEntries((teamsRes.data || []).map((t) => [t.team_id, t.name]))
    const rules = (rulesRes.data || [])[0]?.solver_rules || {}
    const pythonUrl = process.env.PYTHON_SCHEDULER_URL || 'https://shiftly-scheduler-e470.onrender.com'
    const offDates = expandTimeOff(timeOffRes.data, windowStart, windowEnd)

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

      // staff for the scheduler. For a single-week run we can map approved time off
      // exactly onto that week's day names and mark them unavailable up front, so the
      // solver never rosters someone who is off. Multi-week runs share one grid across
      // every week, so pre-filtering there would wrongly block a day in weeks the person
      // IS available; those are caught by the post-solve sweep instead.
      const staff = teamStaff.map((s) => {
        const grid = availabilityGrid(s.availability)
        if (weekCount === 1) {
          for (const dayName of DAY_FULL) {
            if (offDates.has(`${s.staff_id}__${dateFor(weekStart, 1, dayName)}`)) {
              grid[SHORT[DAY_INDEX[dayName]]] = 'unavailable'
            }
          }
        }
        return {
          id: s.staff_id,
          name: s.name,
          contracted_hours: s.contracted_hours || 0,
          max_hours: s.max_hours || s.contracted_hours || 48,
          keyholder: !!s.is_keyholder,
          prefers_consistent: !!s.prefers_consistent_shifts,
          availability_grid: grid,
          team_id: teamId,
          team_name: teamName[teamId],
        }
      })

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

      // Keyholder is a LOCATION concern (one person opens, one closes for the whole site),
      // NOT a per-team rule, so the per-team solver never enforces it. We check it
      // location-wide after every team has built (below).
      const solverRules = { ...rules, enforce_keyholder: false }

      // 3-stage solve ladder for `weeksN` weeks: full constraints → relax policy rules
      // (keep contracted as a soft target) → drop contracted entirely (last resort).
      // Always builds something, then we flag whatever isn't fully met.
      const solveLadder = async (weeksN) => {
        let r = await callScheduler(pythonUrl, { staff, shifts, rules: solverRules, weeks: weeksN, busy_days: busyDays })
        if (!r.success) {
          const relaxedRules = { ...solverRules, fair_distribution: true, max_consecutive_days: 7, min_rest_hours: 0 }
          r = await callScheduler(pythonUrl, { staff, shifts, rules: relaxedRules, weeks: weeksN, busy_days: busyDays })
          if (!r.success) {
            const zeroed = staff.map((s) => ({ ...s, contracted_hours: 0 }))
            r = await callScheduler(pythonUrl, { staff: zeroed, shifts, rules: relaxedRules, weeks: weeksN, busy_days: busyDays })
          }
          if (r.success) relaxedTeams.add(teamName[teamId])
        }
        return r
      }
      const pushAssignments = (assignments, wk) => {
        for (const a of assignments || []) {
          allAssignments.push({
            team_id: teamId, team_name: teamName[teamId], week: wk,
            shift_id: a.shift_id, shift_name: a.shift_name, day: a.day,
            work_date: dateFor(weekStart, wk, a.day),
            start_time: a.start_time, end_time: a.end_time,
            keyholder_required: a.keyholder_required, staff_id: a.staff_id, staff_name: a.staff_name,
          })
        }
      }

      // Solve all weeks together so the scheduler can rotate weekend duty across the
      // weeks (cross-week weekend fairness). Fall back to independent per-week solves
      // if the multi-week model can't be satisfied, so a rota always builds.
      const multi = weekCount > 1 ? await solveLadder(weekCount) : null
      if (multi && multi.success) {
        builtTeamIds.add(teamId)
        wallTime += multi.stats?.wall_time || 0
        const byWeek = {}
        for (const a of multi.assignments || []) (byWeek[a.week || 1] ||= []).push(a)
        for (let wk = 1; wk <= weekCount; wk++) pushAssignments(byWeek[wk] || [], wk)
      } else {
        for (let wk = 1; wk <= weekCount; wk++) {
          const result = await solveLadder(1)
          if (!result.success) {
            skipped.push({ teamId, teamName: teamName[teamId], reason: diagnoseTeam(teamStaff, teamPatterns, openDayNames) })
            break // skip this team, keep building the rest
          }
          builtTeamIds.add(teamId)
          wallTime += result.stats?.wall_time || 0
          pushAssignments(result.assignments, wk)
        }
      }
    }

    // ── approved time off: strip anything the solver still landed on it ──────────
    // Runs before compliance and contracted-hours below, so neither counts a shift
    // that is about to be removed. Needed mainly for multi-week runs, where one
    // shared availability grid cannot express "off in week 2 but not week 1".
    // Removing rather than reassigning is deliberate: the shift becomes an honest
    // gap the manager can see and cover, instead of a silent reshuffle.
    const timeOffConflicts = []
    if (offDates.size > 0) {
      for (let i = allAssignments.length - 1; i >= 0; i--) {
        const a = allAssignments[i]
        if (!offDates.has(`${a.staff_id}__${a.work_date}`)) continue
        timeOffConflicts.push({
          staff_id: a.staff_id, staff_name: a.staff_name, team_name: a.team_name,
          week: a.week, work_date: a.work_date, day: a.day,
          shift_name: a.shift_name, start_time: a.start_time, end_time: a.end_time,
        })
        allAssignments.splice(i, 1)
      }
      timeOffConflicts.reverse()
    }

    // ── rule compliance (post-hoc), the rota built; flag anything not fully met ──
    const keyholderSet = new Set((staffRes.data || []).filter((s) => s.is_keyholder).map((s) => s.staff_id))
    const byStaff = {}
    for (const a of allAssignments) (byStaff[a.staff_id] ||= []).push(a)
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const dms = (d) => new Date(d + 'T00:00:00Z').getTime()
    const compliance = []

    // Keyholder is LOCATION-wide and judged on ACTUAL TIMES, not the shift's pin: a keyholder must
    // be present when the first person arrives (open) and when the last leaves (close) each day,
    // across ALL teams. A keyholder working the full span counts for both, no Open/Close tag needed.
    {
      const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const fmtDays = (arr) => [...new Set(arr)].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).map((d) => d.slice(0, 3)).join(', ')
      const byDayLoc = {}
      for (const a of allAssignments) (byDayLoc[`${a.week}__${a.day}`] ||= []).push(a)
      const openDaysMiss = [], closeDaysMiss = []
      for (const [key, list] of Object.entries(byDayLoc)) {
        const day = key.split('__')[1]
        const spans = list.map((a) => { let s = toMin(a.start_time), e = toMin(a.end_time); if (e <= s) e += 1440; return { s, e, kh: keyholderSet.has(a.staff_id) } })
        const openT = Math.min(...spans.map((x) => x.s)), closeT = Math.max(...spans.map((x) => x.e))
        if (!spans.some((x) => x.kh && x.s <= openT + 1)) openDaysMiss.push(day)
        if (!spans.some((x) => x.kh && x.e >= closeT - 1)) closeDaysMiss.push(day)
      }
      const parts = []
      if (openDaysMiss.length) parts.push(`no keyholder at open on ${fmtDays(openDaysMiss)}`)
      if (closeDaysMiss.length) parts.push(`no keyholder at close on ${fmtDays(closeDaysMiss)}`)
      compliance.push({ key: 'keyholder', label: 'Keyholder on open & close', ok: parts.length === 0, detail: parts.join('; ') })
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
      time_off_conflicts: timeOffConflicts,
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
