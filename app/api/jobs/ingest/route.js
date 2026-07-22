import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { fetchAll as fetchSmartRecruiters } from '@/lib/jobs/sources/smartrecruiters'
import { fetchRegion as fetchAdzuna } from '@/lib/jobs/sources/adzuna'
import { fetchRegion as fetchReed } from '@/lib/jobs/sources/reed'
import { diversifyByEmployer, employerSpread } from '@/lib/jobs/diversify'
import { MAX_AGE_DAYS, cutoffISO } from '@/lib/jobs/query'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Ingest writes, and /api/* bypasses middleware, so it guards itself with a
// shared secret. Set JOBS_INGEST_SECRET in .env.local, send as x-ingest-secret.
function authorised(req) {
  const secret = process.env.JOBS_INGEST_SECRET
  if (!secret) return { ok: false, why: 'JOBS_INGEST_SECRET is not set' }
  if (req.headers.get('x-ingest-secret') !== secret) return { ok: false, why: 'bad or missing x-ingest-secret' }
  return { ok: true }
}

// Adzuna leads: it reaches independents and small multi-site groups (via
// Caterer.com, CV-Library, Totaljobs, DWP), which is the board's whole point.
// SmartRecruiters follows as density, capped, so a chain can't take over.
// Reed is available but NOT in the default set below: its terms (attribution,
// caching) are in a private registration agreement and unconfirmed, so it runs
// only when explicitly requested via sources:['reed'], never on a blind sweep.
const SOURCES = {
  adzuna: (o) => fetchAdzuna(o),
  smartrecruiters: (o) => fetchSmartRecruiters(o),
  reed: (o) => fetchReed(o),
}

// What a no-argument sweep pulls. Reed is deliberately excluded, see above.
const DEFAULT_SOURCES = ['adzuna', 'smartrecruiters']

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

  const region = body.region ?? 'central_scotland'
  const limit = Number(body.limit ?? 100)
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

    return NextResponse.json({
      ok: true,
      upserted: data?.length ?? 0,
      expired: swept?.length ?? 0,
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
