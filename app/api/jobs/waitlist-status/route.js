// Drives the dynamic waitlist offer on the posting flow. The first FOUNDER_CAP
// employers to join lock in lifetime pricing, after which the offer falls back
// to plain early access. The count is real (Clerk waitlist total), so the
// scarcity is genuine and self-manages: no manual switch to flip at 200.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const FOUNDER_CAP = 200

export async function GET() {
  // Fail soft to the generic offer. A Clerk hiccup should never block posting or
  // promise a lifetime deal we cannot stand behind.
  // Uses the REST endpoint directly: its total_count field is verified, whereas
  // the SDK list wrapper's shape is not, and this only needs the one number.
  let count = null
  try {
    const key = process.env.CLERK_SECRET_KEY
    if (key) {
      const r = await fetch('https://api.clerk.com/v1/waitlist_entries?limit=1', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (r.ok) {
        const d = await r.json()
        count = typeof d.total_count === 'number' ? d.total_count : null
      }
    }
  } catch (e) {
    console.error('[jobs/waitlist-status] count failed', e)
  }

  if (count === null) {
    return NextResponse.json({ tier: 'generic', spotsLeft: null })
  }

  const spotsLeft = Math.max(0, FOUNDER_CAP - count)
  return NextResponse.json({
    tier: spotsLeft > 0 ? 'lifetime' : 'generic',
    spotsLeft,
    cap: FOUNDER_CAP,
  })
}
