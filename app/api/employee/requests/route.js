import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getStaffScope } from '@/lib/staffScope'
import { notifyUser, notifyTeam, managerForTeam } from '@/lib/createNotification'

// Staff-initiated requests: time off, sick, and offering a shift for swap/cover.
// The manager sees these in the Inbox, where approving time off now also shows
// what it costs in coverage.
export const dynamic = 'force-dynamic'

// days_off is a scheduling preference, not leave: "can my days off be Wed and Thu
// that week". It is stored one row per day so a non-contiguous ask (Mon and Thu)
// works and the manager can approve one day and decline the other. Like holiday and
// sick, an APPROVED one blocks that date in generate-rota, which is the only thing
// that makes the answer mean anything.
const VALID_TYPES = ['holiday', 'sick', 'days_off', 'swap', 'cover']

// The types that are a person being unavailable on a date, as opposed to a shift
// changing hands. These notify the manager and are read by the solver.
const TIME_OFF_TYPES = ['holiday', 'sick', 'days_off']

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('Requests').select('*').eq('staff_id', scope.staffId).order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching employee requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { type, start_date, end_date, reason, shift_id, swap_with_staff_id } = body
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    }
    if (!start_date) return NextResponse.json({ error: 'start_date is required' }, { status: 400 })

    // Requests.user_id records the manager who owns the request queue. Under the
    // new schema that is the organization owner, reached through the team's location.
    const managerUserId = await managerForTeam(scope.teamId)

    const { data, error } = await supabaseAdmin.from('Requests').insert({
      user_id: managerUserId || userId,
      team_id: scope.teamId,
      staff_id: scope.staffId,
      type,
      direction: 'incoming',
      status: 'pending',
      start_date,
      end_date: end_date || start_date,
      shift_date: type === 'swap' || type === 'cover' ? start_date : null,
      shift_id: shift_id || null,
      swap_with_staff_id: swap_with_staff_id || null,
      reason: reason || null,
    }).select().single()
    if (error) throw error

    // Best-effort notifications; never fail the request because a notify failed.
    try {
      const staffName = scope.staff.name || 'A team member'
      const TITLE = { holiday: 'time off', sick: 'sick leave', days_off: 'a day off' }
      if (TIME_OFF_TYPES.includes(type)) {
        if (managerUserId) {
          await notifyUser({
            recipient_user_id: managerUserId,
            team_id: scope.teamId,
            type: 'cover_needed',
            title: `${staffName} requested ${TITLE[type]}`,
            message: end_date && end_date !== start_date
              ? `${start_date} to ${end_date}${reason ? `. ${reason}` : ''}`
              : `${start_date}${reason ? `. ${reason}` : ''}`,
            related_id: data.id,
            related_type: 'request',
          })
        }
      } else if (!swap_with_staff_id) {
        // An open swap or cover: anyone on the team can pick it up.
        await notifyTeam({
          team_id: scope.teamId,
          type: 'swap_available',
          title: `${staffName} posted a shift ${type === 'swap' ? 'swap' : 'for cover'}`,
          message: reason || `${start_date} is available to pick up`,
          sender_user_id: userId,
          related_id: data.id,
          related_type: 'request',
        })
      } else {
        // Aimed at one teammate.
        const { data: target } = await supabaseAdmin
          .from('Staff').select('user_id').eq('staff_id', swap_with_staff_id).maybeSingle()
        if (target?.user_id) {
          await notifyUser({
            recipient_user_id: target.user_id,
            recipient_staff_id: swap_with_staff_id,
            team_id: scope.teamId,
            type: 'swap_available',
            title: `${staffName} wants to swap shifts with you`,
            message: reason || `For ${start_date}`,
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
    console.error('Error creating employee request:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}
