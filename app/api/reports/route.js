import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'
import { periodCost } from '@/lib/pay'

export const dynamic = 'force-dynamic'

const tzToDec = (t) => { if (!t) return 0; const [h, m] = String(t).slice(0, 5).split(':').map(Number); return (h || 0) + (m || 0) / 60 }
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000)

// GET /api/reports?start=YYYY-MM-DD&weeks=N
// Labour-cost reporting from Rota Assignments × pay basis (lib/pay, same maths as
// payroll). Returns an 8-week trend ending at the selected period, plus per-team and
// per-basis breakdowns for the period.
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { locationIds } = await getOrgScope(userId)
    const empty = { series: [], period: { totalCost: 0, totalHours: 0, byTeam: [], byBasis: {} } }
    if (locationIds.length === 0) return NextResponse.json(empty)

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const weeks = Math.max(1, Math.min(12, parseInt(searchParams.get('weeks') || '1', 10)))
    const onlyStatus = searchParams.get('status') // e.g. 'Published' for projections
    if (!start) return NextResponse.json({ error: 'start is required' }, { status: 400 })

    const TREND = 8
    const periodEnd = addDays(start, weeks * 7)
    const seriesStart = addDays(periodEnd, -TREND * 7)

    const { data: rotas } = await supabaseAdmin.from('Rotas').select('rota_id, status').in('location_id', locationIds)
    const rotaIds = (rotas || []).filter((r) => !onlyStatus || r.status === onlyStatus).map((r) => r.rota_id)
    if (rotaIds.length === 0) return NextResponse.json(empty)

    const { data: assigns } = await supabaseAdmin
      .from('Rota Assignments').select('shift_id, staff_id, work_date, custom_start, custom_end')
      .in('rota_id', rotaIds).gte('work_date', seriesStart).lt('work_date', periodEnd)
    if (!assigns || assigns.length === 0) return NextResponse.json({ ...empty, series: Array.from({ length: TREND }, (_, b) => ({ weekStart: addDays(seriesStart, b * 7), cost: 0, hours: 0 })) })

    const shiftIds = [...new Set(assigns.map((a) => a.shift_id).filter(Boolean))]
    const staffIds = [...new Set(assigns.map((a) => a.staff_id))]
    const [{ data: shifts }, { data: staff }] = await Promise.all([
      supabaseAdmin.from('Shift Patterns').select('shift_id, start_time, end_time, break_duration, break_is_paid').in('shift_id', shiftIds),
      supabaseAdmin.from('Staff').select('staff_id, team_id, wage, pay_basis, annual_salary, annualised_hours, contracted_hours').in('staff_id', staffIds),
    ])
    // Paid hours = clock span minus any UNPAID break (break_duration is in minutes).
    // The break is part of the shift span, so an 8h-worked shift with a 1h unpaid
    // break is a 9h shift on the rota but pays 8h.
    const dur = Object.fromEntries((shifts || []).map((s) => [s.shift_id, Math.max(0, (tzToDec(s.end_time) - tzToDec(s.start_time)) - (s.break_is_paid ? 0 : (s.break_duration || 0) / 60))]))
    const staffById = Object.fromEntries((staff || []).map((s) => [s.staff_id, { ...s, hourly_rate: parseFloat(s.wage) || 0, annual_salary: parseFloat(s.annual_salary) || 0, annualised_hours: parseFloat(s.annualised_hours) || 0 }]))

    // hours[weekBucket][staffId] = hours
    const hours = Array.from({ length: TREND }, () => ({}))
    for (const a of assigns) {
      const b = Math.floor(daysBetween(seriesStart, a.work_date) / 7)
      if (b < 0 || b >= TREND) continue
      const hrs = a.shift_id ? (dur[a.shift_id] || 0) : Math.max(0, tzToDec(a.custom_end) - tzToDec(a.custom_start))
      hours[b][a.staff_id] = (hours[b][a.staff_id] || 0) + hrs
    }

    // weekly series (each bucket is one week → periodCost weeks=1)
    const series = hours.map((wk, b) => {
      let cost = 0, h = 0
      for (const [sid, hrs] of Object.entries(wk)) { const s = staffById[sid]; if (!s) continue; cost += periodCost(s, hrs, 1); h += hrs }
      return { weekStart: addDays(seriesStart, b * 7), cost: Math.round(cost * 100) / 100, hours: Math.round(h * 10) / 10 }
    })

    // selected period = the last `weeks` buckets
    const periodBuckets = hours.slice(TREND - weeks)
    const periodHours = {}
    for (const wk of periodBuckets) for (const [sid, hrs] of Object.entries(wk)) periodHours[sid] = (periodHours[sid] || 0) + hrs

    const byTeamMap = {}, byBasis = { hourly: { cost: 0, hours: 0 }, salary: { cost: 0, hours: 0 }, annualised: { cost: 0, hours: 0 } }
    let totalCost = 0, totalHours = 0
    for (const [sid, hrs] of Object.entries(periodHours)) {
      const s = staffById[sid]; if (!s) continue
      const cost = periodCost(s, hrs, weeks)
      totalCost += cost; totalHours += hrs
      byTeamMap[s.team_id] = byTeamMap[s.team_id] || { team_id: s.team_id, cost: 0, hours: 0 }
      byTeamMap[s.team_id].cost += cost; byTeamMap[s.team_id].hours += hrs
      const basis = s.pay_basis || 'hourly'
      byBasis[basis].cost += cost; byBasis[basis].hours += hrs
    }

    return NextResponse.json({
      series,
      period: {
        start, weeks,
        totalCost: Math.round(totalCost * 100) / 100, totalHours: Math.round(totalHours * 10) / 10,
        byTeam: Object.values(byTeamMap).map((t) => ({ ...t, cost: Math.round(t.cost * 100) / 100, hours: Math.round(t.hours * 10) / 10 })),
        byBasis,
      },
    })
  } catch (error) {
    console.error('Error building report:', error)
    return NextResponse.json({ error: 'Failed to build report', details: error.message }, { status: 500 })
  }
}
