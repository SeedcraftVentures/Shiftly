// Shared shift conversion helpers used by both UI and API code.

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// 15-min increment time options 00:00 → 23:45
export const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push({
      value: h + m / 60,
      label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    })
  }
}
export const TIME_OPTIONS_END = [...TIME_OPTIONS, { value: 24, label: '24:00' }]

// "07:30" -> 7.5
export function timeStringToDecimal(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h + (m || 0) / 60
}

// 7.5 -> "07:30"
export function decimalToTimeString(d) {
  const h = Math.floor(d)
  const m = Math.round((d - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ["Monday", "Wednesday"] -> [0, 2]
export function dayNamesToIndices(names) {
  if (!Array.isArray(names)) return []
  return names.map(n => DAYS_FULL.indexOf(n)).filter(i => i !== -1)
}

// [0, 2] -> ["Monday", "Wednesday"]
export function indicesToDayNames(indices) {
  if (!Array.isArray(indices)) return []
  return indices.map(i => DAYS_FULL[i]).filter(Boolean)
}

export function decimalTimeToLabel(d) {
  if (d === null || d === undefined) return '--:--'
  const h = Math.floor(d)
  const m = Math.round((d - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function clampHours(h) {
  return Math.max(0, Math.min(24, h))
}

export function formatHours(h) {
  if (h % 1 === 0) return `${h}h`
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  return whole > 0 ? `${whole}h ${mins}m` : `${mins}m`
}

export function getWeekdays() {
  return DAYS_FULL.slice(0, 5)
}

export function getWeekends() {
  return DAYS_FULL.slice(5)
}

export function getDayLabel(days) {
  if (!days || days.length === 0) return '-'
  if (days.length === 7) return 'All days'
  if (days.length === 5 && !days.includes(5) && !days.includes(6)) return 'Weekdays'
  if (days.length === 2 && days.includes(5) && days.includes(6)) return 'Weekends'
  return days.map(d => DAYS_SHORT[d]).join(', ')
}