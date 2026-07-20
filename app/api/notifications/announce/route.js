import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getOrgScope } from '@/lib/db'
import { notifyTeam } from '@/lib/createNotification'

// Post an announcement to one team or every team in the active location. Fans
// out to one notification row per connected staff member (type 'announcement').
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    const { team_id, all_teams, message } = body
    if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
    if (!team_id && !all_teams) return NextResponse.json({ error: 'team_id or all_teams required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    let totalSent = 0

    if (all_teams) {
      for (const tid of teamIds) {
        const { data } = await notifyTeam({
          team_id: tid, type: 'announcement', title: 'Team announcement', message: message.trim(), sender_user_id: userId,
        })
        totalSent += data?.length || 0
      }
    } else {
      if (!teamIds.includes(team_id)) return NextResponse.json({ error: 'Team not in your organization' }, { status: 403 })
      const { data, error } = await notifyTeam({
        team_id, type: 'announcement', title: 'Team announcement', message: message.trim(), sender_user_id: userId,
      })
      if (error) throw error
      totalSent = data?.length || 0
    }

    return NextResponse.json({ success: true, sent: totalSent })
  } catch (error) {
    console.error('Error sending announcement:', error)
    return NextResponse.json({ error: 'Failed to send announcement' }, { status: 500 })
  }
}
