import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'
import { notifyUser, notifyTeam, managerForTeam } from '@/lib/createNotification'

// Requests (time off / sick / swap / cover) for the manager's active location.
// Org-scoped: a manager only ever sees/touches requests whose team is in their
// getOrgScope teamIds. No FKs in the schema, so staff details are joined manually.
export const dynamic = 'force-dynamic'

async function attachStaff(requests) {
  const ids = new Set()
  requests.forEach((r) => {
    if (r.staff_id) ids.add(r.staff_id)
    if (r.swap_with_staff_id) ids.add(r.swap_with_staff_id)
  })
  if (ids.size === 0) return requests.map((r) => ({ ...r, staff: null, swap_staff: null }))

  const { data: staff } = await supabaseAdmin
    .from('Staff').select('staff_id, name, role, user_id').in('staff_id', Array.from(ids))
  const map = Object.fromEntries((staff || []).map((s) => [s.staff_id, s]))
  return requests.map((r) => ({ ...r, staff: map[r.staff_id] || null, swap_staff: map[r.swap_with_staff_id] || null }))
}

// GET — list requests across the manager's active-location teams
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.length) return NextResponse.json([])

    const { searchParams } = new URL(request.url)
    const team_id = searchParams.get('team_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = supabaseAdmin
      .from('Requests').select('*').in('team_id', teamIds).order('created_at', { ascending: false })
    if (team_id && teamIds.includes(team_id)) query = query.eq('team_id', team_id)
    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(await attachStaff(data || []))
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// POST — log a request (manager on behalf of staff, or staff via employee route)
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { team_id, staff_id, type, direction, start_date, end_date, shift_date, shift_id, swap_with_staff_id, reason } = body
    if (!team_id || !staff_id || !type) {
      return NextResponse.json({ error: 'team_id, staff_id, and type are required' }, { status: 400 })
    }
    const validTypes = ['holiday', 'sick', 'swap', 'cover', 'availability']
    if (!validTypes.includes(type)) return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    const requestDirection = direction || 'incoming'
    if (!['incoming', 'outgoing'].includes(requestDirection)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
    }

    // Ownership: the team must be in the caller's org scope.
    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.includes(team_id)) return NextResponse.json({ error: 'Team not in your organization' }, { status: 403 })

    const { data, error } = await supabaseAdmin.from('Requests').insert({
      user_id: userId,
      team_id,
      staff_id,
      type,
      direction: requestDirection,
      status: 'pending',
      start_date: start_date || null,
      end_date: end_date || null,
      shift_date: shift_date || null,
      shift_id: shift_id || null,
      swap_with_staff_id: swap_with_staff_id || null,
      reason: reason || null,
    }).select().single()
    if (error) throw error

    // Auto-notifications (best-effort; never fail the request on a notify error).
    try {
      const { data: staffMember } = await supabaseAdmin.from('Staff').select('name').eq('staff_id', staff_id).single()
      const staffName = staffMember?.name || 'A team member'

      if (type === 'holiday' || type === 'sick') {
        const managerUserId = await managerForTeam(team_id)
        if (managerUserId && managerUserId !== userId) {
          await notifyUser({
            recipient_user_id: managerUserId,
            team_id,
            type: 'cover_needed',
            title: `${staffName} requested ${type === 'holiday' ? 'time off' : 'sick leave'}`,
            message: start_date && end_date && start_date !== end_date
              ? `${start_date} to ${end_date}${reason ? `. ${reason}` : ''}`
              : `${start_date || 'Date TBC'}${reason ? `. ${reason}` : ''}`,
            related_id: data.id,
            related_type: 'request',
          })
        }
      } else if ((type === 'swap' || type === 'cover') && !swap_with_staff_id) {
        await notifyTeam({
          team_id,
          type: 'swap_available',
          title: `${staffName} posted a shift ${type === 'swap' ? 'swap' : 'for cover'}`,
          message: reason || `${start_date || 'Shift'} is available to pick up`,
          sender_user_id: userId,
          related_id: data.id,
          related_type: 'request',
        })
      } else if (type === 'swap' && swap_with_staff_id) {
        const { data: targetStaff } = await supabaseAdmin.from('Staff').select('user_id').eq('staff_id', swap_with_staff_id).single()
        if (targetStaff?.user_id) {
          await notifyUser({
            recipient_user_id: targetStaff.user_id,
            recipient_staff_id: swap_with_staff_id,
            team_id,
            type: 'swap_available',
            title: `${staffName} wants to swap shifts with you`,
            message: reason || `For ${start_date || 'an upcoming shift'}`,
            related_id: data.id,
            related_type: 'request',
          })
        }
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

// PUT — approve/reject a request, then notify the requesting employee
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    const { id, status, manager_notes } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.length) return NextResponse.json({ error: 'No teams in scope' }, { status: 403 })

    // Load first — confirms the request is in the caller's org and gives us fields to notify on.
    const { data: existing } = await supabaseAdmin.from('Requests').select('*').eq('id', id).single()
    if (!existing || !teamIds.includes(existing.team_id)) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const updateData = { status, updated_at: new Date().toISOString() }
    if (status === 'approved' || status === 'rejected') {
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = userId
    }
    if (manager_notes !== undefined) updateData.manager_notes = manager_notes

    const { data, error } = await supabaseAdmin
      .from('Requests').update(updateData).eq('id', id).in('team_id', teamIds).select().single()
    if (error) throw error

    try {
      if (existing.staff_id && (status === 'approved' || status === 'rejected')) {
        const { data: staffMember } = await supabaseAdmin.from('Staff').select('name, user_id').eq('staff_id', existing.staff_id).single()
        if (staffMember?.user_id) {
          const requestType = existing.type === 'holiday' ? 'time off'
            : existing.type === 'sick' ? 'sick leave'
            : existing.type === 'swap' ? 'swap request'
            : existing.type === 'cover' ? 'cover request'
            : 'request'
          await notifyUser({
            recipient_user_id: staffMember.user_id,
            recipient_staff_id: existing.staff_id,
            team_id: existing.team_id,
            type: status === 'approved' ? 'request_approved' : 'request_rejected',
            title: `Your ${requestType} was ${status}`,
            message: manager_notes || (status === 'approved' ? "You're all set." : 'Contact your manager for details.'),
            related_id: id,
            related_type: 'request',
          })
        }
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}

// DELETE — remove a request (scoped to the manager's org)
export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Request ID required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.length) return NextResponse.json({ error: 'No teams in scope' }, { status: 403 })

    const { error } = await supabaseAdmin.from('Requests').delete().eq('id', id).in('team_id', teamIds)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting request:', error)
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
  }
}
