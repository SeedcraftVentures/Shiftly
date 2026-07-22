// The magic link target. One GET handles both purposes, because both are the
// same act: proving control of an email.
//
//   publish : join the waitlist, flip the pending listing live, then sign the
//             poster in so they land straight in their dashboard.
//   session : just sign in, for someone logging in to manage existing listings.
//
// On success it sets the httpOnly session cookie and redirects. It never renders
// the token or returns it in a body.

import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { verifyToken, sessionToken, SESSION_COOKIE, SESSION_TTL } from '@/lib/jobs/auth'

export const dynamic = 'force-dynamic'

const base = () => process.env.NEXT_PUBLIC_APP_URL || 'https://shiftly.so'
const bounce = (path) => NextResponse.redirect(new URL(path, base()))

function setSession(res, employerId) {
  res.cookies.set(SESSION_COOKIE, sessionToken(employerId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL,
  })
  return res
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) return bounce('/jobs?error=config')

    const token = new URL(request.url).searchParams.get('token')
    const payload = verifyToken(token)
    if (!payload) return bounce('/jobs/manage?error=expired')

    // ── Session login ──────────────────────────────────────────────────────
    if (payload.p === 'session') {
      return setSession(bounce('/jobs/manage'), payload.id)
    }

    // ── Publish ──────────────────────────────────────────────────────────────
    if (payload.p !== 'publish') return bounce('/jobs/manage?error=invalid')

    const { data: listing } = await supabaseAdmin
      .from('Job Listings')
      .select('listing_id,slug,status,employer_id')
      .eq('listing_id', payload.l)
      .maybeSingle()
    if (!listing) return bounce('/jobs/manage?error=missing')

    // Already live (link clicked twice). Sign in and send them to the listing.
    if (listing.status === 'live') {
      return setSession(bounce(`/jobs/${listing.slug}?published=1`), listing.employer_id)
    }
    if (listing.status !== 'pending') return bounce('/jobs/manage?error=unavailable')

    // The email in the token must still match the employer on the listing.
    const { data: employer } = await supabaseAdmin
      .from('Job Employers')
      .select('employer_id,email')
      .eq('employer_id', listing.employer_id)
      .maybeSingle()
    if (!employer || (employer.email || '').toLowerCase() !== payload.e) {
      return bounce('/jobs/manage?error=mismatch')
    }

    // Join the waitlist only if the poster opted in (token carries the choice).
    // Actively clicking "join" is clear affirmative consent under PECR, so the
    // consent timestamp is written alongside. A waitlist failure should not
    // strand a verified poster, so it is logged and the publish proceeds.
    const wantsWaitlist = payload.w === 1
    let joinedWaitlist = false
    if (wantsWaitlist) {
      try {
        const client = await clerkClient()
        await client.waitlistEntries.create({ emailAddress: employer.email })
        joinedWaitlist = true
      } catch (e) {
        const already = JSON.stringify(e?.errors || e?.message || '').toLowerCase().includes('already')
        joinedWaitlist = already
        if (!already) console.error('[jobs/verify] waitlist failed', e)
      }
    }

    // posted_at reset to publish time: the board orders on it and the draft may
    // have sat unfinished.
    await supabaseAdmin
      .from('Job Listings')
      .update({ status: 'live', posted_at: new Date().toISOString() })
      .eq('listing_id', listing.listing_id)
      .eq('status', 'pending')

    await supabaseAdmin
      .from('Job Employers')
      .update({
        email_verified_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Only stamp consent when they actually joined. Never overwrite an
        // existing consent with a later post that declined the offer.
        ...(joinedWaitlist ? { marketing_consent: true, consent_at: new Date().toISOString() } : {}),
      })
      .eq('employer_id', employer.employer_id)

    return setSession(bounce(`/jobs/${listing.slug}?published=1`), employer.employer_id)
  } catch (e) {
    console.error('[jobs/verify]', e)
    return bounce('/jobs/manage?error=server')
  }
}
