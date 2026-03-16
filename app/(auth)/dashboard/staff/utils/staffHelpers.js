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

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCurrency(amount, symbol = '£') {
  return `${symbol}${parseFloat(amount).toFixed(2)}`
}

export function formatInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}