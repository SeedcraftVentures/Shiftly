import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { fetchAll as fetchSmartRecruiters } from '@/lib/jobs/sources/smartrecruiters'
import { fetchRegion as fetchAdzuna, RETAIL_CATEGORY } from '@/lib/jobs/sources/adzuna'
import { fetchRegion as fetchReed } from '@/lib/jobs/sources/reed'
import { diversifyByEmployer, employerSpread } from '@/lib/jobs/diversify'
import { MAX_AGE_DAYS, cutoffISO } from '@/lib/jobs/query'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Ingest writes, and /api/* bypasses middleware, so it guards itself. Accepts
// either the manual header (x-ingest-secret == JOBS_INGEST_SECRET) or a Vercel
// Cron request (Authorization: Bearer CRON_SECRET). Either secret being set and
// matched authorises the run.
function authorised(req) {
  const ingestSecret = process.env.JOBS_INGEST_SECRET
  const cronSecret = process.env.CRON_SECRET
  if (ingestSecret && req.headers.get('x-ingest-secret') === ingestSecret) return { ok: true }
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return { ok: true }
  if (!ingestSecret && !cronSecret) return { ok: false, why: 'neither JOBS_INGEST_SECRET nor CRON_SECRET is set' }
  return { ok: false, why: 'unauthorised' }
}

// Adzuna leads: it reaches independents and small multi-site groups (via
// Caterer.com, CV-Library, Totaljobs, DWP), which is the board's whole point.
// It is pulled for BOTH industries, hospitality and retail, from the two
// categories; classifyIndustry re-derives each row's industry regardless of
// which category it came from. SmartRecruiters follows as density, capped.
// Reed is available but NOT in the default set: its terms (attribution, caching)
// are unconfirmed, so it runs only when explicitly requested via sources:['reed'].
const SOURCES = {
  adzuna: (o) => fetchAdzuna(o),
  adzuna_retail: (o) => fetchAdzuna({ ...o, category: RETAIL_CATEGORY }),
  smartrecruiters: (o) => fetchSmartRecruiters(o),
  reed: (o) => fetchReed(o),
}

// What a scheduled or no-argument sweep pulls: both industries via Adzuna, plus
// SmartRecruiters. Reed is deliberately excluded, see above.
const DEFAULT_SOURCES = ['adzuna', 'adzuna_retail', 'smartrecruiters']

// Abandoned drafts older than this are purged on every ingest. A poster gets a
// generous window to click the confirm email before their draft disappears.
const PENDING_TTL_HOURS = Number(process.env.JOBS_PENDING_TTL_HOURS || 48)

// The scheduled Vercel Cron entry point. GET so cron can call it, defaults to a
// full both-industries sweep. Same auth as POST.
export async function GET(req) {
  const gate = authorised(req)
  if (!gate.ok) return NextResponse.json({ error: gate.why }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 })
  return runIngest({})
}

// Manual / parameterised ingest. Body may set region, limit, sources, etc.
export async function POST(req) {
  const gate = authorised(req)
  if (!gate.ok) return NextResponse.json({ error: gate.why }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 })

  let body = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine, defaults below
  }
  return runIngest(body)
}

async function runIngest(body) {
  const region = body.region ?? 'central_scotland'
  const limit = Number(body.limit ?? 120)
  const sources = Array.isArray(body.sources) ? body.sources : DEFAULT_SOURCES
  // Soft ceiling per employer. Round-robin usually keeps things even on its own;
  // this is the backstop for when one source returns thousands from one company.
  const maxFraction = body.maxFraction === null ? undefined : Number(body.maxFraction ?? 0.15)
  const dryRun = body.dryRun === true

  try {
    // Over-fetch each source, then diversify down, otherwise whichever source
    // runs first fills the quota and the rest never get a look in.
    const collected = []
    const perSource = {}
    for (const name of sources) {
      const fn = SOURCES[name]
      if (!fn) {
        perSource[name] = { error: 'unknown source' }
        continue
      }
      try {
        const { rows, scanned, skipped } = await fn({ region, limit })
        if (skipped) {
          perSource[name] = { skipped }
          continue
        }
        perSource[name] = { fetched: rows.length, scanned: scanned ?? null }
        collected.push(...rows)
      } catch (err) {
        console.error(`[jobs/ingest] ${name}`, err)
        perSource[name] = { error: err.message }
      }
    }

    const rows = diversifyByEmployer(collected, { limit, maxFraction })

    const summary = {
      region,
      sources: perSource,
      candidates: collected.length,
      selected: rows.length,
      employers: Object.keys(employerSpread(rows)).length,
      byIndustry: tally(rows, 'industry'),
      byEmployer: employerSpread(rows),
      byRole: tally(rows, 'role_category'),
      byVenue: tally(rows, 'venue_type'),
      byCity: tally(rows, 'city'),
      withPay: rows.filter((r) => r.pay_min && !r.pay_is_estimated).length,
      withEstimatedPay: rows.filter((r) => r.pay_is_estimated).length,
    }

    if (dryRun) return NextResponse.json({ dryRun: true, ...summary, sample: rows.slice(0, 3) })

    if (!rows.length) return NextResponse.json({ ok: true, upserted: 0, ...summary })

    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('Job Listings')
      .upsert(
        rows.map((r) => ({ ...r, updated_at: now })),
        { onConflict: 'source,source_id' }
      )
      .select('listing_id')

    if (error) throw error

    // Sweep on every run so the board self-cleans without a separate cron. The
    // query layer already hides old rows; this stops them accumulating forever.
    const { data: swept, error: sweepErr } = await supabaseAdmin
      .from('Job Listings')
      .update({ status: 'expired', updated_at: now })
      .eq('status', 'live')
      .lt('posted_at', cutoffISO())
      .select('listing_id')
    if (sweepErr) console.error('[jobs/ingest] expiry sweep', sweepErr)

    // Abandoned native drafts: someone filled the form but never clicked the
    // confirm email. They were never public, so they are DELETED, not expired,
    // and the deletion frees the poster's draft cap.
    const draftCutoff = new Date(Date.now() - PENDING_TTL_HOURS * 3600e3).toISOString()
    const { data: purgedDrafts, error: draftErr } = await supabaseAdmin
      .from('Job Listings')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', draftCutoff)
      .select('listing_id')
    if (draftErr) console.error('[jobs/ingest] draft sweep', draftErr)

    // Trim the rate-limit table. Tolerated if the function is not present yet.
    try { await supabaseAdmin.rpc('jobs_rate_limit_gc', {}) } catch { /* not applied yet */ }

    return NextResponse.json({
      ok: true,
      upserted: data?.length ?? 0,
      expired: swept?.length ?? 0,
      purgedDrafts: purgedDrafts?.length ?? 0,
      maxAgeDays: MAX_AGE_DAYS,
      ...summary,
    })
  } catch (err) {
    console.error('[jobs/ingest]', err)
    return NextResponse.json({ error: err.message || 'Ingest failed' }, { status: 500 })
  }
}

function tally(rows, key) {
  const out = {}
  for (const r of rows) {
    const k = r[key] ?? 'null'
    out[k] = (out[k] || 0) + 1
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]))
}
