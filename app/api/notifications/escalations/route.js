import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'
import { notifyUser } from '@/lib/createNotification'

// Surface open swap/cover/sick requests that have sat unclaimed for 24h+, and
// fire a one-off escalation notification to the manager for each new one.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.length) return NextResponse.json({ escalations: [] })

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: staleRequests, error: staleError } = await supabaseAdmin
      .from('Requests').select('*')
      .in('team_id', teamIds)
      .eq('status', 'pending')
      .is('swap_with_staff_id', null)
      .in('type', ['swap', 'cover', 'sick'])
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
    if (staleError) throw staleError
    if (!staleRequests?.length) return NextResponse.json({ escalations: [] })

    // Manual join for staff names (no FKs).
    const staffIds = Array.from(new Set(staleRequests.map((r) => r.staff_id).filter(Boolean)))
    const { data: staff } = staffIds.length
      ? await supabaseAdmin.from('Staff').select('staff_id, name').in('staff_id', staffIds)
      : { data: [] }
    const nameById = Object.fromEntries((staff || []).map((s) => [s.staff_id, s.name]))

    // Skip requests we've already alerted the manager about.
    const requestIds = staleRequests.map((r) => r.id)
    const { data: existingAlerts } = await supabaseAdmin
      .from('Notifications').select('related_id').eq('recipient_user_id', userId).eq('type', 'escalation').in('related_id', requestIds)
    const alreadyAlerted = new Set((existingAlerts || []).map((a) => a.related_id))

    for (const req of staleRequests.filter((r) => !alreadyAlerted.has(r.id))) {
      const staffName = nameById[req.staff_id] || 'A team member'
      const hoursAgo = Math.round((Date.now() - new Date(req.created_at).getTime()) / 3600000)
      await notifyUser({
        recipient_user_id: userId,
        team_id: req.team_id,
        type: 'escalation',
        title: `Unclaimed shift: ${staffName}`,
        message: `${req.type} request open for ${hoursAgo}h+ with no pickup. May need manual resolution.`,
        related_id: req.id,
        related_type: 'request',
      })
    }

    return NextResponse.json({
      escalations: staleRequests.map((r) => ({
        id: r.id,
        type: r.type,
        staff_name: nameById[r.staff_id] || null,
        created_at: r.created_at,
        start_date: r.start_date,
      })),
    })
  } catch (error) {
    console.error('Error checking escalations:', error)
    return NextResponse.json({ error: 'Failed to check escalations' }, { status: 500 })
  }
}
