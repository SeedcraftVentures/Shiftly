// Step 2 of native job posting: join the waitlist, publish the listing.
//
// This is where the loop closes. The employer has already written the ad, so
// they are at their most invested, and the thing that publishes it is the thing
// that makes them a lead. No account is created: app sign-up is closed behind a
// waitlist, and requiring it would block the board's own funnel.
//
// Authorisation is the listing_id itself, which is a v4 uuid and therefore not
// guessable, paired with the email the draft was created with. Both must match,
// so knowing one listing id does not let anyone publish another employer's draft.

import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })

    const body = await request.json().catch(() => null)
    const listingId = String(body?.listing_id || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!listingId) return NextResponse.json({ error: 'Missing listing.' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })

    const { data: listing } = await supabaseAdmin
      .from('Job Listings')
      .select('listing_id,slug,status,employer_id,featured_until')
      .eq('listing_id', listingId)
      .maybeSingle()

    if (!listing) return NextResponse.json({ error: 'That listing could not be found.' }, { status: 404 })

    // Already published. Idempotent: a double submit or a refresh should land on
    // the success screen, not on an error.
    if (listing.status === 'live') {
      return NextResponse.json({ success: true, slug: listing.slug, alreadyLive: true })
    }
    if (listing.status !== 'pending') {
      return NextResponse.json({ error: 'That listing is no longer available to publish.' }, { status: 409 })
    }

    // The email must match the draft's employer. Without this, a leaked listing
    // id would let anyone publish someone else's draft under their own address.
    const { data: employer } = await supabaseAdmin
      .from('Job Employers')
      .select('employer_id,email,marketing_consent')
      .eq('employer_id', listing.employer_id)
      .maybeSingle()

    if (!employer || (employer.email || '').toLowerCase() !== email) {
      return NextResponse.json({ error: 'That email does not match this listing.' }, { status: 403 })
    }

    // ── Waitlist ──────────────────────────────────────────────────────────────
    // This is the step the employer is actually completing, so unlike step 1 a
    // hard failure here is worth surfacing rather than swallowing.
    let waitlisted = false
    try {
      const client = await clerkClient()
      await client.waitlistEntries.create({ emailAddress: email })
      waitlisted = true
    } catch (e) {
      const already = JSON.stringify(e?.errors || e?.message || '').toLowerCase().includes('already')
      if (already) {
        waitlisted = true
      } else {
        console.error('[jobs/post/complete] waitlist failed', e)
        return NextResponse.json(
          { error: 'Could not add you to the waitlist. Your job is saved, try again.' },
          { status: 502 }
        )
      }
    }

    // ── Publish ───────────────────────────────────────────────────────────────
    // posted_at is reset to now: the draft may have sat unfinished for a while,
    // and the board orders on it, so publishing time is the honest value.
    const { error: pubErr } = await supabaseAdmin
      .from('Job Listings')
      .update({ status: 'live', posted_at: new Date().toISOString() })
      .eq('listing_id', listingId)
      .eq('status', 'pending')

    if (pubErr) {
      return NextResponse.json({ error: 'Could not publish your listing.', detail: pubErr.message }, { status: 500 })
    }

    await supabaseAdmin
      .from('Job Employers')
      .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('employer_id', employer.employer_id)

    return NextResponse.json({
      success: true,
      slug: listing.slug,
      waitlisted,
      featured: Boolean(listing.featured_until),
    })
  } catch (e) {
    console.error('[jobs/post/complete]', e)
    return NextResponse.json({ error: 'Something went wrong. Try again.', detail: String(e).slice(0, 200) }, { status: 500 })
  }
}
