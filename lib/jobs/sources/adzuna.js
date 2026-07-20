// Adzuna, the route to Shiftly's actual ICP.
//
// Adzuna aggregates Caterer.com, CV-Library, Totaljobs and the DWP Find a Job
// feed, which is where independents and small multi-site groups advertise. Those
// operators typically have no careers page and no ATS, that's precisely why
// they're customers, so they cannot be reached by employer-direct crawling.
//
// Terms (developer.adzuna.com/docs/terms_of_service):
//   • Listings MUST be labelled "Jobs by Adzuna" with a link back to adzuna.co.uk.
//   • `description` is a SNIPPET, not the full ad, always link out, never present
//     it as a complete listing.
//   • Free tier: 25 hits/min, 250/day, 1,000/week, 2,500/month. Budget accordingly:
//     scheduled sweeps, never per-user live search.
//   • Caching is not explicitly addressed in their terms, confirm in writing
//     before relying on a persistent store at scale.

import {
  classifyRole, classifyVenue, classifyContract, classifyExperience,
  isAgency, isHospitality, tidyCity, parsePayFromText, buildSlug,
} from '../classify.js'

const API = 'https://api.adzuna.com/v1/api/jobs'
const PER_PAGE = 50 // documented default is 20; 50 is the practical maximum

export const ATTRIBUTION = 'Jobs by Adzuna'

// Verify the exact GB tag with fetchCategories() once a key exists, this is the
// documented hospitality tag but worth confirming against live data.
export const HOSPITALITY_CATEGORY = 'hospitality-catering-jobs'

// Anchor towns + radius beats a single "Scotland" query: Adzuna's `where` is a
// free-text place match, so several tight anchors give better recall across the
// Central Belt than one broad one. Results are deduped by Adzuna id afterwards.
export const REGION_ANCHORS = {
  central_scotland: {
    anchors: ['Glasgow', 'Edinburgh', 'Stirling', 'Falkirk', 'Dunfermline', 'Livingston'],
    distance: 15, // km
    box: { lat: [55.70, 56.30], lng: [-5.00, -2.60] },
  },
}

