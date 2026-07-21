// Shared shift-time helpers. Times come out of Postgres as `timetz`
// ("09:00:00+00"), but every client expects "HH:MM".

export const hhmm = (t) => String(t || '').slice(0, 5)

export const toMin = (t) => {
  const [h, m] = hhmm(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Hours between two times, treating end <= start as crossing midnight.
export function durationHours(start, end) {
  let d = toMin(end) - toMin(start)
  if (d <= 0) d += 1440
  return Math.round((d / 60) * 10) / 10
}
