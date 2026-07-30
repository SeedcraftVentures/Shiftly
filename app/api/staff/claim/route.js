import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { claimStaff } from '@/lib/joinCode'
import { getStaffScope, toEmployeeProfile } from '@/lib/staffScope'

// Staff side, step 2: link this Clerk account to the chosen Staff row. Returns the
// employee profile so the app can go straight to the home screen.
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // One account links to one person; if they're already linked, just return it.
    const existing = await getStaffScope(userId)
    if (existing) return NextResponse.json(toEmployeeProfile(existing))

    const body = await request.json().catch(() => null)
    if (!body?.code || !body?.staff_id) {
      return NextResponse.json({ error: 'code and staff_id are required' }, { status: 400 })
    }

    const result = await claimStaff(userId, body.code, body.staff_id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 400 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Linked, but could not load your profile' }, { status: 500 })
    return NextResponse.json(toEmployeeProfile(scope))
  } catch (error) {
    console.error('Error claiming staff row:', error)
    return NextResponse.json({ error: 'Failed to link your account' }, { status: 500 })
  }
}
