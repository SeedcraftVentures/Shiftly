import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getStaffScope } from '@/lib/staffScope'
import { notifyUser, managerForTeam } from '@/lib/createNotification'

// Shifts teammates have put up for grabs, and picking one up.
// An "open" request is one nobody has claimed yet: swap_with_staff_id is null.
export const dynamic = 'force-dynamic'

const today = () => new Date().toISOString().slice(0, 10)

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    const { data: open, error } = await supabaseAdmin
      .from('Requests').select('*')
      .eq('team_id', scope.teamId)
      .eq('status', 'pending')
      .is('swap_with_staff_id', null)
      .in('type', ['swap', 'cover', 'sick'])
      .gte('start_date', today())
      .neq('staff_id', scope.staffId) // never offer someone their own shift back
      .order('start_date', { ascending: true })
    if (error) throw error
    if (!open?.length) return NextResponse.json([])

    // Manual join: the card shows who posted it.
    const staffIds = [...new Set(open.map((r) => r.staff_id).filter(Boolean))]
    const { data: staff } = staffIds.length
      ? await supabaseAdmin.from('Staff').select('staff_id, name, role').in('staff_id', staffIds)
      : { data: [] }
    const byId = Object.fromEntries((staff || []).map((s) => [s.staff_id, s]))

    return NextResponse.json(open.map((r) => ({
      ...r,
      staff: byId[r.staff_id] ? { staff_id: r.staff_id, name: byId[r.staff_id].name, role: byId[r.staff_id].role || '' } : null,
    })))
  } catch (error) {
    console.error('Error fetching open shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch open shifts' }, { status: 500 })
  }
}

// PUT — pick up an open shift.
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    const requestId = body?.request_id
    if (!requestId) return NextResponse.json({ error: 'request_id is required' }, { status: 400 })

    const { data: open } = await supabaseAdmin.from('Requests').select('*').eq('id', requestId).maybeSingle()
    if (!open || open.team_id !== scope.teamId) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (open.staff_id === scope.staffId) return NextResponse.json({ error: 'That is your own shift' }, { status: 400 })
    if (open.swap_with_staff_id) return NextResponse.json({ error: 'Someone already picked this up' }, { status: 409 })

    // Guard the claim in the WHERE clause too, so two people tapping at the same
    // moment cannot both win it.
    const { data: claimed, error } = await supabaseAdmin
      .from('Requests')
      .update({
        swap_with_staff_id: scope.staffId,
        status: 'approved',
        reason: `${open.reason || 'Shift'} [Accepted by ${scope.staff.name}]`,
        updated_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .is('swap_with_staff_id', null)
      .select().maybeSingle()
    if (error) throw error
    if (!claimed) return NextResponse.json({ error: 'Someone already picked this up' }, { status: 409 })

    // Tell the person who posted it, and the manager.
    try {
      const { data: poster } = await supabaseAdmin
        .from('Staff').select('user_id, name').eq('staff_id', open.staff_id).maybeSingle()
      if (poster?.user_id) {
        await notifyUser({
          recipient_user_id: poster.user_id,
          recipient_staff_id: open.staff_id,
          team_id: scope.teamId,
          type: 'swap_picked_up',
          title: `${scope.staff.name} picked up your shift`,
          message: `${open.start_date}. Your manager has been told.`,
          related_id: open.id,
          related_type: 'request',
        })
      }
      const managerUserId = await managerForTeam(scope.teamId)
      if (managerUserId) {
        await notifyUser({
          recipient_user_id: managerUserId,
          team_id: scope.teamId,
          type: 'cover_picked_up',
          title: `${scope.staff.name} covered a shift`,
          message: `${poster?.name || 'A team member'}'s ${open.type} on ${open.start_date} is covered.`,
          related_id: open.id,
          related_type: 'request',
        })
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json(claimed)
  } catch (error) {
    console.error('Error picking up shift:', error)
    return NextResponse.json({ error: 'Failed to pick up shift' }, { status: 500 })
  }
}
