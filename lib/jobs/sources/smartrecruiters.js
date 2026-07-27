// SmartRecruiters public posting API, no auth, no key, no rate limit.
// This is the endpoint SmartRecruiters' own hosted career sites call, so it is
// public by design, but note their docs claim the Posting API requires an API
// key. It demonstrably does not for this path. Undocumented-but-public: fine for
// now, worth getting in writing if it ever becomes load-bearing.
//
// Greene King (identifier "GreeneKing") carries ~3,000 live UK pub/restaurant
// vacancies. Build tenants as config, not code, so new chains are a one-line add.

import { classifyRole, classifyVenue, classifyContract, classifyExperience, classifyIndustry, buildSlug } from '../classify.js'

const API = 'https://api.smartrecruiters.com/v1/companies'
const PAGE = 100 // API maximum

export const TENANTS = [
  { identifier: 'GreeneKing', employerName: 'Greene King' },
]

// Staged rollout: the Central Belt only, so we validate the whole pipeline on a
// reviewable slice before pulling thousands of rows. Glasgow–Edinburgh corridor
// plus Stirling/Falkirk/Fife. `region` in the feed is unreliable (Glasgow reports
// "Lanarkshire", not "Scotland"), so we filter on coordinates instead.
export const REGIONS = {
  central_scotland: { lat: [55.70, 56.30], lng: [-5.00, -2.60] },
}

const inBox = (loc, box) => {
  if (!box) return true
  const la = parseFloat(loc?.latitude)
  const ln = parseFloat(loc?.longitude)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false
  return la >= box.lat[0] && la <= box.lat[1] && ln >= box.lng[0] && ln <= box.lng[1]
}

const customField = (posting, label) =>
  posting.customField?.find((f) => f.fieldLabel === label)?.valueLabel || null

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`SmartRecruiters ${res.status} for ${url}`)
  return res.json()
}

// Small concurrency pool, the detail endpoint is one call per posting and we
// don't want 100 simultaneous sockets against a free public API.
async function pooled(items, size, fn) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
  }
  return out
}

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

function toDescription(detail) {
  const s = detail?.jobAd?.sections || {}
  return [s.jobDescription?.text, s.qualifications?.text, s.additionalInformation?.text]
    .map(stripHtml)
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 8000)
}

/**
 * Fetch and normalise postings for one tenant.
 * @param {object} opts
 * @param {string} opts.identifier   SmartRecruiters company identifier
 * @param {string} opts.employerName Display name
 * @param {object} [opts.box]        Bounding box from REGIONS
 * @param {number} [opts.limit]      Hard cap on rows returned
 * @param {boolean} [opts.withDescriptions=true] Fetch the detail endpoint per posting
 */
export async function fetchTenant({ identifier, employerName, box, limit = Infinity, withDescriptions = true }) {
  const matched = []
  let offset = 0
  let total = null

  // Paginate the whole board, filtering client-side: the API has no coordinate
  // filter and its `region` field is too inconsistent to query on.
  while (matched.length < limit) {
    const page = await getJSON(`${API}/${identifier}/postings?limit=${PAGE}&offset=${offset}`)
    total = page.totalFound
    const content = page.content || []
    if (!content.length) break

    for (const p of content) {
      if (!inBox(p.location, box)) continue
      matched.push(p)
      if (matched.length >= limit) break
    }
    offset += PAGE
    if (offset >= total) break
  }

  const details = withDescriptions
    ? await pooled(matched, 8, async (p) => {
        try {
          return await getJSON(`${API}/${identifier}/postings/${p.id}`)
        } catch {
          return null // a single dead posting shouldn't fail the whole ingest
        }
      })
    : matched.map(() => null)

  const rows = matched.map((p, i) => {
    const detail = details[i]
    const loc = p.location || {}
    const brand = customField(p, 'Brands')?.replace(/\s*-\s*BRA_\d+$/, '') || null
    const description = detail ? toDescription(detail) : null
    const url = detail?.postingUrl || `https://jobs.smartrecruiters.com/${identifier}/${p.id}`

    return {
      source: 'smartrecruiters',
      source_id: String(p.id),
      source_url: url,
      attribution: null, // employer-published; no attribution required
      title: p.name,
      role_category: classifyRole(p.name),
      industry: classifyIndustry({ title: p.name, employerName }),
      employer_name: employerName,
      employer_id: null,
      brand,
      venue_type: classifyVenue({ brand, employerName, address: loc.address, title: p.name }),
      city: loc.city || null,
      locality: null,
      region: loc.region || null,
      postcode: loc.postalCode || null,
      is_agency: false, // employer-direct by definition
      lat: parseFloat(loc.latitude) || null,
      lng: parseFloat(loc.longitude) || null,
      contract_type: classifyContract(p.typeOfEmployment?.label),
      pay_min: null,
      pay_max: null,
      pay_period: null,
      pay_is_estimated: false,
      shift_pattern: null, // never present in a feed, native posters only
      experience_level: classifyExperience(p.name),
      description,
      apply_url: detail?.applyUrl || url,
      is_native: false,
      slug: buildSlug({ title: p.name, employerName, city: loc.city, sourceId: p.id }),
      posted_at: p.releasedDate || null,
      status: 'live',
    }
  })

  return { rows, scanned: total }
}

/** Fetch every configured tenant. `limit` is per tenant. */
export async function fetchAll({ region, limit, withDescriptions } = {}) {
  const box = region ? REGIONS[region] : null
  const all = []
  let scanned = 0
  for (const t of TENANTS) {
    const r = await fetchTenant({ ...t, box, limit, withDescriptions })
    all.push(...r.rows)
    scanned += r.scanned || 0
  }
  return { rows: all, scanned }
}
