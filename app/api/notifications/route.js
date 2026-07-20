import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

// Notifications feed for the current user (manager or staff). Scoped by the
// caller's Clerk id: recipient_user_id for the inbox feed, sender_user_id for
// the "sent" (announcement history) view.
export const dynamic = 'force-dynamic'

// GET — list notifications + unread count
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30', 10)
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type')
    const sent = searchParams.get('sent') === 'true'
    const team_id = searchParams.get('team_id')

    let query = supabaseAdmin
      .from('Notifications').select('*').order('created_at', { ascending: false }).limit(limit)
    query = sent ? query.eq('sender_user_id', userId) : query.eq('recipient_user_id', userId)
    if (type) query = query.eq('type', type)
    if (team_id) query = query.eq('team_id', team_id)
    if (unreadOnly) query = query.eq('read', false)

    const { data, error } = await query
    if (error) throw error

    const { count, error: countError } = await supabaseAdmin
      .from('Notifications').select('*', { count: 'exact', head: true }).eq('recipient_user_id', userId).eq('read', false)
    if (countError) throw countError

    return NextResponse.json({ notifications: data || [], unreadCount: count || 0 })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// PUT — mark notifications read (all, or a specific set), scoped to the recipient
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      const { error } = await supabaseAdmin
        .from('Notifications').update({ read: true }).eq('recipient_user_id', userId).eq('read', false)
      if (error) throw error
    } else if (notificationIds?.length > 0) {
      const { error } = await supabaseAdmin
        .from('Notifications').update({ read: true }).eq('recipient_user_id', userId).in('id', notificationIds)
      if (error) throw error
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
