import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { resolveJoinCode, unclaimedStaffForOrg } from '@/lib/joinCode'
import { getStaffScope } from '@/lib/staffScope'

// Staff side, step 1: validate a business code and return the people not yet
// claimed, so the joiner can pick "which one are you?". Called by the Team app
// after the user signs in and enters the code.
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // If they're already linked, there's nothing to join.
    const existing = await getStaffScope(userId)
    if (existing) return NextResponse.json({ already_linked: true, staff_id: existing.staffId })

    const body = await request.json().catch(() => null)
    const org = await resolveJoinCode(body?.code)
    if (!org) return NextResponse.json({ error: 'That code was not recognised. Check it with your manager.' }, { status: 404 })

    const unclaimed = await unclaimedStaffForOrg(org.organization_id)
    return NextResponse.json({ business_name: org.organization_name, unclaimed })
  } catch (error) {
    console.error('Error joining by code:', error)
    return NextResponse.json({ error: 'Failed to look up that code' }, { status: 500 })
  }
}
