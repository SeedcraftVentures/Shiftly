import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getEntitlement } from '@/lib/entitlement'

// The single client-facing read of the manager's plan entitlement. All logic
// (no-card trial seeding, expiry from trial_end, AI tier) lives in
// lib/entitlement so API routes and the client agree. Returns the flags plus
// the raw subscription fields for callers that want them.
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const entitlement = await getEntitlement(userId)
    return NextResponse.json(entitlement)
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
