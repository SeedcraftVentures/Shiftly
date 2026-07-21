// Shared normalisation for every job source. Feeds arrive as free text, so the
// filters on /jobs only work if every connector runs its rows through here.
//
// Rule lists are ordered. FIRST MATCH WINS, so put specific phrases above the
// generic ones they contain ("kitchen porter" before "kitchen", "bar" before the
// seniority fallbacks).

const norm = (s) => ` ${String(s || '').toLowerCase().replace(/[^a-z0-9&\s]/g, ' ').replace(/\s+/g, ' ').trim()} `

// ── Role ────────────────────────────────────────────────────────────────────
// Function beats seniority: "Kitchen Team Leader" is a kitchen job to someone
// filtering for kitchen work, so the function rules sit above supervisor/management.
// Only titles with NO function word ("Team Leader", "General Manager") fall through.
const ROLE_RULES = [
  ['kp',           ['kitchen porter', ' kp ', 'dishwasher', 'pot wash', 'kitchen assistant', 'kitchen team member']],
  ['kitchen',      ['chef', 'cook', 'kitchen', 'commis', 'sous', 'larder', 'grill']],
  ['barista',      ['barista', 'coffee']],
  ['bar',          ['bar staff', 'bartender', 'bar tender', 'bar & waiting', 'bar and waiting', 'bar back', 'mixologist', 'bar ']],
  ['waiting',      ['waiting', 'waiter', 'waitress', 'server', 'front of house', ' foh ', 'runner', 'wait staff']],
  ['host',         ['host', 'hostess', 'greeter', 'receptionist', 'reception']],
  ['housekeeping', ['housekeep', 'cleaner', 'cleaning', 'room attendant', 'room assistant', 'linen', 'spa attendant']],
  ['supervisor',   ['supervisor', 'team leader', 'shift leader', 'shift lead', 'duty manager']],
  ['management',   ['general manager', 'deputy manager', 'assistant manager', 'manager', 'management']],
  // Generic front-line hospitality titles. Last, so anything more specific wins.
  // these are the catch-all the chains use ("Team Member", "Crew Member") and
  // without them ~20% of real listings fall through to 'other'.
  ['team_member',  ['team member', 'crew member', 'team mate', 'general assistant', 'food & beverage',
                    'food and beverage', ' f&b ', 'guest service', 'kiosk assistant', 'catering assistant']],
]

export function classifyRole(title) {
  const t = norm(title)
  for (const [role, needles] of ROLE_RULES) {
    if (needles.some((n) => t.includes(n))) return role
  }
  return 'other'
}

// ── Venue type ──────────────────────────────────────────────────────────────
// Brand is the strongest signal when a source gives one (Greene King exposes it as
// a custom field), so it's checked before free-text keywords.
const BRAND_VENUE = {
  'hungry horse': 'pub',
  'farmhouse inns': 'pub',
  'pub & grill': 'pub',
  'pub & social': 'pub',
  'metro pub co': 'pub',
  'heritage': 'pub',
  'urban': 'pub', // Greene King's city-centre segment, still pubs not bars
  'greene king': 'pub',
  'chef & brewer': 'pub',
  'flaming grill': 'pub',
}

// Hotel groups whose brand name carries no "hotel" keyword, without these,
// Maldron / Clayton / Kimpton / Hampton by Hilton all fall through to 'other'.
const HOTEL_BRANDS = ['maldron', 'clayton', 'kimpton', 'hilton', 'marriott', 'radisson', 'ibis', 'novotel',
  'mercure', 'accor', 'jurys', 'malmaison', 'hotel indigo', 'ihg', 'holiday inn', 'apex', 'valor hospitality',
  'premier inn', 'whitbread', 'travelodge', 'village hotel', 'dalata']

const VENUE_RULES = [
  ['hotel',      [...HOTEL_BRANDS, 'hotel', ' inn ', 'lodge', 'resort', 'spa']],
  ['nightclub',  ['nightclub', 'night club']],
  ['cafe',       ['cafe', 'coffee', 'costa', 'starbucks', 'caffe']],
  ['bakery',     ['bakery', 'bakers', 'greggs', 'patisserie']],
  ['qsr',        ['fast food', 'takeaway', 'drive thru', 'drive-thru', 'mcdonald', 'kfc', 'burger king', 'subway', 'nando']],
  // Contract caterers, big employers whose names carry no venue keyword.
  ['catering',   ['sodexo', 'compass group', 'compass uk', 'elior', 'aramark', 'baxterstorey',
                  'ch&co', 'bartlett mitchell', 'catering', 'events', 'banqueting', 'contract catering']],
  ['pub',        ['pub', 'tavern', 'arms', 'brewery', 'alehouse']],
  ['bar',        ['bar', 'cocktail', 'lounge']],
  ['restaurant', ['restaurant', 'brasserie', 'bistro', 'grill', 'kitchen', 'dining']],
]

