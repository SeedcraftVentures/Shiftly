import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getStaffScope } from '@/lib/staffScope'
import { hhmm, durationHours } from '@/lib/shiftTime'

// The employee's own shifts, from PUBLISHED rotas only. A draft rota is the
// manager still working, and staff must never see it.
//
// Every week is returned, not just upcoming ones: the employee page steps
// backwards through weeks, so filtering to >= today would blank out history.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    if (!scope.locationId) return NextResponse.json([])

    const { data: rotas } = await supabaseAdmin
      .from('Rotas').select('rota_id, name, week_start, status')
      .eq('location_id', scope.locationId).eq('status', 'Published')
    if (!rotas?.length) return NextResponse.json([])

    const { data: assignments } = await supabaseAdmin
      .from('Rota Assignments')
      .select('rota_id, shift_id, staff_id, work_date, custom_start, custom_end, custom_name')
      .in('rota_id', rotas.map((r) => r.rota_id))
      .eq('staff_id', scope.staffId)
    if (!assignments?.length) return NextResponse.json([])

    // Manual join for shift names: the schema carries no FKs.
    const shiftIds = [...new Set(assignments.map((a) => a.shift_id).filter(Boolean))]
    const { data: patterns } = shiftIds.length
      ? await supabaseAdmin.from('Shift Patterns')
        .select('shift_id, shift_name, start_time, end_time, break_duration, break_is_paid')
        .in('shift_id', shiftIds)
      : { data: [] }
    const patternById = Object.fromEntries((patterns || []).map((p) => [p.shift_id, p]))
    const rotaById = Object.fromEntries(rotas.map((r) => [r.rota_id, r]))

    const shifts = assignments.map((a) => {
      const p = patternById[a.shift_id]
      const isCustom = !a.shift_id && a.custom_start
      const start = a.custom_start || p?.start_time
      const end = a.custom_end || p?.end_time

      // Breaks became real on Shift Patterns, so a shift's span and what it PAYS are
      // no longer the same number. `hours` keeps meaning the span, because the
      // employee PWA already renders it and changing that quietly would misreport
      // everyone's week. paid_hours is added alongside for clients that want the
      // number that reaches the payslip. A custom shift has no pattern, so no break.
      const span = durationHours(start, end)
      const breakMinutes = Number(p?.break_duration) || 0
      const breakIsPaid = !!p?.break_is_paid
      const paid = breakIsPaid ? span : Math.max(0, span - breakMinutes / 60)

      return {
        date: a.work_date,
        // Needed so a swap request can reference the actual shift. Without it a
        // client has only rota_id to hand, and putting that in Requests.shift_id
        // (both uuids, so nothing complains) records a rota as if it were a shift.
        // Null for a custom shift, which has no pattern behind it.
        shift_id: a.shift_id || null,
        shift_name: isCustom ? (a.custom_name || 'Custom shift') : (p?.shift_name || 'Shift'),
        start_time: hhmm(start),
        end_time: hhmm(end),
        hours: span,
        paid_hours: Math.round(paid * 100) / 100,
        break_minutes: breakMinutes,
        break_is_paid: breakIsPaid,
        rota_id: a.rota_id,
        rota_name: rotaById[a.rota_id]?.name || null,
      }
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)))

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Error fetching employee shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}
