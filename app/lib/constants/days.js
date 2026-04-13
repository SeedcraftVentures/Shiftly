import { DEFAULT_DAY_HOURS } from './defaults'

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
      ...DEFAULT_DAY_HOURS,
      open: !['Saturday', 'Sunday'].includes(day),
    }
  })
  return h
}