// ADZUNA_API_KEY is accepted as an alias for ADZUNA_APP_KEY. Adzuna's own docs
// call it "API key" on the signup page and "app_key" in the request, so both
// names are in circulation.
const creds = () => {
  const app_id = process.env.ADZUNA_APP_ID
  const app_key = process.env.ADZUNA_APP_KEY || process.env.ADZUNA_API_KEY
  return app_id && app_key ? { app_id, app_key } : null
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Adzuna ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

/** List GB categories, use once to confirm the hospitality tag. */
export async function fetchCategories(country = 'gb') {
  const c = creds()
  if (!c) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY are not set')
  const qs = new URLSearchParams({ ...c })
  return getJSON(`${API}/${country}/categories?${qs}`)
}

const inBox = (lat, lng, box) => {
  if (!box) return true
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  return lat >= box.lat[0] && lat <= box.lat[1] && lng >= box.lng[0] && lng <= box.lng[1]
}

// Adzuna splits hours (contract_time) from permanence (contract_type). Hours are
// the more useful axis for shift work, so they win when both are present.
function toContract(r) {
  return classifyContract(r.contract_time) || classifyContract(r.contract_type) || null
}

function toRow(r, country) {
  const employerName = r.company?.display_name?.trim() || 'Unknown employer'
  const place = r.location?.display_name || ''
  const area = Array.isArray(r.location?.area) ? r.location.area : []
  // area is broad→narrow: ["UK","Scotland","Glasgow","Glasgow City Centre","Hillhead"].
  // Index 2 is the council/city area, which is the right grain for city pages and
  // filters. Taking the LAST element instead splits one city into neighbourhoods
  // into neighbourhoods: Hillhead, Muirend and Glasgow City Centre are all Glasgow.
  const city = tidyCity(area[2] || area[area.length - 1] || place.split(',')[0]?.trim() || null)
  const region = area[1] || null
  // Keep the precise place for display; the city is what we filter on.
  const locality = area.length > 3 ? area[area.length - 1] : null
  const lat = Number(r.latitude)
  const lng = Number(r.longitude)

  // salary_is_predicted arrives as the string "1"/"0". Predicted pay is Adzuna's
  // estimate, NOT what the employer stated, it must never earn a "shows pay"
  // badge, hence the explicit flag rather than silently trusting the number.
  const predicted = String(r.salary_is_predicted) === '1'

  // The employer's own words beat the aggregator's normalised annual figure:
  // it preserves the real basis (hourly for most shift work) and it genuinely is
  // employer-stated, so it can carry the transparency badge.
  const descText = r.description ? String(r.description).replace(/<\/?[^>]+>/g, ' ') : ''
  const stated = parsePayFromText(`${r.title || ''} ${descText}`)

  return {
    source: 'adzuna',
    source_id: String(r.id),
    source_url: r.redirect_url || null,
    attribution: ATTRIBUTION,
    title: r.title ? String(r.title).replace(/<\/?[^>]+>/g, '').trim() : 'Untitled role',
    role_category: classifyRole(r.title),
    employer_name: employerName,
    employer_id: null,
    brand: null,
    venue_type: classifyVenue({ employerName, address: place, title: r.title }),
    city,
    locality,
    region,
    postcode: null,
    is_agency: isAgency(employerName),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    contract_type: toContract(r),
    // Adzuna sends 0 rather than null for an unknown bound, store it as null so
    // nothing downstream can render a "£0" wage.
    pay_min: stated ? stated.min : Number(r.salary_min) > 0 ? Number(r.salary_min) : null,
    pay_max: stated ? stated.max : Number(r.salary_max) > 0 ? Number(r.salary_max) : null,
    // Adzuna normalises everything to annual; a parsed figure keeps the real basis.
    pay_period: stated ? stated.period : r.salary_min ? 'annual' : null,
    pay_is_estimated: stated ? false : predicted,
    shift_pattern: null, // never in a feed, native posters only
    experience_level: classifyExperience(r.title),
    // Snippet only, per Adzuna's terms. The detail page links out for the full ad.
    description: r.description ? String(r.description).replace(/<\/?[^>]+>/g, '').trim() : null,
    apply_url: r.redirect_url || null,
    is_native: false,
    slug: buildSlug({ title: r.title, employerName, city, sourceId: r.id }),
    posted_at: r.created || null,
    status: 'live',
  }
}

/**
 * Fetch hospitality listings around a region's anchor towns.
 * @param {object} opts
 * @param {string} [opts.region='central_scotland']
 * @param {number} [opts.limit=100]     total rows across all anchors
 * @param {string} [opts.country='gb']
 * @param {number} [opts.maxDaysOld=30]
 */
export async function fetchRegion({ region = 'central_scotland', limit = 100, country = 'gb', maxDaysOld = 30 } = {}) {
  const c = creds()
  if (!c) return { rows: [], scanned: 0, skipped: 'ADZUNA_APP_ID / ADZUNA_APP_KEY not set' }

  const cfg = REGION_ANCHORS[region]
  if (!cfg) throw new Error(`Unknown Adzuna region "${region}"`)

  const seen = new Set()
  const rows = []
  let scanned = 0

  // One page per anchor first, breadth before depth, so a single dense city
  // doesn't consume the whole limit before other towns are touched.
  outer: for (let page = 1; page <= 2; page++) {
    for (const where of cfg.anchors) {
      if (rows.length >= limit) break outer

      const qs = new URLSearchParams({
        ...c,
        results_per_page: String(PER_PAGE),
        where,
        distance: String(cfg.distance),
        category: HOSPITALITY_CATEGORY,
        max_days_old: String(maxDaysOld),
        'content-type': 'application/json',
      })

      let data
      try {
        data = await getJSON(`${API}/${country}/search/${page}?${qs}`)
      } catch (err) {
        // One bad anchor shouldn't sink the run, record and carry on.
        console.warn(`[adzuna] ${where} p${page}: ${err.message}`)
        continue
      }

      const results = data.results || []
      scanned += results.length
      if (!results.length) continue

      for (const r of results) {
        if (rows.length >= limit) break
        const id = String(r.id)
        if (seen.has(id)) continue // anchors overlap; dedupe on Adzuna's id
        seen.add(id)
        const row = toRow(r, country)
        if (!inBox(row.lat, row.lng, cfg.box)) continue
        // Adzuna's hospitality category leaks Army recruitment, care work and
        // recruitment-consultant roles, drop them rather than show them.
        if (!isHospitality({ title: row.title, employerName: row.employer_name })) continue
        rows.push(row)
      }
    }
  }

  return { rows, scanned }
}
