// Pure shift helpers for the new schema (Shift Patterns + Location/Team Day Hours).
// These operate on decimal hours and day indices (0=Mon … 6=Sun).

import { DAYS_FULL } from '@/app/lib/constants/days'

/**
 * Resolve the effective start/end time for a given team on a given day.
 * Walks: Team Day Hours override → Location Day Hours fallback.
 *
 * @param {string} teamId
 * @param {number} dayIndex — 0=Mon … 6=Sun
 * @param {Array} locationHours — rows from Location Day Hours (day, start_time, end_time as timetz)
 * @param {Array} teamOverrides — rows from Team Day Hours (team_id, day, start_time_override, end_time_override)
 * @returns {{ start: number|null, end: number|null }}
 */
export function resolveHoursForDay(teamId, dayIndex, locationHours, teamOverrides) {
  const dayName = DAYS_FULL[dayIndex]
  if (!dayName) return { start: null, end: null }

  const locRow = locationHours.find(r => r.day === dayName)
  if (!locRow) return { start: null, end: null }

  const teamRow = teamOverrides.find(r => r.team_id === teamId && r.day === dayName)

  const start = timetzToDecimal(teamRow?.start_time_override) ?? timetzToDecimal(locRow.start_time)
  const end = timetzToDecimal(teamRow?.end_time_override) ?? timetzToDecimal(locRow.end_time)

  return { start, end }
}

/**
 * Build a memoization-friendly resolver function.
 * Returns (teamId, dayIndex) => { start, end }
 */
export function buildResolvedHours(locationHours, teamOverrides) {
  const cache = new Map()
  return (teamId, dayIndex) => {
    const key = `${teamId}-${dayIndex}`
    if (cache.has(key)) return cache.get(key)
    const result = resolveHoursForDay(teamId, dayIndex, locationHours, teamOverrides)
    cache.set(key, result)
    return result
  }
}

/**
 * Resolve the anchor time for a shift on a specific day.
 * - Open shifts: start_time anchored to resolved start
 * - Close shifts: end_time anchored to resolved end
 * - Fixed shifts: both times as stored
 */
export function resolveAnchorTime(shift, dayIndex, resolvedHours) {
  const hours = resolvedHours(shift.shift_team, dayIndex)
  const start = shift.shift_type === 'open' ? hours.start : shift.start_time
  const end = shift.shift_type === 'close' ? hours.end : shift.end_time
  return { start, end }
}

/**
 * Get the resolved start/end for a shift across all its days.
 * Returns { start, end, varies } where varies is true if times differ by day.
 */
export function resolveShiftTimes(shift, resolvedHours) {
  if (!shift.days || shift.days.length === 0) {
    return { start: shift.start_time, end: shift.end_time, varies: false, byDay: [] }
  }

  const byDay = shift.days.map(d => ({
    day: d,
    ...resolveAnchorTime(shift, d, resolvedHours),
  }))

  const firstStart = byDay[0].start
  const firstEnd = byDay[0].end
  const varies = byDay.some(d => d.start !== firstStart || d.end !== firstEnd)

  return { start: firstStart, end: firstEnd, varies, byDay }
}

/**
 * Compute shift duration in hours.
 */
export function computeShiftHours(startTime, endTime) {
  if (startTime == null || endTime == null) return 0
  return Math.max(0, endTime - startTime)
}

/**
 * Find coverage gaps for a team on a specific day.
 * Returns array of { start, end } gap windows within the resolved operating hours.
 */
export function getCoverageGaps(shifts, teamId, dayIndex, resolvedHours) {
  const hours = resolvedHours(teamId, dayIndex)
  if (hours.start == null || hours.end == null) return []

  const dayShifts = shifts.filter(
    s => s.shift_team === teamId && s.days && s.days.includes(dayIndex)
  )
  if (dayShifts.length === 0) return [{ start: hours.start, end: hours.end }]

  // Resolve actual times for each shift on this day
  const intervals = dayShifts.map(s => {
    const resolved = resolveAnchorTime(s, dayIndex, resolvedHours)
    return {
      start: resolved.start ?? s.start_time,
      end: resolved.end ?? s.end_time,
    }
  }).sort((a, b) => a.start - b.start)

  const gaps = []
  let cursor = hours.start

  for (const interval of intervals) {
    if (interval.start > cursor) {
      gaps.push({ start: cursor, end: interval.start })
    }
    cursor = Math.max(cursor, interval.end)
  }

  if (cursor < hours.end) {
    gaps.push({ start: cursor, end: hours.end })
  }

  return gaps
}

/**
 * Format a shift's time label for display.
 */
export function formatShiftTimeLabel(startTime, endTime) {
  return `${decimalToLabel(startTime)} - ${decimalToLabel(endTime)}`
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function timetzToDecimal(timetz) {
  if (!timetz) return null
  // "HH:MM:SS" or "HH:MM" → decimal
  const parts = timetz.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1] || '0', 10)
  return h + m / 60
}

function decimalToLabel(d) {
  if (d == null) return '--:--'
  const h = Math.floor(d)
  const m = Math.round((d - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
