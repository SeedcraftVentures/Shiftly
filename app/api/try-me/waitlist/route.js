import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

// Public, no-auth waitlist capture for the /try-me lead-magnet gate.
// Adds the email to the same Clerk waitlist the marketing /waitlist page feeds.

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    const email = (body?.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })

    const client = await clerkClient()
    try {
      await client.waitlistEntries.create({ emailAddress: email })
    } catch (e) {
      // Clerk throws if the email is already on the waitlist, treat that as success (idempotent).
      const already = JSON.stringify(e?.errors || e?.message || '').toLowerCase().includes('already')
      if (!already) throw e
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Couldn’t add you to the waitlist — try again.', detail: String(e).slice(0, 200) }, { status: 500 })
  }
}
