// Reed, the source that gives full descriptions.
//
// Reed matters more than the other aggregators because its detail endpoint
// returns the COMPLETE advert, not a snippet. That converts a large slice of the
// board from "extract, link out" to real content, and it is the only aggregated
// source that can carry JobPosting structured data (see lib/jobs/jsonld.js, which
// already whitelists 'reed'). Its salary figures are employer-STATED, not an
// algorithmic estimate like Adzuna's, so they can carry the transparency badge.
//
// Auth: HTTP Basic, the API key as the username and a blank password.
//
// TERMS, unresolved: Reed's jobseeker terms live in the registration agreement,
// which is not published publicly. Attribution and caching obligations are
// therefore unconfirmed. Until they are, this leaves `attribution` null and keeps
// the apply/source URL pointing at the Reed job page (link-back preserved), and
// the connector should NOT be wired into the scheduled ingest for production.
// Build and test it, confirm the terms, then enable. This mirrors the caution
// already applied to Adzuna's caching position.

import {
  classifyRole, classifyVenue, classifyContract, classifyExperience,
  isAgency, classifyIndustry, tidyCity, buildSlug, parsePayFromText,
} from '../classify.js'

const API = 'https://www.reed.co.uk/api/1.0'
const PER_PAGE = 100 // resultsToTake maximum

// Left null on purpose until Reed's attribution terms are confirmed, see the
// header note. The detail page only renders a credit when this is set, and its
// link currently points at adzuna.co.uk, so a non-null value here would mislabel.
export const ATTRIBUTION = null

// Keyword search, because the jobseeker API has no hospitality category. Each
// term is a separate query (Reed ANDs multiple words), deduped by jobId after.
// Broad, high-recall terms: isHospitality() strips the non-hospitality bycatch
// (care work, drivers) the same way it does for Adzuna.
export const HOSPITALITY_KEYWORDS = [
  'chef', 'kitchen', 'bar staff', 'waiting staff', 'barista',
  'front of house', 'hospitality', 'restaurant',
]

export const REGION_ANCHORS = {
  central_scotland: {
    anchors: ['Glasgow', 'Edinburgh'],
    distance: 15, // miles (Reed's distanceFromLocation is in miles, not km)
  },
}

const creds = () => process.env.REED_API_KEY || process.env.REED_JOBSEEKERS || null

function authHeader() {
  const key = creds()
  if (!key) return null
  // key as username, blank password.
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64')
}

