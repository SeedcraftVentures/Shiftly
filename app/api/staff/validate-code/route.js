import { NextResponse } from 'next/server'
import { resolveJoinCode, unclaimedStaffForOrg } from '@/lib/joinCode'

// PUBLIC (no auth): validate a join code BEFORE an account exists, so the staff app can
// gate account creation behind a real employer code. That keeps the app free of open
// account registration (App Store guideline 3.1.1): you can only make an account if a
// business invited you. Knowing a 6-character code is the gate, and the response only
// exposes first names the manager already shares with their team.
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    const org = await resolveJoinCode(body?.code)
    if (!org) return NextResponse.json({ ok: false, error: 'That code was not recognised. Check it with your manager.' }, { status: 404 })
    const unclaimed = await unclaimedStaffForOrg(org.organization_id)
    return NextResponse.json({ ok: true, business_name: org.organization_name, unclaimed })
  } catch (error) {
    console.error('Error validating join code:', error)
    return NextResponse.json({ ok: false, error: 'Could not check that code' }, { status: 500 })
  }
}