export function classifyVenue({ brand, employerName, address, title } = {}) {
  const b = String(brand || '').toLowerCase()
  for (const [key, venue] of Object.entries(BRAND_VENUE)) {
    if (b.includes(key)) return venue
  }
  // Address first: "Wellington Hotel - Nigg" is a far better signal than the job title.
  const haystack = norm([address, employerName, brand, title].filter(Boolean).join(' '))
  for (const [venue, needles] of VENUE_RULES) {
    if (needles.some((n) => haystack.includes(n))) return venue
  }
  return 'other'
}

// ── Contract ────────────────────────────────────────────────────────────────
const CONTRACT_RULES = [
  ['casual',    ['zero hour', 'zero-hour', 'casual', 'bank', 'as and when']],
  ['seasonal',  ['seasonal', 'summer', 'christmas', 'festive']],
  ['temp',      ['temporary', 'temp ', 'fixed term', 'fixed-term', 'contract']],
  ['part_time', ['part time', 'part-time', 'parttime']],
  ['full_time', ['full time', 'full-time', 'fulltime', 'permanent']],
]

export function classifyContract(raw) {
  const t = norm(raw)
  for (const [contract, needles] of CONTRACT_RULES) {
    if (needles.some((n) => t.includes(n))) return contract
  }
  return null
}

// ── Experience ──────────────────────────────────────────────────────────────
// TITLE ONLY, deliberately. Inferring from ad body does not work: chain ads are
// boilerplate-dominated (39 of 40 sampled Greene King ads mention "apprentice"
// in their perks blurb), so body matching produces confident nonsense that also
// varies with wherever you truncate. Title signals are reliable; everything else
// returns null and is simply excluded from the experience filter.
export function classifyExperience(title) {
  const t = norm(title)
  if (/(head chef|sous chef|general manager|deputy manager|senior |lead )/.test(t)) return 'experienced'
  if (/(apprentice|trainee|graduate)/.test(t)) return 'none'
  return null
}

// ── Pay ─────────────────────────────────────────────────────────────────────
// Aggregators normalise everything to an annual figure, so an £12.50/hr kitchen
// porter arrives as "£26,000", meaningless to a shift worker, who thinks and
// negotiates in hourly rates.
//
// The ad text usually states the real basis ("£12.50 per hour", "up to £31,320
// per annum"), so we parse that in preference to the normalised number. A figure
// lifted from the employer's own wording is also genuinely employer-STATED, which
// is what the transparency badge requires, unlike an aggregator's estimate.
const NUM = String.raw`£\s*([\d,]+(?:\.\d{1,2})?)`
const RANGE = new RegExp(`${NUM}\\s*(?:-|–|—|to)\\s*${NUM}`, 'i')

// "£11.44ph" has no word boundary between the digit and the p, so \bp\.?h\b
// can never fire there, the \dph alternative covers it.
const HOURLY_CUE = /(per hour|an hour|each hour|\/\s*hour|\/\s*hr|\bp\.?h\b|\dp\.?h\b|hourly)/i
const ANNUAL_CUE = /(per annum|\bp\.?a\.?\b|per year|a year|annually|annum|salary of)/i

const num = (s) => Number(String(s).replace(/,/g, ''))
const cueIn = (s) => (HOURLY_CUE.test(s) ? 'hourly' : ANNUAL_CUE.test(s) ? 'annual' : null)

/**
 * Pull an employer-stated pay figure out of ad text.
 * Ranges are checked before single figures, otherwise "£12.21 - £14.00 per hour"
 * matches only the upper bound and reports it as the minimum, which overstates
 * the floor. On a board that trades on fairness, pay must never read high.
 * @returns {{min:number,max:number|null,period:'hourly'|'annual'}|null}
 */