async function getJSON(url, auth) {
  const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Reed ${res.status}: ${body.slice(0, 160)}`)
  }
  return res.json()
}

// Concurrency pool for the per-job detail calls, so a 100-row sweep does not open
// 100 simultaneous sockets. Mirrors the SmartRecruiters connector.
async function pooled(items, size, fn) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
  }
  return out
}

// Decode HTML entities, NUMERIC ones included. Reed encodes the pound sign as
// &#163;, so without this the page would literally show "&#163;14.56" and, worse,
// the pay parser would never see a £ to read. Numeric and hex first, then the
// named ones, with &amp; last so an already-decoded & is not mangled.
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)) } catch { return _ } })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)) } catch { return _ } })
    .replace(/&pound;/gi, '£')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
}

// Reed descriptions are HTML with <p>/<br> and entities. Preserve paragraph
// breaks (the detail page splits on blank lines) while stripping tags.
function htmlToText(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\/\s*p\s*>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .trim()
}

// Reed dates are UK format, dd/MM/yyyy. Return an ISO string, or null.
function toISO(dmy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dmy || '').trim())
  if (!m) return null
  const [, d, mo, y] = m
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
}

// Reed's salaryType is a phrase. Map only the two periods the board can render
// honestly; anything else (per day, per week) drops the pay rather than
// misrepresent a weekly figure as annual.
function payPeriod(salaryType) {
  const t = String(salaryType || '').toLowerCase()
  if (t.includes('hour')) return 'hourly'
  if (t.includes('annum') || t.includes('year')) return 'annual'
  return null
}

// Hours are the axis a shift worker filters on, so part/full wins over the
// permanence string, then classifyContract catches temporary/seasonal.
function toContract(detail) {
  if (detail.partTime && !detail.fullTime) return 'part_time'
  if (detail.fullTime) return 'full_time'
  return classifyContract(detail.contractType)
}

function toRow(detail) {
  const employerName = String(detail.employerName || '').trim() || 'Unknown employer'
  const title = String(detail.jobTitle || '').trim() || 'Untitled role'
  const city = tidyCity(detail.locationName || null)
  const description = htmlToText(detail.jobDescription) || null

  // Pay, employer-stated either way. Reed's structured salary field is entered by
  // the employer and carries a real period (salaryType), so it is trusted first.
  // When it is empty, the pay is very often in the advert text ("14.56 per hour"),
  // so parse that as a fallback exactly as the Adzuna connector does. This lifts
  // disclosure a long way, which is the whole point of a transparency board.
  const period = payPeriod(detail.salaryType)
  const sMin = period && Number(detail.minimumSalary) > 0 ? Number(detail.minimumSalary) : null
  const sMax = period && Number(detail.maximumSalary) > 0 ? Number(detail.maximumSalary) : null

  let payMin = sMin
  let payMax = sMax
  let payPer = sMin || sMax ? period : null
  if (!payMin && !payMax) {
    // requireCurrency:false, because Reed recruiters routinely write pay without
    // a £ ("14.56 per hour"). Reed rows only, Adzuna keeps the strict parser.
    const parsed = parsePayFromText(`${title} ${description || ''}`, { requireCurrency: false })
    if (parsed) {
      payMin = parsed.min
      payMax = parsed.max
      payPer = parsed.period
    }
  }

  const jobUrl = detail.jobUrl || null

  return {
    source: 'reed',
    source_id: String(detail.jobId),
    source_url: jobUrl,
    attribution: ATTRIBUTION,
    title,
    role_category: classifyRole(title),
    industry: classifyIndustry({ title, employerName }),
    employer_name: employerName,
    employer_id: null,
    brand: null,
    venue_type: classifyVenue({ employerName, address: detail.locationName, title }),
    city,
    locality: null,
    region: null, // Reed returns neither region nor coordinates
    postcode: null,
    is_agency: isAgency(employerName),
    lat: null,
    lng: null,
    contract_type: toContract(detail),
    // Employer-stated, so NOT flagged estimated: it can carry the pay badge.
    pay_min: payMin,
    pay_max: payMax,
    pay_period: payMin || payMax ? payPer : null,
    pay_is_estimated: false,
    shift_pattern: null, // never in a feed, native posters only
    experience_level: classifyExperience(title),
    // The full advert. This is why Reed is worth wiring: real content, not a snippet.
    description,
    // Apply through the Reed job page, which preserves the link-back.
    apply_url: jobUrl,
    is_native: false,
    slug: buildSlug({ title, employerName, city, sourceId: detail.jobId }),
    posted_at: toISO(detail.datePosted) || null,
    // Reed gives a real expiry; store it so JobPosting validThrough is exact and
    // the row expires on Reed's own timeline rather than a computed guess.
    expires_at: toISO(detail.expirationDate) || null,
    status: 'live',
  }
}

/**
 * Fetch hospitality listings around a region's anchor towns.
 *
 * Cheap search first (collect + dedupe + hospitality filter + cap), then the
 * expensive per-job detail calls only for the rows that survive, so we never pull
 * a full description for a row we are about to drop.
 *
 * @param {object} opts
 * @param {string} [opts.region='central_scotland']
 * @param {number} [opts.limit=100]
 * @param {string[]} [opts.keywords]
 */
export async function fetchRegion({ region = 'central_scotland', limit = 100, keywords = HOSPITALITY_KEYWORDS } = {}) {
  const auth = authHeader()
  if (!auth) return { rows: [], scanned: 0, skipped: 'REED_API_KEY / REED_JOBSEEKERS not set' }

  const cfg = REGION_ANCHORS[region]
  if (!cfg) throw new Error(`Unknown Reed region "${region}"`)

  const seen = new Set()
  const candidates = []
  let scanned = 0

  for (const keyword of keywords) {
    for (const where of cfg.anchors) {
      const qs = new URLSearchParams({
        keywords: keyword,
        locationName: where,
        distanceFromLocation: String(cfg.distance),
        resultsToTake: String(PER_PAGE),
      })
      let data
      try {
        data = await getJSON(`${API}/search?${qs}`, auth)
      } catch (err) {
        console.warn(`[reed] "${keyword}" @ ${where}: ${err.message}`)
        continue
      }
      const results = data.results || []
      scanned += results.length
      for (const r of results) {
        const id = String(r.jobId)
        if (seen.has(id)) continue
        seen.add(id)
        // Filter on the cheap search fields before spending a detail call: drop
        // anything that is neither hospitality nor retail up front.
        if (classifyIndustry({ title: r.jobTitle, employerName: r.employerName }) === 'other') continue
        candidates.push(id)
      }
    }
  }

  const picked = candidates.slice(0, limit)
  const details = await pooled(picked, 8, async (id) => {
    try {
      return await getJSON(`${API}/jobs/${id}`, auth)
    } catch (err) {
      console.warn(`[reed] detail ${id}: ${err.message}`)
      return null
    }
  })

  const rows = details
    .filter(Boolean)
    .map(toRow)
    // Re-check against the full record: the detail title can refine the industry,
    // and a detail fetch can fail leaving nothing to keep. Off-topic rows drop.
    .filter((row) => row.source_id && row.industry !== 'other')

  return { rows, scanned }
}
