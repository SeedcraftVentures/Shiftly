import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getStaffScope } from '@/lib/staffScope'
import { hhmm, durationHours } from '@/lib/shiftTime'

// Who could take a shift on a given date: teammates already working that day
// (a genuine swap) and teammates who are free (a straight handover).
//
// Always returns both keys, because the swap modal checks
// `working?.length === 0 && available?.length === 0` to decide its empty state.
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    const date = new URL(request.url).searchParams.get('date')
    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

    const { data: teammates } = await supabaseAdmin
      .from('Staff').select('staff_id, name, role').eq('team_id', scope.teamId).neq('staff_id', scope.staffId).order('name')
    if (!teammates?.length) return NextResponse.json({ working: [], available: [] })

    // Match on work_date across every published rota for the location, rather than
    // deriving a week_start. That stays correct whatever the week structure is.
    const { data: rotas } = await supabaseAdmin
      .from('Rotas').select('rota_id').eq('location_id', scope.locationId).eq('status', 'Published')

    let assignments = []
    if (rotas?.length) {
      const { data } = await supabaseAdmin
        .from('Rota Assignments')
        .select('shift_id, staff_id, work_date, custom_start, custom_end, custom_name')
        .in('rota_id', rotas.map((r) => r.rota_id))
        .eq('work_date', date)
      assignments = data || []
    }

    const shiftIds = [...new Set(assignments.map((a) => a.shift_id).filter(Boolean))]
    const { data: patterns } = shiftIds.length
      ? await supabaseAdmin.from('Shift Patterns').select('shift_id, shift_name, start_time, end_time').in('shift_id', shiftIds)
      : { data: [] }
    const patternById = Object.fromEntries((patterns || []).map((p) => [p.shift_id, p]))

    const assignmentByStaff = {}
    for (const a of assignments) if (!assignmentByStaff[a.staff_id]) assignmentByStaff[a.staff_id] = a

    const working = []
    const available = []
    for (const t of teammates) {
      const a = assignmentByStaff[t.staff_id]
      if (a) {
        const p = patternById[a.shift_id]
        const isCustom = !a.shift_id && a.custom_start
        const start = a.custom_start || p?.start_time
        const end = a.custom_end || p?.end_time
        working.push({
          staff_id: t.staff_id,
          staff_name: t.name,
          role: t.role || '',
          shift_name: isCustom ? (a.custom_name || 'Custom shift') : (p?.shift_name || 'Shift'),
          start_time: hhmm(start),
          end_time: hhmm(end),
          hours: durationHours(start, end),
        })
      } else {
        available.push({
          staff_id: t.staff_id,
          staff_name: t.name,
          role: t.role || '',
          shift_name: null,
          start_time: null,
          end_time: null,
          hours: 0,
        })
      }
    }

    return NextResponse.json({ working, available })
  } catch (error) {
    console.error('Error fetching swap options:', error)
    return NextResponse.json({ working: [], available: [] })
  }
}
