// Step 1 of native job posting: draft the listing.
//
// Free and open, no account needed. The listing is created as 'pending' and is
// NOT on the board yet. It publishes in step 2 (./complete) when the employer
// joins the waitlist, which is what captures the lead.
//
// Ordering matters here: app sign-up is closed behind a waitlist, so gating this
// on an account would have made the board impossible to launch, and it asked
// people to commit before they had done anything. Now they write the ad first
// and identify themselves at the point they are most invested.
//
// SPAM: nothing publishes without completing step 2, so a drive-by POST here
// only ever creates an invisible pending row.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { completeness, FEATURED_DAYS, showsPay, toShiftArray, SHIFT_PATTERN_LABEL } from '@/lib/jobs/taxonomy'
import { buildSlug, classifyRole, classifyRetailRole } from '@/lib/jobs/classify'
import { rateLimit, clientIp, tooMany } from '@/lib/jobs/ratelimit'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const str = (v, max = 5000) => String(v ?? '').trim().slice(0, max)

// How many unconfirmed drafts one employer may hold at once. The sweep clears
// abandoned ones after JOBS_PENDING_TTL_HOURS, so this is a burst cap, not a
// lifetime one.
const MAX_PENDING_PER_EMPLOYER = 10

export async function POST(request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })

    // Per-IP cap on draft creation. The per-employer pending cap below stops one
    // email flooding drafts; this stops one IP flooding drafts across many emails.
    const rl = await rateLimit(`post:ip:${clientIp(request)}`, { limit: 20, windowSeconds: 600 })
    if (!rl.allowed) {
      const { retry, headers } = tooMany(rl.resetAt)
      return NextResponse.json({ error: `Too many attempts. Try again in ${retry}s.` }, { status: 429, headers })
    }

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

    // The poster picks the industry, so it is trusted rather than classified.
    // Anything unexpected falls back to hospitality (the default board).
    const industry = body.industry === 'retail' ? 'retail' : 'hospitality'

    const data = {
      industry, // completeness() reads this: venue type is hospitality-only
      employer_name: str(body.employer_name, 200),
      city: str(body.city, 120),
      // No venue type on a retail post; it is a hospitality axis.
      venue_type: industry === 'retail' ? '' : str(body.venue_type, 40),
      title: str(body.title, 200),
      contract_type: str(body.contract_type, 40),
      locality: str(body.locality, 120),
      postcode: str(body.postcode, 12),
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
    // Matched on email, so a returning poster updates their row instead of
    // creating a duplicate. There is no signed-in user to match on any more.
    // limit(1) rather than maybeSingle(), which throws if two rows come back.
    const { data: matches } = await supabaseAdmin
      .from('Job Employers')
      .select('employer_id')
      .eq('email', contactEmail)
      .limit(1)
    const existing = matches?.[0] || null

    const employerPatch = {
      name: data.employer_name,
      email: contactEmail,
      industry, // segments outreach by sector and pre-fills a return post
      venue_type: data.venue_type || null,
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

    // Draft-spam cap. Publishing needs an email click, so drafts alone cannot
    // reach the board, but nothing stopped one email drafting endlessly and
    // bloating the table. Cap the UNPUBLISHED drafts per employer. Serverless
    // friendly (a DB count, no shared memory) and it targets the actual abuse
    // vector. A verified poster who publishes frees the count immediately.
    const { count: pendingCount } = await supabaseAdmin
      .from('Job Listings')
      .select('listing_id', { count: 'exact', head: true })
      .eq('employer_id', employerId)
      .eq('status', 'pending')
    if ((pendingCount || 0) >= MAX_PENDING_PER_EMPLOYER) {
      return NextResponse.json(
        { error: 'You have several unpublished drafts. Confirm one by email before starting more.' },
        { status: 429 }
      )
    }

    // ── Listing ───────────────────────────────────────────────────────────────
    const sourceId = `native-${employerId}-${Date.now()}`
    const listing = {
      source: 'native',
      source_id: sourceId,
      source_url: null,
      attribution: null,
      title: data.title,
      // Role is derived from the free text title, using the taxonomy for the
      // chosen industry so a retail post gets a retail role, not 'other'.
      role_category: (industry === 'retail' ? classifyRetailRole(data.title) : classifyRole(data.title)) || 'other',
      // The poster chose the industry, so it is stored directly, never
      // classified. A native listing is always on one of the two boards.
      industry,
      employer_name: data.employer_name,
      employer_id: employerId,
      venue_type: data.venue_type || null,
      city: data.city,
      locality: data.locality || null,
      postcode: data.postcode || null,
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
      // Drafted, not published. applyFilters() requires status='live', so a
      // pending row is invisible on the board, in search and in facets until
      // ./complete publishes it.
      status: 'pending',
      // Featured is EARNED, never sold. Written now so the value is fixed at
      // draft time, but it only starts mattering once the row goes live.
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

    return NextResponse.json({
      success: true,
      pending: true,
      slug: saved.slug,
      listing_id: saved.listing_id,
      email: contactEmail,
      featured: check.featured,
      featured_days: check.featured ? FEATURED_DAYS : 0,
    })
  } catch (e) {
    console.error('[jobs/post]', e)
    return NextResponse.json({ error: 'Something went wrong. Try again.', detail: String(e).slice(0, 200) }, { status: 500 })
  }
}
