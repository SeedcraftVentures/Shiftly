// ── Constants ─────────────────────────────────────────────────────────────────

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DEFAULT_LEGAL_LIMIT = 48

export const TENDENCY_OPTIONS = [
  { value: 'always', label: 'Always' },
  { value: 'never', label: 'Never' },
  { value: 'prefer', label: 'Prefer' },
]

export const SHIFT_TYPE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'open', label: 'Open' },
  { value: 'close', label: 'Close' },
]

export const DAY_PATTERN_OPTIONS = [
  { value: 'all', label: 'All days' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
]

export const INVITE_STATUS_LABELS = {
  none: 'Invite',
  invited: 'Invited',
  connected: 'Connected',
}

export function makeRule() {
  return {
    id: Math.random().toString(36).slice(2),
    tendency: 'always',
    shift_type: 'any',
    days: 'all',
    duration: 'any',
  }
}

export function ruleLabel(rule) {
  const tendency = rule.tendency.charAt(0).toUpperCase() + rule.tendency.slice(1)
  const type = rule.shift_type === 'any' ? 'any shift' : `${rule.shift_type} shifts`
  const days = rule.days === 'all' ? 'all days' : rule.days
  const dur = rule.duration === 'any' ? '' : ` · ${rule.duration}h`
  return `${tendency} · ${type} · ${days}${dur}`
}

// ── Availability summary ──────────────────────────────────────────────────────

function countAvailableFromObject(obj) {
  return Object.values(obj).filter(v => {
    if (typeof v === 'boolean') return v
    if (typeof v === 'object' && v !== null) return v.available === true
    return v === 'available' || v === 'preferred'
  }).length
}

export function getAvailabilitySummary(staff) {
  const grid = staff.availability_grid
  if (grid && typeof grid === 'object') {
    const vals = Object.values(grid)
    if (vals.length === 0) return 'No data'
    const avail = countAvailableFromObject(grid)
    if (avail === 7) return 'All days'
    if (avail === 0) return 'Unavailable'
    return `${avail}d`
  }
  if (staff.availability) {
    try {
      const parsed = typeof staff.availability === 'string'
        ? JSON.parse(staff.availability)
        : staff.availability
      if (typeof parsed === 'object' && parsed !== null) {
        const avail = countAvailableFromObject(parsed)
        if (avail === 7) return 'All days'
        if (avail === 0) return 'Unavailable'
        return `${avail}d`
      }
      if (typeof parsed === 'string') return parsed
    } catch {
      return staff.availability
    }
  }
  return 'No data'
}

// ── Hours validation ──────────────────────────────────────────────────────────

export function validateHours(contracted, max, legalLimit) {
  const errors = {}
  if (contracted < 0) errors.contracted_hours = 'Must be 0 or more'
  if (max < contracted) errors.max_hours = 'Must be ≥ contracted hours'
  if (legalLimit && max > legalLimit) errors.max_hours = `Must be ≤ legal limit (${legalLimit}h)`
  return errors
}

export function validateWage(wage, minWage) {
  if (wage < minWage) return `Must be ≥ minimum wage (£${minWage}/hr)`
  return null
}

// ── Warning detection ─────────────────────────────────────────────────────────

export function getStaffWarnings(allStaff, allShifts, teams) {
  const warnings = []

  allStaff.forEach(staff => {
    const team = teams.find(t => t.id === staff.team_id)
    const teamName = team?.team_name || 'Unknown'
    const teamColor = team?.color || '#9CA3AF'

    if (
      !staff.availability_grid &&
      !staff.availability &&
      (!staff.availability_rules || staff.availability_rules.length === 0)
    ) {
      warnings.push({
        staffId: staff.id, staffName: staff.name,
        teamName, teamColor, type: 'issue', message: 'No availability set',
      })
    }

    const alwaysRules = (staff.availability_rules || []).filter(r => r.tendency === 'always')
    const neverRules = (staff.availability_rules || []).filter(r => r.tendency === 'never')
    alwaysRules.forEach(ar => {
      neverRules.forEach(nr => {
        const dayOverlap = ar.days === 'all' || nr.days === 'all' || ar.days === nr.days
        const typeOverlap = ar.shift_type === 'any' || nr.shift_type === 'any' || ar.shift_type === nr.shift_type
        if (dayOverlap && typeOverlap) {
          warnings.push({
            staffId: staff.id, staffName: staff.name,
            teamName, teamColor, type: 'conflict',
            message: `"${ruleLabel(ar)}" conflicts with "${ruleLabel(nr)}"`,
          })
        }
      })
    })

    if (staff.contracted_hours > staff.max_hours && staff.max_hours > 0) {
      warnings.push({
        staffId: staff.id, staffName: staff.name,
        teamName, teamColor, type: 'issue',
        message: 'Contracted hours exceed max hours',
      })
    }
  })

  return warnings
}

// ── Coverage metrics ──────────────────────────────────────────────────────────

function getPaidHoursLocal(start, end) {
  if (start === null || start === undefined || end === null || end === undefined) return 0
  return Math.max(0, end - start)
}

export function getCoverageMetrics(shifts, staff) {
  const shiftHoursPerWeek = shifts.reduce((sum, shift) => {
    const paid = getPaidHoursLocal(shift.start, shift.end)
    const daysPerWeek = Array.isArray(shift.days) ? shift.days.length : 0
    const staffNeeded = shift.staff || 1
    return sum + (paid * daysPerWeek * staffNeeded)
  }, 0)

  const contractedHours = staff.reduce((sum, s) => sum + (s.contracted_hours || 0), 0)
  const maxCapacityHours = staff.reduce((sum, s) => sum + (s.max_hours || s.contracted_hours || 0), 0)

  const delta = shiftHoursPerWeek - contractedHours
  const deltaFromMax = shiftHoursPerWeek - maxCapacityHours

  let status = 'ok'
  if (deltaFromMax > 0) status = 'shortfall'
  else if (delta > 0) status = 'tight'
  else if (contractedHours > 0 && delta < -contractedHours * 0.3) status = 'surplus'

  let suggestion = null
  if (status === 'shortfall') {
    const hoursNeeded = Math.ceil(deltaFromMax)
    const avgMax = maxCapacityHours / Math.max(staff.length, 1)
    const staffNeeded = Math.ceil(hoursNeeded / Math.max(avgMax, 8))
    suggestion = `Add ${staffNeeded} staff member${staffNeeded !== 1 ? 's' : ''} — approximately ${hoursNeeded}h extra capacity needed to cover all shifts`
  } else if (status === 'tight') {
    const overtime = Math.ceil(delta)
    suggestion = `${overtime}h above contracted hours — staff would need overtime. Consider adding contracted hours or a part-time staff member`
  } else if (status === 'surplus') {
    const excess = Math.abs(Math.ceil(delta))
    suggestion = `${excess}h of contracted staff time not covered by shifts — consider adding shifts or reviewing contracted hours`
  }

  return {
    shiftHoursPerWeek: Math.round(shiftHoursPerWeek * 10) / 10,
    contractedHours,
    maxCapacityHours,
    delta: Math.round(delta * 10) / 10,
    deltaFromMax: Math.round(deltaFromMax * 10) / 10,
    status,
    suggestion,
  }
}

// ── Availability grid helpers ─────────────────────────────────────────────────

export function getDayAvailability(staff, dayIdx) {
  const grid = staff.availability_grid
  if (!grid) return null
  const key = DAYS[dayIdx]
  const val = grid[key]
  if (!val) return null
  if (typeof val === 'object' && val !== null) return val.available === true ? 'available' : 'unavailable'
  return val
}

export function getAvailabilityColor(status) {
  switch (status) {
    case 'available': return { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' }
    case 'unavailable': return { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' }
    case 'preferred': return { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' }
    case 'partial': return { bg: '#FEF9C3', color: '#CA8A04', border: '#FEF08A' }
    default: return { bg: '#F9FAFB', color: '#9CA3AF', border: '#E5E7EB' }
  }
}

export function getAvailableCountForDay(allStaff, dayIdx) {
  return allStaff.filter(s => {
    const status = getDayAvailability(s, dayIdx)
    return status === 'available' || status === 'preferred' || status === 'partial'
  }).length
}

// ── Team colour assignment ────────────────────────────────────────────────────

export const PALETTE = ['#8B5CF6', '#10B981', '#3B82F6', '#F97316', '#EF4444', '#6366F1']
export const PALETTE_LIGHT = ['#F5F3FF', '#ECFDF5', '#EFF6FF', '#FFF7ED', '#FEF2F2', '#EEF2FF']

export function assignTeamColors(teams) {
  return teams.map((t, i) => ({
    ...t,
    color: PALETTE[i % PALETTE.length],
    colorLight: PALETTE_LIGHT[i % PALETTE_LIGHT.length],
  }))
}

// ── Team palette — SINGLE source of truth for team colours. ────────────────────
// Used by Staff, Shifts, Rota Builder and the Dashboard, keyed by team order in
// the /api/teams response so every surface shows the same colour for a team.
export const TEAM_COLORS = ['#FF1F7D', '#6366F1', '#14B8A6', '#F59E0B', '#0EA5E9', '#8B5CF6', '#EC4899', '#10B981']
export const teamColor = (i) => TEAM_COLORS[i % TEAM_COLORS.length]

// ── Coverage engine — SINGLE source for "can our staff cover the shifts?" ───────
// The Staff page and the Dashboard MUST answer this identically. Key rule: required
// hours count OPEN DAYS only (stale closed-day shift entries don't inflate demand),
// and the headline verdict is `maxCapacity >= required` (coverableAtMax).
const COV_ALL = [0, 1, 2, 3, 4, 5, 6]
export function cfgFromLocation(location) {
  const business = location?.business || { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: null }
  const openDays = COV_ALL.filter((d) => business[d])
  return { business, openDays }
}
// Map a raw /api/staff row into the coverage shape (matches the Staff page's fromApi).
export const mapStaffForCoverage = (r) => ({ id: r.id, team_id: r.team_id, name: r.name, role: r.role, contracted: r.contracted_hours || 0, max: r.max_hours || 0, wage: r.hourly_rate, keyholder: r.keyholder, avail: r.availability || {} })
export function windowForDay(s, d, cfg) { const a = s.avail?.[d]; if (!a) return null; return a === true ? cfg.business[d] : a }
export function canWork(s, d, sh, cfg) { const w = windowForDay(s, d, cfg); if (!w) return false; return w[0] <= sh.start + 0.001 && w[1] >= sh.end - 0.001 }
const openDayCountCov = (days, openDays) => days.filter((d) => openDays.includes(d)).length
export function requiredHours(shifts, cfg) { return shifts.reduce((a, s) => a + (s.end - s.start) * s.staff * openDayCountCov(s.days, cfg.openDays), 0) }
export function staffing(staff, shifts, cfg) {
  let demand = 0, filled = 0
  const short = []
  for (const sh of shifts) {
    for (const d of sh.days) {
      if (!cfg.openDays.includes(d)) continue
      demand += sh.staff
      const q = staff.filter((st) => canWork(st, d, sh, cfg) && (!sh.keyholder || st.keyholder))
      filled += Math.min(q.length, sh.staff)
      if (q.length < sh.staff) short.push({ day: d, name: sh.name, need: sh.staff, have: q.length, kh: sh.keyholder, start: sh.start, end: sh.end })
    }
  }
  return { demand, filled, pct: demand ? Math.round((filled / demand) * 100) : 100, short }
}
export function readiness(staff, shifts, cfg) {
  const cov = staffing(staff, shifts, cfg)
  const req = requiredHours(shifts, cfg)
  const contracted = staff.reduce((a, s) => a + s.contracted, 0)
  const maxh = staff.reduce((a, s) => a + s.max, 0)
  const capacityPct = req ? Math.min(100, Math.round((maxh / req) * 100)) : 100
  const coverableAtMax = maxh >= req, withinContract = contracted >= req
  return {
    overallPct: Math.min(cov.pct, capacityPct), short: cov.short,
    ready: cov.short.length === 0 && coverableAtMax,
    contracted, maxh, req, coverableAtMax, withinContract,
    overContractH: coverableAtMax && !withinContract ? req - contracted : 0,
    shortAtMaxH: Math.max(0, req - maxh),
  }
}

// Total hours a staff member is actually available across the open week — the ceiling on
// what they can ever work. Used to fail-safe: availability must cover contracted hours.
export function availableHours(s, cfg) {
  let h = 0
  for (const d of cfg.openDays) {
    const w = windowForDay(s, d, cfg)
    if (w) h += w[1] - w[0]
  }
  return Math.round(h * 10) / 10
}

// ── Coverage bottlenecks — catch the "looks covered per day, but no valid weekly rota
// fits inside everyone's max hours" case (e.g. one person available every day while
// teammates are weekday-/weekend-only, so that person would have to work too many days).
// Returns [{ name, essential, maxDays }] for staff who'd be over-worked.
export function coverageBottlenecks(staff, shifts, cfg) {
  const slotsByDay = {}
  let totalSlots = 0, totalHours = 0
  for (const sh of (shifts || [])) {
    for (const d of (sh.days || [])) {
      if (!cfg.openDays.includes(d)) continue
      const need = sh.staff || 1
      slotsByDay[d] = (slotsByDay[d] || 0) + need
      totalSlots += need
      totalHours += (sh.end - sh.start) * need
    }
  }
  if (!totalSlots) return []
  const avgLen = totalHours / totalSlots
  const days = Object.keys(slotsByDay).map(Number)
  const out = []
  for (const s of (staff || [])) {
    const maxDays = Math.floor((s.max || 48) / Math.max(avgLen, 1))
    let essential = 0
    for (const d of days) {
      const availCount = staff.filter((x) => x.avail && x.avail[d]).length
      if (availCount <= slotsByDay[d] && s.avail && s.avail[d]) essential++
    }
    if (essential > maxDays) out.push({ id: s.id, name: s.name, essential, maxDays })
  }
  return out
}

// Keyholder over-concentration: more keyholder-required shift hours than the keyholders
// are contracted for, so keyholders get forced into overtime while non-keyholders fall
// short of their contracts (the "40/16" symptom). Returns { khHours, khContracted, promote }
// or null. (The no-keyholder-at-all case is handled by the rota's keyholder compliance flag.)
export function keyholderBottleneck(staff, shifts, cfg) {
  let khHours = 0
  for (const sh of (shifts || [])) {
    if (!sh.keyholder) continue
    for (const d of (sh.days || [])) if (cfg.openDays.includes(d)) khHours += (sh.end - sh.start) * (sh.staff || 1)
  }
  if (khHours <= 0) return null
  const keyholders = (staff || []).filter((s) => s.keyholder)
  if (keyholders.length === 0) return null
  const khContracted = keyholders.reduce((a, s) => a + (s.contracted || 0), 0)
  if (khHours <= khContracted + 0.5) return null
  const promote = (staff || []).filter((s) => !s.keyholder).sort((a, b) => (b.contracted || 0) - (a.contracted || 0))[0]
  return { khHours: Math.round(khHours), khContracted, promote: promote ? { id: promote.id, name: promote.name } : null }
}

// ── Schedule coverage — the OTHER coverage question: do the SHIFTS span the hours? ──
// Location-wide (union of every team's shifts) vs the operating window per open day,
// plus a keyholder-present-at-open/close check pooled across ALL keyholders (any team).
// This is independent of staffing: it asks whether the rota itself is complete.
function gapsInWindow(ranges, winStart, winEnd) {
  const clipped = ranges
    .filter((r) => r[1] > winStart + 0.001 && r[0] < winEnd - 0.001)
    .map((r) => [Math.max(r[0], winStart), Math.min(r[1], winEnd)])
    .sort((a, b) => a[0] - b[0])
  const gaps = []; let cursor = winStart
  for (const [a, b] of clipped) { if (a > cursor + 0.001) gaps.push([cursor, a]); cursor = Math.max(cursor, b) }
  if (cursor < winEnd - 0.001) gaps.push([cursor, winEnd])
  return gaps
}
const keyAvailableAt = (s, d, t, cfg) => { const w = windowForDay(s, d, cfg); return !!w && w[0] <= t + 0.001 && w[1] >= t - 0.001 }
export function scheduleCoverage(shifts, staff, cfg) {
  const keyholders = (staff || []).filter((s) => s.keyholder)
  const days = {}
  let windowH = 0, gapH = 0
  const dayGaps = [], keyGaps = []
  for (const d of cfg.openDays) {
    const win = cfg.business[d]; if (!win) continue
    const [ws, we] = win
    windowH += we - ws
    const ranges = (shifts || []).filter((s) => s.days.includes(d)).map((s) => [s.start, s.end])
    const gaps = gapsInWindow(ranges, ws, we)
    gapH += gaps.reduce((a, [x, y]) => a + (y - x), 0)
    const openKey = keyholders.some((s) => keyAvailableAt(s, d, ws, cfg))
    const closeKey = keyholders.some((s) => keyAvailableAt(s, d, we, cfg))
    days[d] = { window: [ws, we], gaps, openKey, closeKey, covered: gaps.length === 0 }
    for (const g of gaps) dayGaps.push({ day: d, from: g[0], to: g[1] })
    if (!openKey) keyGaps.push({ day: d, when: 'open', time: ws })
    if (!closeKey) keyGaps.push({ day: d, when: 'close', time: we })
  }
  return {
    days, windowH: Math.round(windowH * 10) / 10, gapH: Math.round(gapH * 10) / 10,
    coveredPct: windowH ? Math.max(0, (windowH - gapH) / windowH) : 1,
    dayGaps, keyGaps, hasGaps: gapH > 0.01, hasKeyGaps: keyGaps.length > 0,
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCurrency(amount, symbol = '£') {
  return `${symbol}${parseFloat(amount).toFixed(2)}`
}

export function formatInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}