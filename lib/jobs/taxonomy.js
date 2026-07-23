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

// Retail role vocabulary for the retail board's filters and card tags. The keys
// match classifyRetailRole in classify.js.
export const RETAIL_ROLES = [
  ['sales_assistant', 'Sales assistant'],
  ['cashier', 'Checkout'],
  ['stock', 'Stock & merchandising'],
  ['retail_supervisor', 'Supervisor'],
  ['retail_manager', 'Manager'],
]

export const INDUSTRIES = [
  ['hospitality', 'Hospitality'],
  ['retail', 'Retail'],
]

const LABEL = (pairs) => Object.fromEntries(pairs)
export const SHIFT_PATTERN_LABEL = LABEL(SHIFT_PATTERNS)
export const INDUSTRY_LABEL = LABEL(INDUSTRIES)

// City -> URL slug for the /jobs/in/[town] pages. "Glasgow" -> "glasgow",
// "East Dunbartonshire" -> "east-dunbartonshire". Pure, so both the router and
// the query layer share one definition.
export const citySlug = (city) =>
  String(city || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Towns we want a landing page for even before any job is posted there, so the
// URL can be advertised to a local high street to SEED the first postings. A
// target town with no jobs renders a "be the first to post" conversion page
// rather than a 404. Towns not here and not in the live data still 404, so we
// never spawn empty pages for arbitrary slugs. Extend this list freely.
export const TARGET_TOWNS = [
  'Auchterarder', 'Perth', 'Dunfermline', 'Kirkcaldy', 'Dunblane', 'Crieff',
  'St Andrews', 'Callander', 'Pitlochry', 'Bridge of Allan', 'Alloa',
  'Cumbernauld', 'Kilsyth', 'Bathgate', 'Linlithgow', 'Helensburgh',
].map((name) => ({ name, slug: citySlug(name) }))
// One label map covering both industries, so a card can render any role tag.
export const ROLE_LABEL_ALL = LABEL([...ROLES, ...RETAIL_ROLES])
// The role options a filter should offer for a given board.
export const rolesForIndustry = (industry) => (industry === 'retail' ? RETAIL_ROLES : ROLES)
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
// boxed people in: real titles are far more varied than any list we would write.
// The title stays free text and role_category is derived from it.
//
// venue_type is hospitality only (a shop has no pub/restaurant/hotel type), so
// the required set depends on the industry.
export function requiredFields(industry = 'hospitality') {
  return [
    ['employer_name', industry === 'retail' ? 'Business name' : 'Venue name'],
    ['city', 'Town or city'],
    ...(industry === 'retail' ? [] : [['venue_type', 'Venue type']]),
    ['title', 'Job title'],
    ['contract_type', 'Contract'],
    ['pay', 'Pay'],
    ['shift_pattern', 'Shift pattern'],
    ['description', 'Description'],
    ['apply', 'How to apply'],
  ]
}

// something@something.something. Deliberately simple: it rejects obvious junk
// (a single letter, a missing @ or dot) without trying to fully parse RFC 5322,
// which no practical regex does well. Shared by the form, the API and the apply
// check so all three agree.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const hasPay = (d) => Boolean(d.pay_period) && Number(d.pay_min) > 0
// A URL is enough on its own; an apply EMAIL only counts if it is a real email.
// Without the format check, one stray character satisfied "how to apply" and
// even earned the completeness tick.
const hasApply = (d) => Boolean((d.apply_url || '').trim()) || EMAIL_RE.test((d.apply_email || '').trim())

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
  return requiredFields(d.industry).filter(([k]) => !present[k]).map(([k, label]) => ({ key: k, label }))
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

// ── Transparency badges ─────────────────────────────────────────────────────
//
// The badges are the fairness positioning made concrete, and the rule for all of
// them is the same: never award one we cannot stand behind. They are computed,
// not stored, so they can never drift from the pay they describe.

// The REAL Living Wage (Living Wage Foundation), the voluntary rate that signals
// a genuinely fair employer, NOT the lower government National Living Wage. Rates
// are announced each autumn, so this is env-overridable and MUST be reviewed
// annually. Default is the 2024/25 UK rate outside London.
export const REAL_LIVING_WAGE_HOURLY = Number(process.env.NEXT_PUBLIC_LIVING_WAGE_HOURLY || 12.6)
const FT_HOURS_PER_WEEK = 37.5
// The annual salary that clears the living wage at a standard full-time week.
// The filter uses it to match annual-paid rows without a per-row computation.
export const REAL_LIVING_WAGE_ANNUAL = Math.round(REAL_LIVING_WAGE_HOURLY * FT_HOURS_PER_WEEK * 52)

// Effective hourly value of the pay FLOOR. Using the floor (pay_min) means a
// living-wage badge asserts the LOWEST advertised pay clears the bar, so it can
// never over-claim. An annual figure is converted at a standard full-time week;
// if only an upper bound is known the floor is unknown, so this returns null.
export function hourlyFloor(j) {
  const min = Number(j.pay_min)
  if (!(min > 0)) return null
  if (j.pay_period === 'hourly') return min
  if (j.pay_period === 'annual') return min / (FT_HOURS_PER_WEEK * 52)
  return null
}

// Real Living Wage: employer-stated pay whose floor clears the rate. Excludes
// estimates by going through showsPay.
export function meetsLivingWage(j) {
  if (!showsPay(j)) return false
  const h = hourlyFloor(j)
  return h != null && h >= REAL_LIVING_WAGE_HOURLY
}

// Living Hours (Living Wage Foundation standard: guaranteed hours, notice of
// shifts, a contract reflecting real hours). Not derivable from a feed, so it is
// a native self-declaration only, read from a stored flag.
export const meetsLivingHours = (j) => Boolean(j.living_hours)

// Wording matters legally here. These are COMPUTED/self-declared claims about a
// listing, NOT accreditation. The Living Wage Foundation marks ("Living Wage
// Employer", "Living Hours Employer") are licensed trademarks only accredited
// employers may use, so these labels stay descriptive ("Meets living wage",
// "Guaranteed hours") and never imply certification. A separate, verified tier
// cross-referenced against the LWF accredited directory is where the accredited
// language and a source link would belong.
export const BADGE_LABEL = {
  pay: 'Pay shown',
  living_wage: 'Meets living wage',
  living_hours: 'Guaranteed hours',
}

/**
 * The badges a listing has earned, most meaningful last so a single-badge card
 * still shows the strongest signal. Order: pay shown, then living wage, then
 * living hours.
 */
export function badges(j = {}) {
  const out = []
  if (showsPay(j)) out.push('pay')
  if (meetsLivingWage(j)) out.push('living_wage')
  if (meetsLivingHours(j)) out.push('living_hours')
  return out
}
