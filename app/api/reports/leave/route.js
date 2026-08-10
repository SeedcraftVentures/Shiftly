import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ── Holiday & sick allowance report (per staff, current holiday year) ──────────
// Entitlement is derived (no per-taken bookkeeping): prorated by each person's
// working days. "Taken" = approved holiday requests expanded across their date
// range and counted on the person's working days. days_off is NOT counted (it's
// unpaid preference, not leave). Sick is tracked the same way, separately.

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_INDEX = Object.fromEntries(DAY_NAMES.map((d, i) => [d, i]))
const iso = (d) => d.toISOString().slice(0, 10)
// JS getUTCDay is 0=Sun..6=Sat; convert to our 0=Mon..6=Sun.
const dowMon = (d) => (d.getUTCDay() + 6) % 7

function holidayYearWindow(policy, now) {
  const startMonth = policy.basis === 'financial' ? 4 : policy.basis === 'custom' ? (policy.startMonth || 1) : 1 // calendar=1, financial=4(Apr)
  const y = now.getUTCFullYear()
  let start = new Date(Date.UTC(y, startMonth - 1, 1))
  if (now < start) start = new Date(Date.UTC(y - 1, startMonth - 1, 1))
  const end = new Date(Date.UTC(start.getUTCFullYear() + 1, startMonth - 1, 1)) // exclusive
  return { start, end }
}

// Expand [start, end||start] inclusive, clamped to [winStart, winEnd). Handles a
// null end_date (single day) and rows that only partly overlap the window.
function expandDates(startStr, endStr, winStart, winEnd) {
  const out = []
  if (!startStr) return out
  const s = new Date(startStr + 'T00:00:00Z')
  const e = new Date((endStr || startStr) + 'T00:00:00Z')
  for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d >= winStart && d < winEnd) out.push(new Date(d))
  }
  return out
}

const availWorks = (avail, dow) => { const a = avail ? (avail[dow] ?? avail[String(dow)]) : undefined; return a === true || Array.isArray(a) }

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { locationIds, teamIds } = await getOrgScope(userId)
    const locationId = locationIds[0]
    if (!locationId || teamIds.length === 0) {
      return NextResponse.json({ staff: [], summary: { staffWithUnused: 0, totalUnusedDays: 0 }, weeksToEnd: 0 })
    }

    const [{ data: loc }, { data: hours }, { data: staff }] = await Promise.all([
      supabaseAdmin.from('Locations').select('holiday_year_basis, holiday_year_start_month, holiday_entitlement_weeks, sick_paid_days').eq('location_id', locationId).maybeSingle(),
      supabaseAdmin.from('Location Day Hours').select('day').eq('location_id', locationId),
      supabaseAdmin.from('Staff').select('staff_id, name, team_id, contracted_hours, availability, holiday_entitlement_weeks_override').in('team_id', teamIds).order('name'),
    ])

    const policy = { basis: loc?.holiday_year_basis || 'calendar', startMonth: loc?.holiday_year_start_month || 1, weeks: loc?.holiday_entitlement_weeks ?? 5.6, sickPaidDays: loc?.sick_paid_days ?? null }
    const now = new Date()
    const { start: yearStart, end: yearEnd } = holidayYearWindow(policy, now)
    const openDays = new Set((hours || []).map((r) => DAY_INDEX[r.day]).filter((i) => i != null))

    // Approved holiday/sick starting before the window end; lower bound handled by
    // clamping in expandDates so a null end_date is fine (mirrors generate-rota).
    const { data: reqs } = await supabaseAdmin.from('Requests')
      .select('staff_id, type, start_date, end_date')
      .in('team_id', teamIds).eq('status', 'approved').in('type', ['holiday', 'sick'])
      .lt('start_date', iso(yearEnd))

    const holBy = {}, sickBy = {}
    for (const r of reqs || []) {
      const bucket = r.type === 'sick' ? sickBy : holBy
      ;(bucket[r.staff_id] ||= []).push(...expandDates(r.start_date, r.end_date, yearStart, yearEnd))
    }

    const staffOut = (staff || []).map((st) => {
      const avail = st.availability || {}
      let wdpw = [...openDays].filter((dow) => availWorks(avail, dow)).length
      if (!wdpw) wdpw = Math.max(1, Math.min(openDays.size || 5, Math.round((st.contracted_hours || 0) / 8) || 5))
      const weeks = st.holiday_entitlement_weeks_override != null ? parseFloat(st.holiday_entitlement_weeks_override) : policy.weeks
      const entitlementDays = Math.round(weeks * wdpw)
      const countWorking = (dates) => (dates || []).filter((d) => { const dow = dowMon(d); return openDays.has(dow) && availWorks(avail, dow) }).length
      const holidayTakenDays = countWorking(holBy[st.staff_id])
      const sickDaysUsed = countWorking(sickBy[st.staff_id])
      return {
        staff_id: st.staff_id, name: st.name, team_id: st.team_id,
        workingDaysPerWeek: wdpw, entitlementDays, holidayTakenDays,
        holidayRemainingDays: Math.max(0, entitlementDays - holidayTakenDays),
        sickDaysUsed,
      }
    })

    const weeksToEnd = Math.max(0, Math.round((yearEnd - now) / (7 * 864e5)))
    const UNUSED = 5
    const summary = {
      staffWithUnused: staffOut.filter((s) => s.holidayRemainingDays >= UNUSED).length,
      totalUnusedDays: staffOut.reduce((a, s) => a + s.holidayRemainingDays, 0),
    }

    return NextResponse.json({
      yearStart: iso(yearStart),
      yearEnd: iso(new Date(yearEnd.getTime() - 864e5)), // inclusive last day
      weeksToEnd, sickPaidDays: policy.sickPaidDays,
      staff: staffOut, summary,
    })
  } catch (error) {
    console.error('Error computing leave report:', error)
    return NextResponse.json({ error: 'Failed to compute leave report' }, { status: 500 })
  }
}