export function parsePayFromText(text) {
  if (!text) return null
  const s = String(text)

  // Pass 1, ranges, with the cue allowed to trail the pair.
  const rangeRe = new RegExp(`${NUM}\\s*(?:-|–|—|to)\\s*${NUM}([^.]{0,25})`, 'gi')
  let m
  while ((m = rangeRe.exec(s)) !== null) {
    const period = cueIn(m[3] || '')
    if (!period) continue
    const min = num(m[1])
    const max = num(m[2])
    if (plausible(min, period) && plausible(max, period) && max >= min) return { min, max, period }
  }

  // Pass 2, a single figure with its cue. The window may span a following "£"
  // so we don't stop short, but the range pass above has already claimed pairs.
  const oneRe = new RegExp(`${NUM}(.{0,30})`, 'gi')
  while ((m = oneRe.exec(s)) !== null) {
    const period = cueIn(m[2] || '')
    if (!period) continue
    const min = num(m[1])
    if (plausible(min, period)) return { min, max: null, period }
  }
  return null
}

// Guard against picking up unrelated numbers (bonuses, tips totals, "£1,000
// referral bonus"). UK hospitality hourly sits roughly £10-£40; annual £12k-£150k.
function plausible(v, period) {
  if (!Number.isFinite(v)) return false
  return period === 'hourly' ? v >= 8 && v <= 60 : v >= 10000 && v <= 200000
}

// ── Place names ─────────────────────────────────────────────────────────────
// Adzuna's council-area names read badly as city labels ("County Stirling",
// "Falkirk County"). Tidy them for display without changing what we filter on.
export function tidyCity(city) {
  if (!city) return null
  return String(city)
    .replace(/^County\s+/i, '')
    .replace(/\s+County$/i, '')
    .replace(/\s+City$/i, '')
    .trim()
}

// ── Agencies ────────────────────────────────────────────────────────────────
// Recruitment agencies advertise heavily in Adzuna's hospitality category. Their
// listings are legitimate for jobseekers, so we keep them on the board, but they
// are NOT sellable leads (they don't run a rota), so they're flagged and excluded
// from the Folk sync and from employer outreach.
const AGENCY_SIGNALS = [
  'recruitment', 'recruiting', 'recruiters', 'staffing', 'resourcing', 'personnel',
  'blue arrow', 'berkeley scott', 'off to work', 'adecco', 'randstad', 'hays',
  'reed specialist', 'manpower', 'search consultancy', 'talent', 'appointments',
  'workforce solutions', 'staff solutions', 'employment agency',
  'staffline', 'pertemps', 'brook street', 'gi group', 'zachary daniels',
]

// Names that only mean "agency" when they are the WHOLE employer name. Adzuna
// sends Search Consultancy as plain "Search", but a substring rule on that word
// would also swallow any venue with "search" in its name. Matched exactly instead.
const AGENCY_EXACT = new Set(['search', 'reed', 'talent'])

export function isAgency(employerName) {
  const t = norm(employerName)
  if (AGENCY_EXACT.has(t.trim())) return true
  return AGENCY_SIGNALS.some((s) => t.includes(s))
}

// ── Non-hospitality noise ───────────────────────────────────────────────────
// Adzuna's "Hospitality & Catering" category is imperfect, it surfaces Army
// recruitment, recruitment consultants and care work. These aren't hospitality
// venues and don't belong on the board.
const NOT_HOSPITALITY = [
  'recruitment consultant', 'reserve officer', 'army', 'royal navy', 'raf ',
  'care home', 'care assistant', 'support worker', 'healthcare assistant',
  'nurse', 'teaching', 'driver', 'warehouse', 'security officer',
  // Hotels advertise their leisure clubs in the same category. Spa therapists
  // work rotas so they stay, but these aren't hospitality roles.
  'fitness instructor', 'personal trainer', 'lifeguard', 'swimming teacher',
]

// Note on employers that are not hospitality businesses (care homes, car
// dealers, hospitals): their CATERING roles stay on the board deliberately. A
// kitchen assistant post is a kitchen assistant post, and the contract caterers
// already here (Sodexo, Elior, BaxterStorey, Compass) staff exactly these sites.
// Filtering by employer name would keep one and drop the other for no reason.
// The rules above still strip the care ROLES themselves.
export function isHospitality({ title, employerName } = {}) {
  const t = norm(`${title || ''} ${employerName || ''}`)
  return !NOT_HOSPITALITY.some((s) => t.includes(s))
}

// ── Slug ────────────────────────────────────────────────────────────────────
// Slugs are unique-indexed, so the source id suffix guarantees no collision
// between two "Chef" roles at the same employer in the same town.
export function buildSlug({ title, employerName, city, sourceId }) {
  const part = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const tail = String(sourceId || '').slice(-6)
  return [part(title), part(employerName), part(city), tail].filter(Boolean).join('-').slice(0, 180)
}
