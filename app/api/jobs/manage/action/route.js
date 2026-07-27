// Manage a single listing: take it down, put it back up, or edit its fields.
// Session gated AND ownership checked: the listing must belong to the signed-in
// employer, so a valid session cannot touch another venue's row.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { currentEmployerId } from '@/lib/jobs/session'
import { completeness, showsPay, toShiftArray, SHIFT_PATTERN_LABEL } from '@/lib/jobs/taxonomy'

export const dynamic = 'force-dynamic'

const str = (v, max = 5000) => String(v ?? '').trim().slice(0, max)

export async function POST(request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })
    const employerId = await currentEmployerId()
    if (!employerId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const listingId = String(body?.listing_id || '').trim()
    const action = String(body?.action || '').trim()
    if (!listingId || !action) return NextResponse.json({ error: 'Missing listing or action.' }, { status: 400 })

    // Ownership. Fetch scoped to this employer so a row belonging to someone
    // else simply is not found, rather than being acted on.
    const { data: listing } = await supabaseAdmin
      .from('Job Listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('employer_id', employerId)
      .maybeSingle()
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })

    // ── Take down ──────────────────────────────────────────────────────────
    // 'removed', not deleted: the URL keeps its SEO equity and renders the same
    // closed state as an expired role. Never allowed on a pending draft.
    if (action === 'takedown') {
      if (listing.status !== 'live') return NextResponse.json({ error: 'Only a live listing can be taken down.' }, { status: 409 })
      await supabaseAdmin.from('Job Listings')
        .update({ status: 'removed', featured_until: null, updated_at: new Date().toISOString() })
        .eq('listing_id', listingId)
      return NextResponse.json({ success: true, status: 'removed' })
    }

    // ── Repost ───────────────────────────────────────────────────────────────
    // Bring a taken-down role back. posted_at resets so it re-enters the board
    // at the top of freshness, which is the honest position for a fresh repost.
    if (action === 'repost') {
      if (listing.status !== 'removed' && listing.status !== 'expired') {
        return NextResponse.json({ error: 'Only a closed listing can be reposted.' }, { status: 409 })
      }
      await supabaseAdmin.from('Job Listings')
        .update({ status: 'live', posted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('listing_id', listingId)
      return NextResponse.json({ success: true, status: 'live' })
    }

    // ── Edit ───────────────────────────────────────────────────────────────
    if (action === 'edit') {
      const f = body.fields || {}
      const payMin = f.pay_min === '' || f.pay_min == null ? null : Number(f.pay_min)
      const payMax = f.pay_max === '' || f.pay_max == null ? null : Number(f.pay_max)
      if ((payMin != null && !Number.isFinite(payMin)) || (payMax != null && !Number.isFinite(payMax))) {
        return NextResponse.json({ error: 'Pay must be a number.' }, { status: 400 })
      }
      if (payMin != null && payMax != null && payMax < payMin) {
        return NextResponse.json({ error: 'Maximum pay cannot be lower than minimum.' }, { status: 400 })
      }

      const shift = toShiftArray(f.shift_pattern).filter((v) => SHIFT_PATTERN_LABEL[v]).slice(0, 10)
      const candidate = {
        title: str(f.title, 200) || listing.title,
        description: str(f.description) || listing.description,
        pay_min: payMin, pay_max: payMax,
        pay_period: str(f.pay_period, 20) || listing.pay_period,
        shift_pattern: shift.length ? shift : listing.shift_pattern,
        contract_type: str(f.contract_type, 40) || listing.contract_type,
      }

      // A live listing must still clear the required bar after an edit, so an
      // employer cannot strip the pay off a published role. Drafts are exempt:
      // they are edited toward completeness before they ever go live.
      if (listing.status === 'live') {
        const merged = {
          ...listing, ...candidate,
          employer_name: listing.employer_name, city: listing.city, venue_type: listing.venue_type,
          apply_url: listing.apply_url,
        }
        const check = completeness(merged)
        if (!check.valid) {
          return NextResponse.json({ error: 'That edit would drop a required field.', missing: check.missing }, { status: 400 })
        }
      }

      const patch = { ...candidate, updated_at: new Date().toISOString() }
      patch.shows_pay = showsPay(patch)
      const { data: updated, error } = await supabaseAdmin
        .from('Job Listings')
        .update(patch)
        .eq('listing_id', listingId)
        .eq('employer_id', employerId)
        .select('listing_id,slug,status')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, listing: updated })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (e) {
    console.error('[jobs/manage/action]', e)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
