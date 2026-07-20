// Server-side reads for the board. The /jobs page (server-rendered, for SEO) and
// /api/jobs/search both call this, so filter semantics can never drift.
//
// Taxonomy and formatters live in ./taxonomy.js, this module imports
// supabaseAdmin, so it can never be pulled into a client component.

import { supabaseAdmin } from '@/lib/db'
import { PER_PAGE, showsPay } from './taxonomy'

export * from './taxonomy'

// Nothing older than this is shown, whatever its status. Aggregator feeds do not
// tell us when a role is filled, so age is the only honest signal we have. A
// stale listing wastes an applicant's time and makes the board look neglected.
export const MAX_AGE_DAYS = 90

export const cutoffISO = () => new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString()

function applyFilters(qb, f) {
  qb = qb.eq('status', 'live').gte('posted_at', cutoffISO())
  if (f.q) qb = qb.or(`title.ilike.%${f.q}%,employer_name.ilike.%${f.q}%`)
  if (f.role) qb = qb.eq('role_category', f.role)
  if (f.venue) qb = qb.eq('venue_type', f.venue)
  if (f.city) qb = qb.ilike('city', f.city)
  if (f.contract) qb = qb.eq('contract_type', f.contract)
  // Transparency filter: employer-stated pay only. Adzuna's predicted figures are
  // deliberately excluded, an estimate is not disclosure. Mirrors showsPay():
  // either bound counts, but a zero bound is not a figure.
  if (f.paid) qb = qb.eq('pay_is_estimated', false).or('pay_min.gt.0,pay_max.gt.0')
  return qb
}

/**
 * @param {object} f  { q, role, venue, city, contract, paid, page }
 */
export async function searchListings(f = {}) {
  if (!supabaseAdmin) return { results: [], total: 0, page: 1, pages: 0, facets: {}, error: 'Supabase not configured' }

  const page = Math.max(1, Number(f.page) || 1)
  const from = (page - 1) * PER_PAGE

  let qb = supabaseAdmin.from('Job Listings').select('*', { count: 'exact' })
  qb = applyFilters(qb, f)
  // Freshness ordering for v1. Ranking disclosed-pay listings above the rest
  // needs a stored boolean to sort on, noted in the spec, not faked here.
  qb = qb.order('posted_at', { ascending: false, nullsFirst: false }).range(from, from + PER_PAGE - 1)

  const { data, count, error } = await qb
  if (error) return { results: [], total: 0, page, pages: 0, facets: {}, error: error.message }

  return {
    results: data || [],
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / PER_PAGE),
    perPage: PER_PAGE,
  }
}

/** One listing by slug. Returns null when missing so the page can 404 properly. */
export async function getListingBySlug(slug) {
  if (!supabaseAdmin || !slug) return null
  const { data } = await supabaseAdmin
    .from('Job Listings')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'live')
    .gte('posted_at', cutoffISO())
    .maybeSingle()
  return data || null
}

/**
 * Roles to show beneath a listing. Prefers the same town, falls back to the same
 * role elsewhere, internal links that are genuinely useful to a jobseeker, and
 * they give crawlers a path between listing pages.
 */
export async function getRelatedListings(job, limit = 4) {
  if (!supabaseAdmin || !job) return []
  const base = () =>
    supabaseAdmin
      .from('Job Listings')
      .select('listing_id,slug,title,employer_name,city,pay_min,pay_max,pay_period,pay_is_estimated,role_category')
      .eq('status', 'live')
      .gte('posted_at', cutoffISO())
      .neq('listing_id', job.listing_id)

  let out = []
  if (job.city) {
    const { data } = await base().eq('city', job.city).limit(limit)
    out = data || []
  }
  if (out.length < limit && job.role_category) {
    const { data } = await base().eq('role_category', job.role_category).limit(limit - out.length)
    const seen = new Set(out.map((r) => r.listing_id))
    out = [...out, ...(data || []).filter((r) => !seen.has(r.listing_id))]
  }
  return out.slice(0, limit)
}

/**
 * Counts for the filter bar and the stats strip.
 * Reads a trimmed projection of every live row, fine at board scale, and it
 * keeps facet counts exact. Swap for a Postgres RPC if the corpus gets large.
 */
export async function getFacets(f = {}) {
  if (!supabaseAdmin) return { stats: {}, role: {}, venue: {}, city: {}, contract: {} }

  let qb = supabaseAdmin
    .from('Job Listings')
    .select('role_category,venue_type,city,contract_type,employer_name,pay_min,pay_is_estimated,posted_at')
  qb = applyFilters(qb, { ...f, role: null, venue: null, contract: null }) // facets ignore their own axis
  const { data } = await qb.limit(5000)
  const rows = data || []

  const tally = (key) => {
    const out = {}
    for (const r of rows) if (r[key]) out[r[key]] = (out[r[key]] || 0) + 1
    return out
  }

  const weekAgo = Date.now() - 7 * 864e5
  return {
    role: tally('role_category'),
    venue: tally('venue_type'),
    city: tally('city'),
    contract: tally('contract_type'),
    stats: {
      total: rows.length,
      employers: new Set(rows.map((r) => r.employer_name)).size,
      showingPay: rows.filter(showsPay).length,
      addedThisWeek: rows.filter((r) => r.posted_at && new Date(r.posted_at).getTime() > weekAgo).length,
    },
  }
}
