import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { notifyUser, notifyTeam } from '@/app/lib/createNotification'
import { DB_TABLES } from '@/app/lib/constants'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Fetch requests for user's teams
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const team_id = searchParams.get('team_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = supabase
      .from(DB_TABLES.requests)
      .select(`
        *,
        staff:staff_id (id, name, role),
        swap_staff:swap_with_staff_id (id, name, role)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (team_id) {
      query = query.eq('team_id', team_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// POST - Create a new request
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      team_id, 
      staff_id, 
      type,
      direction,
      start_date, 
      end_date, 
      shift_date,
      shift_id,
      swap_with_staff_id,
      reason 
    } = body

    if (!team_id || !staff_id || !type) {
      return NextResponse.json(
        { error: 'team_id, staff_id, and type are required' }, 
        { status: 400 }
      )
    }

    const validTypes = ['holiday', 'sick', 'swap', 'cover', 'availability']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type' }, 
        { status: 400 }
      )
    }

    const validDirections = ['incoming', 'outgoing']
    const requestDirection = direction || 'incoming'
    if (!validDirections.includes(requestDirection)) {
      return NextResponse.json(
        { error: 'Invalid direction' }, 
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from(DB_TABLES.requests)
      .insert({
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
        reason: reason || null
      })
      .select()
      .single()

    if (error) throw error

    // ── Auto-notifications ──
    try {
      // Get the staff member's name
      const { data: staffMember } = await supabase
        .from(DB_TABLES.staff)
        .select('name')
        .eq('id', staff_id)
        .single()

      const staffName = staffMember?.name || 'A team member'

      // Get the team's manager (owner)
      const { data: team } = await supabase
        .from(DB_TABLES.teams)
        .select('user_id')
        .eq('id', team_id)
        .single()

      const managerUserId = team?.user_id

      if (type === 'holiday' || type === 'sick') {
        // Notify manager about time-off request
        if (managerUserId && managerUserId !== userId) {
          await notifyUser({
            recipient_user_id: managerUserId,
            team_id,
            type: 'cover_needed',
            title: `${staffName} requested ${type === 'holiday' ? 'time off' : 'sick leave'}`,
            message: start_date && end_date && start_date !== end_date
              ? `${start_date} to ${end_date}${reason ? ` — ${reason}` : ''}`
              : `${start_date || 'Date TBC'}${reason ? ` — ${reason}` : ''}`,
            related_id: data.id,
            related_type: 'request',
          })
        }
      } else if ((type === 'swap' || type === 'cover') && !swap_with_staff_id) {
        // Open swap/cover — notify the whole team
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
        // Direct swap request — notify the target person
        const { data: targetStaff } = await supabase
          .from(DB_TABLES.staff)
          .select('clerk_user_id')
          .eq('id', swap_with_staff_id)
          .single()

        if (targetStaff?.clerk_user_id) {
          await notifyUser({
            recipient_user_id: targetStaff.clerk_user_id,
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
      // Don't fail the request if notification fails
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

// PUT - Update request status (approve/reject)
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, manager_notes } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' }, 
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'approved', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' }, 
        { status: 400 }
      )
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'approved' || status === 'rejected') {
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = userId
    }

    if (manager_notes !== undefined) {
      updateData.manager_notes = manager_notes
    }

    // Fetch the request before updating so we can notify
    const { data: existingRequest } = await supabase
      .from(DB_TABLES.requests)
      .select('*, staff:staff_id (id, name, clerk_user_id)')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from(DB_TABLES.requests)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    // ── Notify employee of approval/rejection ──
    try {
      if (existingRequest?.staff?.clerk_user_id && (status === 'approved' || status === 'rejected')) {
        const staffName = existingRequest.staff.name || 'Your'
        const requestType = existingRequest.type === 'holiday' ? 'time off' 
          : existingRequest.type === 'sick' ? 'sick leave'
          : existingRequest.type === 'swap' ? 'swap request'
          : existingRequest.type === 'cover' ? 'cover request'
          : 'request'

        await notifyUser({
          recipient_user_id: existingRequest.staff.clerk_user_id,
          recipient_staff_id: existingRequest.staff.id,
          team_id: existingRequest.team_id,
          type: status === 'approved' ? 'request_approved' : 'request_rejected',
          title: `Your ${requestType} was ${status}`,
          message: manager_notes || (status === 'approved' ? 'You\'re all set!' : 'Contact your manager for details.'),
          related_id: id,
          related_type: 'request',
        })
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

// DELETE - Delete a request
export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from(DB_TABLES.requests)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting request:', error)
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
  }
}