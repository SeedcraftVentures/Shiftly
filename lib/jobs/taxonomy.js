// Pure, dependency-free taxonomy + formatters.
//
// Kept separate from query.js on purpose: query.js imports supabaseAdmin (and
// therefore next/headers), which cannot be bundled into a client component. The
// filter bar is a client component and needs these lists, so they live here.

export const PER_PAGE = 25

// Nothing older than this is shown, whatever its status. Aggregator feeds do not
// tell us when a role is filled, so age is the only honest signal we have.
// Lives here rather than in query.js so pure modules (the JSON-LD builder, client
// components) can read it without dragging supabaseAdmin into the bundle.
export const MAX_AGE_DAYS = 90

export const ROLES = [
  ['kitchen', 'Chef & kitchen'],
  ['kp', 'Kitchen porter'],
  ['bar', 'Bar'],
  ['waiting', 'Waiting & front of house'],
  ['barista', 'Barista'],
  ['host', 'Host & reception'],
  ['team_member', 'Team member'],
  ['supervisor', 'Supervisor'],
  ['management', 'Management'],
  ['housekeeping', 'Housekeeping'],
]

export const VENUES = [
  ['pub', 'Pub'],
  ['bar', 'Bar'],
  ['restaurant', 'Restaurant'],
  ['cafe', 'Café'],
  ['hotel', 'Hotel'],
  ['qsr', 'Fast food'],
  ['catering', 'Catering & events'],
  ['bakery', 'Bakery'],
  ['nightclub', 'Nightclub'],
]

export const CONTRACTS = [
  ['full_time', 'Full time'],
  ['part_time', 'Part time'],
  ['casual', 'Casual'],
  ['seasonal', 'Seasonal'],
  ['temp', 'Temporary'],
]

// Native posts only. No aggregator feed carries shift pattern, which is exactly
// why asking for it is worth something: it is information a jobseeker cannot get
// anywhere else on the board. Multi-value, stored comma separated.
export const SHIFT_PATTERNS = [
  ['daytime', 'Daytime'],
  ['evenings', 'Evenings'],
  ['weekends', 'Weekends'],
  ['early', 'Early mornings'],
  ['late', 'Late nights'],
  ['mixed', 'Mixed rota'],
]

export const PAY_PERIODS = [
  ['hourly', 'Per hour'],
  ['annual', 'Per year'],
]

const LABEL = (pairs) => Object.fromEntries(pairs)
export const SHIFT_PATTERN_LABEL = LABEL(SHIFT_PATTERNS)
export const ROLE_LABEL = LABEL(ROLES)
export const VENUE_LABEL = LABEL(VENUES)
export const CONTRACT_LABEL = LABEL(CONTRACTS)

// ── What a native post has to contain, and what earns Featured ──────────────
//
// Two separate bars, deliberately.
//
// REQUIRED is the floor. Pay and shift pattern are on it because that is where
// the fairness positioning is actually enforced rather than merely claimed, and
// it costs an honest employer nothing.
//
// BONUS is what earns a Featured spell at the top of the board. It has to be
// made of things NOT on the required list, otherwise every post would earn it
// and the reward would mean nothing. These are the fields that make a listing
// genuinely more useful to read, so the incentive and the jobseeker's interest
// point the same way.
export const FEATURED_DAYS = 3
const MIN_DESCRIPTION = 400

// No "role" here on purpose. Job title and role were two ways of asking the
// same question, one free text and one a dropdown, which read as a mistake and
// boxed people in: real hospitality titles are far more varied than any list we
// would write. The title stays free text and role_category is derived from it
// with classifyRole(), exactly as it is for every aggregated listing.
export const REQUIRED_FIELDS = [
  ['employer_name', 'Venue name'],
  ['city', 'Town or city'],
  ['venue_type', 'Venue type'],
  ['title', 'Job title'],
  ['contract_type', 'Contract'],
  ['pay', 'Pay'],
  ['shift_pattern', 'Shift pattern'],
  ['description', 'Description'],
  ['apply', 'How to apply'],
]

const hasPay = (d) => Boolean(d.pay_period) && Number(d.pay_min) > 0
const hasApply = (d) => Boolean((d.apply_url || '').trim() || (d.apply_email || '').trim())

