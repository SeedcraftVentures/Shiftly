// Shared colour palette, colours are assigned BY SHIFT LENGTH, not by position.
// A 4h shift is ALWAYS the same colour everywhere in the app.
export const PALETTE = [
  { bg: '#FDF2F8', border: '#EC4899', text: '#BE185D', fill: '#EC4899' },  // Pink
  { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9', fill: '#8B5CF6' },  // Purple
  { bg: '#ECFDF5', border: '#10B981', text: '#047857', fill: '#10B981' },  // Teal
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', fill: '#3B82F6' },  // Blue
  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C', fill: '#F97316' },  // Orange
  { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C', fill: '#EF4444' },  // Red
]

// Get a colour by raw index (loops around), use for rota grid per-person colouring
export function getBlockColor(index) {
  return PALETTE[index % PALETTE.length]
}

// Get colour for a specific shift length, consistent everywhere in the app.
// Pass the full shiftLengths array so the index is stable based on sorted position.
// e.g. if shiftLengths = [4, 8, 10] then 4h = Pink, 8h = Purple, 10h = Teal
export function getColorForLength(length, shiftLengths) {
  const sorted = [...shiftLengths].sort((a, b) => a - b)
  const idx = sorted.indexOf(length)
  return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length]
}

// Get colour for a shift block based on its duration and available shift lengths.
// Snaps to the closest matching length for colour lookup.
export function getShiftBlockColor(shiftDurationHrs, shiftLengths) {
  if (!shiftLengths || shiftLengths.length === 0) return PALETTE[0]
  const closest = shiftLengths.reduce((prev, curr) =>
    Math.abs(curr - shiftDurationHrs) < Math.abs(prev - shiftDurationHrs) ? curr : prev
  )
  return getColorForLength(closest, shiftLengths)
}

export const SHIFT_LENGTHS = [4, 6, 8, 10, 12]
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const FULL_DAYS = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
}

// Format decimal hours to display time (e.g. 14.5 → "2:30 PM", 24.75 → "12:45 AM +1")
export function formatTime(h) {
  const nextDay = h >= 24
  const norm = ((h % 24) + 24) % 24
  const hr = Math.floor(norm)
  const min = Math.round((norm - hr) * 60)
  const ampm = hr < 12 ? 'AM' : 'PM'
  const display = hr % 12 || 12
  const suffix = nextDay ? ' +1' : ''
  return min > 0
    ? `${display}:${String(min).padStart(2, '0')} ${ampm}${suffix}`
    : `${display} ${ampm}${suffix}`
}

// Format decimal hours to 24h string (e.g. 14.5 → "14:30")
export function formatTime24(h) {
  const hr = Math.floor(h)
  const min = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// Parse "HH:MM" string to decimal hours
export function parseTime(str) {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return h + (m || 0) / 60
}

// Snap a value to the nearest increment
export function snapTo(value, increment) {
  return Math.round(value / increment) * increment
}

// Calculate shift duration in hours from start_time and end_time strings ("HH:MM")
export function calcShiftDuration(startTime, endTime) {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  let duration = end - start
  if (duration <= 0) duration += 24  // overnight shift
  return duration
}