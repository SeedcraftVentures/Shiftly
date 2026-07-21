// Native job posting. Account gated, free, and the point of the whole board:
// a posting venue becomes a known, consented lead.
//
// SECURITY: middleware.js lets every /api/* route through without auth, so this
// route does its own auth() check. Do not remove it.

import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { completeness, FEATURED_DAYS, showsPay, toShiftArray, SHIFT_PATTERN_LABEL } from '@/lib/jobs/taxonomy'
import { buildSlug } from '@/lib/jobs/classify'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const str = (v, max = 5000) => String(v ?? '').trim().slice(0, max)

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Sign in to post a job.' }, { status: 401 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

    // Numbers stay numbers. Never String() a numeric field.
    const payMin = body.pay_min === '' || body.pay_min == null ? null : Number(body.pay_min)
    const payMax = body.pay_max === '' || body.pay_max == null ? null : Number(body.pay_max)
    if ((payMin != null && !Number.isFinite(payMin)) || (payMax != null && !Number.isFinite(payMax))) {
      return NextResponse.json({ error: 'Pay must be a number.' }, { status: 400 })
    }
    if (payMin != null && payMax != null && payMax < payMin) {
      return NextResponse.json({ error: 'Maximum pay cannot be lower than minimum pay.' }, { status: 400 })
    }

    const contactEmail = str(body.contact_email, 254).toLowerCase()
    if (!EMAIL_RE.test(contactEmail)) {
      return NextResponse.json({ error: 'Enter a valid contact email.' }, { status: 400 })
    }

    const data = {
      employer_name: str(body.employer_name, 200),
      city: str(body.city, 120),
      venue_type: str(body.venue_type, 40),
      title: str(body.title, 200),
      role_category: str(body.role_category, 40),
      contract_type: str(body.contract_type, 40),
      // text[] in Postgres. Kept as an array end to end, never joined.
      // Filtered to the known vocabulary so a crafted request cannot write
      // arbitrary values into a column the filters read.
      shift_pattern: toShiftArray(body.shift_pattern).filter((v) => SHIFT_PATTERN_LABEL[v]).slice(0, 10),
      description: str(body.description),
      benefits: str(body.benefits, 2000),
      website: str(body.website, 2048),
      apply_url: str(body.apply_url, 2048),
      apply_email: str(body.apply_email, 254),
      pay_min: payMin,
      pay_max: payMax,
      pay_period: str(body.pay_period, 20),
    }

    // Recomputed here, never trusted from the client. The client shows the same
    // result because both call the same function.
    const check = completeness(data)
    if (!check.valid) {
      return NextResponse.json(
        { error: 'Some required fields are missing.', missing: check.missing },
        { status: 400 }
      )
    }
    if (!body.accepted_terms) {
      return NextResponse.json({ error: 'You need to accept the terms to post.' }, { status: 400 })
    }

    // PECR: marketing consent is a separate, unticked opt-in. It is read as its
    // own boolean and must never be inferred from terms acceptance.
    const marketingConsent = body.marketing_consent === true

    // ── Employer ──────────────────────────────────────────────────────────────
    // Matched on the signed-in user first, then on email, so a returning poster
    // updates their row instead of creating a duplicate.
    // limit(1) rather than maybeSingle(): a user who posted under one email and
    // later used another would match two rows, and maybeSingle() throws on that.
    const { data: matches } = await supabaseAdmin
      .from('Job Employers')
      .select('employer_id')
      .or(`clerk_user_id.eq.${userId},email.eq.${contactEmail}`)
      .limit(1)
    const existing = matches?.[0] || null

    const employerPatch = {
      name: data.employer_name,
      email: contactEmail,
      clerk_user_id: userId,
      venue_type: data.venue_type,
      town: data.city,
      website: data.website || null,
      origin: 'native',
      is_agency: false,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Consent is only ever written when freshly given. An existing consent
      // timestamp is never overwritten by a later post that did not tick the box.
      ...(marketingConsent ? { marketing_consent: true, consent_at: new Date().toISOString() } : {}),
    }

    let employerId
    if (existing) {
      employerId = existing.employer_id
      await supabaseAdmin.from('Job Employers').update(employerPatch).eq('employer_id', employerId)
    } else {
      const { data: created, error: empErr } = await supabaseAdmin
        .from('Job Employers')
        .insert({ ...employerPatch, marketing_consent: marketingConsent, consent_at: marketingConsent ? new Date().toISOString() : null })
        .select('employer_id')
        .single()
      if (empErr) return NextResponse.json({ error: 'Could not save your venue.', detail: empErr.message }, { status: 500 })
      employerId = created.employer_id
    }

    // ── Listing ───────────────────────────────────────────────────────────────
    const sourceId = `native-${employerId}-${Date.now()}`
    const listing = {
      source: 'native',
      source_id: sourceId,
      source_url: null,
      attribution: null,
      title: data.title,
      role_category: data.role_category,
      employer_name: data.employer_name,
      employer_id: employerId,
      venue_type: data.venue_type,
      city: data.city,
      contract_type: data.contract_type,
      shift_pattern: data.shift_pattern,
      description: data.benefits ? `${data.description}\n\n${data.benefits}` : data.description,
      // The detail page's apply button reads apply_url, falling back to
      // source_url, and a native post has no source_url. An email-only
      // application would otherwise render a button that goes nowhere.
      apply_url: data.apply_url || (data.apply_email ? `mailto:${data.apply_email}` : null),
      is_native: true,
      pay_min: payMin,
      pay_max: payMax,
      pay_period: data.pay_period,
      pay_is_estimated: false,
      slug: buildSlug({ title: data.title, employerName: data.employer_name, city: data.city, sourceId }),
      posted_at: new Date().toISOString(),
      status: 'live',
      // Featured is EARNED, never sold. Expires on its own, no sweep job needed.
      featured_until: check.featured
        ? new Date(Date.now() + FEATURED_DAYS * 864e5).toISOString()
        : null,
    }
    listing.shows_pay = showsPay(listing)

    const { data: saved, error: lisErr } = await supabaseAdmin
      .from('Job Listings')
      .insert(listing)
      .select('listing_id,slug')
      .single()
    if (lisErr) return NextResponse.json({ error: 'Could not save your listing.', detail: lisErr.message }, { status: 500 })

    // ── Waitlist ──────────────────────────────────────────────────────────────
    // Every direct poster joins the Shiftly waitlist. Non-fatal: the job is
    // already live, and losing the post over a waitlist hiccup would be absurd.
    let waitlisted = false
    try {
      const client = await clerkClient()
      await client.waitlistEntries.create({ emailAddress: contactEmail })
      waitlisted = true
    } catch (e) {
      const already = JSON.stringify(e?.errors || e?.message || '').toLowerCase().includes('already')
      waitlisted = already
      if (!already) console.error('[jobs/post] waitlist failed', e)
    }

    return NextResponse.json({
      success: true,
      slug: saved.slug,
      listing_id: saved.listing_id,
      featured: check.featured,
      featured_days: check.featured ? FEATURED_DAYS : 0,
      waitlisted,
    })
  } catch (e) {
    console.error('[jobs/post]', e)
    return NextResponse.json({ error: 'Something went wrong. Try again.', detail: String(e).slice(0, 200) }, { status: 500 })
  }
}
