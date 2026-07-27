// Pure, dependency-free taxonomy + formatters.
//
// Kept separate from query.js on purpose: query.js imports supabaseAdmin (and
// therefore next/headers), which cannot be bundled into a client component. The
// filter bar is a client component and needs these lists, so they live here.

export const PER_PAGE = 25

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

const LABEL = (pairs) => Object.fromEntries(pairs)
export const ROLE_LABEL = LABEL(ROLES)
export const VENUE_LABEL = LABEL(VENUES)
export const CONTRACT_LABEL = LABEL(CONTRACTS)

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
