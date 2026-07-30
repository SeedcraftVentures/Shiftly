import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getOrCreateJoinCode, regenerateJoinCode } from '@/lib/joinCode'

// Manager side of join-by-code. GET returns the business code (creating it on
// first use); POST rotates it. Only a manager (owner of an Organizations row) has
// a code, so a caller without one gets 404.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const org = await getOrCreateJoinCode(userId)
    if (!org) return NextResponse.json({ error: 'No business found. Complete onboarding first.' }, { status: 404 })
    return NextResponse.json({ join_code: org.join_code, business_name: org.organization_name })
  } catch (error) {
    console.error('Error getting join code:', error)
    return NextResponse.json({ error: 'Failed to get join code' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    if (!body?.regenerate) return NextResponse.json({ error: 'Nothing to do' }, { status: 400 })
    const org = await regenerateJoinCode(userId)
    if (!org) return NextResponse.json({ error: 'No business found.' }, { status: 404 })
    return NextResponse.json({ join_code: org.join_code, business_name: org.organization_name })
  } catch (error) {
    console.error('Error regenerating join code:', error)
    return NextResponse.json({ error: 'Failed to regenerate code' }, { status: 500 })
  }
}
