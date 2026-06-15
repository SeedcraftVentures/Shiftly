import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

const hhmm = (t) => (t ? String(t).slice(0, 5) : '00:00')
const dayIndexOf = (dateStr) => ((new Date(dateStr + 'T00:00:00Z').getUTCDay() + 6) % 7) // 0=Mon

// GET - a saved rota with its assignments reconstructed (staff + shift names)
export async function GET(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { locationIds } = await getOrgScope(userId)

    const { data: rota } = await supabaseAdmin
      .from('Rotas')
      .select('*')
      .eq('rota_id', id)
      .in('location_id', locationIds)
      .maybeSingle()
    if (!rota) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: assigns } = await supabaseAdmin.from('Rota Assignments').select('*').eq('rota_id', id)
    const staffIds = [...new Set((assigns || []).map((a) => a.staff_id))]
    const shiftIds = [...new Set((assigns || []).map((a) => a.shift_id).filter(Boolean))]
    const placeholder = ['00000000-0000-0000-0000-000000000000']
    const [{ data: staff }, { data: shifts }, { data: teams }] = await Promise.all([
      supabaseAdmin.from('Staff').select('staff_id, name, team_id').in('staff_id', staffIds.length ? staffIds : placeholder),
      supabaseAdmin.from('Shift Patterns').select('shift_id, shift_name, start_time, end_time, shift_team').in('shift_id', shiftIds.length ? shiftIds : placeholder),
      supabaseAdmin.from('Teams').select('team_id, name').in('location_id', locationIds),
    ])
    const sName = Object.fromEntries((staff || []).map((s) => [s.staff_id, s.name]))
    const sTeam = Object.fromEntries((staff || []).map((s) => [s.staff_id, s.team_id]))
    const shMap = Object.fromEntries((shifts || []).map((s) => [s.shift_id, s]))
    const tName = Object.fromEntries((teams || []).map((t) => [t.team_id, t.name]))

    const assignments = (assigns || []).map((a) => {
      const sh = shMap[a.shift_id] || {}
      const custom = !a.shift_id && a.custom_start // a one-off custom shift
      const teamId = custom ? sTeam[a.staff_id] : (sh.shift_team || sTeam[a.staff_id])
      return {
        shift_id: a.shift_id, custom: !!custom, staff_id: a.staff_id, work_date: a.work_date, week: a.week,
        day: dayIndexOf(a.work_date), staff_name: sName[a.staff_id] || 'Unknown',
        shift_name: custom ? (a.custom_name || 'Custom shift') : (sh.shift_name || 'Shift'),
        start_time: custom ? hhmm(a.custom_start) : hhmm(sh.start_time),
        end_time: custom ? hhmm(a.custom_end) : hhmm(sh.end_time),
        team_id: teamId, team_name: tName[teamId] || '',
      }
    })

    return NextResponse.json({ id: rota.rota_id, name: rota.name, week_start: rota.week_start, status: rota.status, assignments })
  } catch (error) {
    console.error('Error fetching rota:', error)
    return NextResponse.json({ error: 'Failed to fetch rota' }, { status: 500 })
  }
}

// PATCH - publish/unpublish
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { locationIds } = await getOrgScope(userId)
    const { status } = await request.json()
    const st = status === 'Published' ? 'Published' : 'Draft'
    const { error } = await supabaseAdmin
      .from('Rotas')
      .update({ status: st, published_at: st === 'Published' ? new Date().toISOString() : null, published_by: st === 'Published' ? userId : null })
      .eq('rota_id', id)
      .in('location_id', locationIds)
    if (error) throw error
    return NextResponse.json({ id, status: st })
  } catch (error) {
    console.error('Error updating rota:', error)
    return NextResponse.json({ error: 'Failed to update rota' }, { status: 500 })
  }
}

// DELETE - remove a rota (assignments cascade)
export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { locationIds } = await getOrgScope(userId)
    const { error } = await supabaseAdmin.from('Rotas').delete().eq('rota_id', id).in('location_id', locationIds)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rota:', error)
    return NextResponse.json({ error: 'Failed to delete rota' }, { status: 500 })
  }
}
