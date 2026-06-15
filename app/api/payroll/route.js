import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

const tzToDec = (t) => { if (!t) return 0; const [h, m] = String(t).slice(0, 5).split(':').map(Number); return (h || 0) + (m || 0) / 60 }
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

// GET /api/payroll?start=YYYY-MM-DD&weeks=N
// Aggregates Rota Assignments in [start, start+weeks*7) for the active location into
// hours worked per staff member, with each staff member's pay fields. The client turns
// hours → money via lib/pay so payroll and reporting always agree.
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { locationIds } = await getOrgScope(userId)
    if (locationIds.length === 0) return NextResponse.json({ staff: [] })

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const weeks = Math.max(1, Math.min(12, parseInt(searchParams.get('weeks') || '1', 10)))
    const onlyStatus = searchParams.get('status') // e.g. 'Published' for projections
    if (!start) return NextResponse.json({ error: 'start is required' }, { status: 400 })
    const end = addDays(start, weeks * 7)

    // rotas in the active location → their assignments in range
    const { data: rotas } = await supabaseAdmin.from('Rotas').select('rota_id, status').in('location_id', locationIds)
    const rotaIds = (rotas || []).filter((r) => !onlyStatus || r.status === onlyStatus).map((r) => r.rota_id)
    if (rotaIds.length === 0) return NextResponse.json({ start, end, weeks, staff: [] })

    const { data: assigns } = await supabaseAdmin
      .from('Rota Assignments').select('shift_id, staff_id, work_date, custom_start, custom_end')
      .in('rota_id', rotaIds).gte('work_date', start).lt('work_date', end)
    if (!assigns || assigns.length === 0) return NextResponse.json({ start, end, weeks, staff: [] })

    const shiftIds = [...new Set(assigns.map((a) => a.shift_id).filter(Boolean))]
    const staffIds = [...new Set(assigns.map((a) => a.staff_id))]
    const [{ data: shifts }, { data: staff }] = await Promise.all([
      supabaseAdmin.from('Shift Patterns').select('shift_id, start_time, end_time').in('shift_id', shiftIds),
      supabaseAdmin.from('Staff').select('staff_id, name, team_id, wage, pay_basis, annual_salary, annualised_hours, contracted_hours').in('staff_id', staffIds),
    ])
    const dur = Object.fromEntries((shifts || []).map((s) => [s.shift_id, Math.max(0, tzToDec(s.end_time) - tzToDec(s.start_time))]))

    // aggregate hours + shift count per staff
    const agg = {}
    for (const a of assigns) {
      if (!agg[a.staff_id]) agg[a.staff_id] = { hours: 0, shifts: 0 }
      const hrs = a.shift_id ? (dur[a.shift_id] || 0) : Math.max(0, tzToDec(a.custom_end) - tzToDec(a.custom_start))
      agg[a.staff_id].hours += hrs
      agg[a.staff_id].shifts += 1
    }

    const out = (staff || []).map((s) => ({
      staff_id: s.staff_id, name: s.name, team_id: s.team_id,
      pay_basis: s.pay_basis || 'hourly',
      hourly_rate: parseFloat(s.wage) || 0,
      annual_salary: parseFloat(s.annual_salary) || 0,
      annualised_hours: parseFloat(s.annualised_hours) || 0,
      contracted_hours: s.contracted_hours || 0,
      hours: Math.round((agg[s.staff_id]?.hours || 0) * 100) / 100,
      shifts: agg[s.staff_id]?.shifts || 0,
    })).sort((a, b) => b.hours - a.hours)

    return NextResponse.json({ start, end, weeks, staff: out })
  } catch (error) {
    console.error('Error building payroll:', error)
    return NextResponse.json({ error: 'Failed to build payroll', details: error.message }, { status: 500 })
  }
}
