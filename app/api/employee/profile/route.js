import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { resolveStaff, toEmployeeProfile, verifiedEmails } from '@/lib/staffScope'

// The employee's own record. This is also the route that CLAIMS an outstanding
// invite: it is the first call the employee app makes, and by then Clerk has
// verified the signed-in user owns their email address, so a Staff row invited to
// that address is linked here. No token, no deep link, nothing to expire.
//
// Returns 404 (not an error) when there is no linked or claimable record, because
// the employee page turns 404 into its "Account Not Linked" screen.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await currentUser()
    const scope = await resolveStaff(userId, verifiedEmails(user))
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    return NextResponse.json(toEmployeeProfile(scope))
  } catch (error) {
    console.error('Error fetching employee profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