/**
 * shift_pattern is a Postgres text[] column, so it is an ARRAY everywhere:
 * in the form state, in the request body and in the row we insert. This only
 * exists to tolerate a comma separated string arriving from somewhere else,
 * and it always hands back an array. Never join it for storage.
 */
export const toShiftArray = (v) =>
  Array.isArray(v)
    ? v.filter(Boolean)
    : String(v || '').split(',').map((s) => s.trim()).filter(Boolean)

export function missingRequired(d = {}) {
  const present = {
    employer_name: (d.employer_name || '').trim(),
    city: (d.city || '').trim(),
    venue_type: d.venue_type,
    title: (d.title || '').trim(),
    contract_type: d.contract_type,
    pay: hasPay(d),
    shift_pattern: toShiftArray(d.shift_pattern).length > 0,
    description: (d.description || '').trim(),
    apply: hasApply(d),
  }
  return REQUIRED_FIELDS.filter(([k]) => !present[k]).map(([k, label]) => ({ key: k, label }))
}

// Each bonus is a thing a jobseeker actually wants to know, not busywork.
//
// A pay RANGE is deliberately not one of them. A fixed rate ("this is a £15/hr
// role, there is no negotiating") is more transparent than a range, not less,
// and rewarding ranges would push employers into inventing a spread they do not
// mean, or penalise the honest ones. pay_max stays optional and unscored.
export const BONUS_FIELDS = [
  ['description_detail', 'A description of 400 characters or more', (d) => (d.description || '').trim().length >= MIN_DESCRIPTION],
  ['area', 'The area or postcode, so people can judge the commute', (d) => Boolean((d.locality || '').trim() || (d.postcode || '').trim())],
  ['benefits', 'Benefits or perks', (d) => Boolean((d.benefits || '').trim())],
  ['website', 'Your website', (d) => Boolean((d.website || '').trim())],
]

/**
 * Progress toward Featured. Returns the earned/total counts and each item's
 * state, so the form can show live progress and the API can recompute it
 * server side rather than trusting whatever the client claims.
 */
export function completeness(d = {}) {
  const missing = missingRequired(d)
  const bonus = BONUS_FIELDS.map(([key, label, test]) => ({ key, label, done: Boolean(test(d)) }))
  const earned = bonus.filter((b) => b.done).length
  return {
    valid: missing.length === 0,
    missing,
    bonus,
    earned,
    total: bonus.length,
    // Featured is earned only when the floor is met AND every bonus is filled.
    featured: missing.length === 0 && earned === bonus.length,
  }
}

/**
 * Aggregator feeds cut the description at a fixed byte count, so text routinely
 * ends mid-word ("have fun at work, d"). Trim back to a clean boundary: the last
 * full sentence if that keeps most of the text, otherwise the last whole word.
 * Never adds or alters wording, an employer's advert is theirs.
 */
export function tidyExcerpt(text) {
  const s = String(text || '').trim()
  if (!s || /[.!?]["')\]]?$/.test(s)) return s

  const lastStop = Math.max(s.lastIndexOf('. '), s.lastIndexOf('! '), s.lastIndexOf('? '))
  if (lastStop > s.length * 0.55) return s.slice(0, lastStop + 1)
  return `${s.replace(/[\s,;:–—-]+\S*$/, '')}…`
}

/**
 * A listing "shows pay" only if the employer stated it, never an estimate.
 * A zero bound is not a figure: Adzuna reports salary_min = 0 when it only knows
 * an upper bound, which would otherwise render as a fictitious "£0" floor.
 */
export const showsPay = (j) =>
  !j.pay_is_estimated && (Number(j.pay_min) > 0 || Number(j.pay_max) > 0)

export function formatPay(j) {
  if (!showsPay(j)) return null
  const money = (n) =>
    j.pay_period === 'hourly'
      ? `£${Number(n).toFixed(2).replace(/\.00$/, '')}`
      : `£${Math.round(Number(n)).toLocaleString('en-GB')}`
  const unit = j.pay_period === 'hourly' ? '/hr' : '/yr'

  const min = Number(j.pay_min) > 0 ? Number(j.pay_min) : null
  const max = Number(j.pay_max) > 0 ? Number(j.pay_max) : null

  if (min && max && max !== min) return `${money(min)}–${money(max)}${unit}`
  if (min) return `${money(min)}${unit}`
  return `Up to ${money(max)}${unit}` // upper bound only
}
