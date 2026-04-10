export const DAYS_FULL = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]

export const DAYS_SHORT = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
]

export function getWeekdays() {
  return DAYS_FULL.slice(0, 5)
}

export function getWeekends() {
  return DAYS_FULL.slice(5)
}

export function defaultHours() {
  const h = {}
  DAYS_FULL.forEach(day => {
    h[day] = {
      open: !['Saturday', 'Sunday'].includes(day),
      opening: '09:00',
      first_shift: '09:00',
      last_shift: '17:00',
      closing: '17:00',
    }
  })
  return h
}
