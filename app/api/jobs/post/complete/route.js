// Step 2 of native posting: email a verification link.
//
// The listing is NOT published here. This sends a magic link to the address the
// draft was created with, and clicking it (in /api/jobs/verify) is what joins
// the waitlist and flips the listing live. That proves the poster controls the
// email before anything appears publicly, which is the spam control that
// replaced the old account gate.
//
// Enumeration: this always reports success for a real pending draft whose email
// matches, and 404/403 otherwise. It does not reveal whether an email is known.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { publishToken } from '@/lib/jobs/auth'
import { sendMagicLink, isDev } from '@/lib/jobs/email'
import { rateLimit, clientIp, tooMany } from '@/lib/jobs/ratelimit'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })

    const body = await request.json().catch(() => null)
    const listingId = String(body?.listing_id || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    // Optional: joining the Shiftly waitlist is a value-offer opt-in, not a
    // requirement to post. The choice rides in the publish token.
    const joinWaitlist = body?.join_waitlist === true
    if (!listingId) return NextResponse.json({ error: 'Missing listing.' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })

    // This endpoint sends an email, so it is a prime target for abuse (bombing a
    // victim, or burning our Resend quota). Limit per IP and per recipient.
    for (const [bucket, limit, windowSeconds] of [
      [`complete:ip:${clientIp(request)}`, 8, 600],
      [`complete:email:${email}`, 5, 3600],
    ]) {
      const rl = await rateLimit(bucket, { limit, windowSeconds })
      if (!rl.allowed) {
        const { retry, headers } = tooMany(rl.resetAt)
        return NextResponse.json({ error: `Too many attempts. Try again in ${retry}s.` }, { status: 429, headers })
      }
    }

    const { data: listing } = await supabaseAdmin
      .from('Job Listings')
      .select('listing_id,slug,status,employer_id')
      .eq('listing_id', listingId)
      .maybeSingle()
    if (!listing) return NextResponse.json({ error: 'That listing could not be found.' }, { status: 404 })

    // Already live: a refresh after verifying should not error.
    if (listing.status === 'live') {
      return NextResponse.json({ success: true, alreadyLive: true, slug: listing.slug })
    }
    if (listing.status !== 'pending') {
      return NextResponse.json({ error: 'That listing is no longer available to publish.' }, { status: 409 })
    }

    const { data: employer } = await supabaseAdmin
      .from('Job Employers')
      .select('employer_id,email')
      .eq('employer_id', listing.employer_id)
      .maybeSingle()
    if (!employer || (employer.email || '').toLowerCase() !== email) {
      return NextResponse.json({ error: 'That email does not match this listing.' }, { status: 403 })
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://shiftly.so'
    const href = `${base}/api/jobs/verify?token=${encodeURIComponent(publishToken(listingId, email, joinWaitlist))}`
    const { delivered, link } = await sendMagicLink({
      to: email,
      subject: 'Confirm your job on Shiftly Jobs',
      heading: 'One click to publish',
      body: 'Confirm this email to publish your listing on Shiftly Jobs. The link is valid for 30 minutes.',
      href,
      cta: 'Publish my job',
    })

    return NextResponse.json({
      success: true,
      sent: true,
      delivered,
      // Dev convenience only: with no mail key, hand the link back so the flow is
      // testable. Never in production, or anyone could publish without the email.
      ...(isDev() && !delivered ? { devLink: link } : {}),
    })
  } catch (e) {
    console.error('[jobs/post/complete]', e)
    return NextResponse.json({ error: 'Something went wrong. Try again.', detail: String(e).slice(0, 200) }, { status: 500 })
  }
}
