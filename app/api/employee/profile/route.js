import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStaffScope, toEmployeeProfile } from '@/lib/staffScope'

// The employee's own record. Linking an account to a Staff row happens explicitly
// via /api/staff/claim (the join-by-code flow), so this route just reads.
//
// Returns 404 (not an error) when the caller is not linked to a Staff row, because
// the employee app turns 404 into its "enter your join code" screen.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    return NextResponse.json(toEmployeeProfile(scope))
  } catch (error) {
    console.error('Error fetching employee profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
