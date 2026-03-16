// ── Constants ─────────────────────────────────────────────────────────────────

export const PALETTE = ['#8B5CF6', '#10B981', '#3B82F6', '#F97316', '#EF4444', '#6366F1']
export const PALETTE_LIGHT = ['#F5F3FF', '#ECFDF5', '#EFF6FF', '#FFF7ED', '#FEF2F2', '#EEF2FF']

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const GANTT_START = 7
export const GANTT_END = 23
export const GANTT_HOURS = GANTT_END - GANTT_START
export const DEFAULT_SHIFT_LENGTHS = [4, 6, 8, 10, 12]

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

// ── Time helpers ──────────────────────────────────────────────────────────────

export function timeStringToDecimal(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h + (m || 0) / 60
}

export function decimalToLabel(d) {
  if (d === null || d === undefined) return '--:--'
  const h = Math.floor(d)
  const m = Math.round((d - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function clamp(h) {
  return Math.max(0, Math.min(24, h))
}

// ── Day helpers ───────────────────────────────────────────────────────────────

export function getDayLabel(days) {
  if (!days || days.length === 0) return '—'
  if (days.length === 7) return 'All days'
  if (days.length === 5 && !days.includes(5) && !days.includes(6)) return 'Weekdays'
  if (days.length === 2 && days.includes(5) && days.includes(6)) return 'Weekends'
  return days.map(d => DAYS[d]).join(', ')
}

// ── Break / hours helpers ─────────────────────────────────────────────────────

// Paid hours = the scheduled shift length (end - start), always.
// An unpaid break means staff are on-site longer — it does NOT reduce pay.
// A paid break is within the scheduled time — no effect on either.
export function getPaidHours(start, end) {
  return end - start
}

// Total on-site time = shift length + break duration if unpaid
export function getOnSiteHours(start, end, breakMins, breakType) {
  const shiftLength = end - start
  if (breakType === 'unpaid' && breakMins > 0) return shiftLength + breakMins / 60
  return shiftLength
}

export function formatHours(h) {
  if (h % 1 === 0) return `${h}h`
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  return whole > 0 ? `${whole}h ${mins}m` : `${mins}m`
}

// ── Shift time calculation ────────────────────────────────────────────────────

export function applyTimeChange(shift, fixedLock, field, val, openTime, closeTime) {
  let { start, end } = shift
  const val_ = parseFloat(val)

  if (shift.anchor_type === 'open') {
    start = openTime
    if (field === 'end') end = clamp(val_)
    else if (field === 'length') end = clamp(openTime + val_)
  } else if (shift.anchor_type === 'close') {
    end = closeTime
    if (field === 'start') start = clamp(val_)
    else if (field === 'length') start = clamp(closeTime - val_)
  } else {
    if (fixedLock === 'start') {
      if (field === 'end') end = clamp(val_)
      else if (field === 'length') end = clamp(start + val_)
    } else if (fixedLock === 'end') {
      if (field === 'start') start = clamp(val_)
      else if (field === 'length') start = clamp(end - val_)
    } else {
      // length locked — window shifts
      const len = end - start
      if (field === 'start') { start = clamp(val_); end = clamp(start + len) }
      else if (field === 'end') { end = clamp(val_); start = clamp(end - len) }
    }
  }

  if (start >= end) end = clamp(start + 0.25)
  return { start: clamp(start), end: clamp(end) }
}

// ── Coverage / gap detection ──────────────────────────────────────────────────

export function getTeamGaps(allShifts, teamId, dayIdx) {
  const dayShifts = allShifts.filter(s => s.team_id === teamId && s.days.includes(dayIdx))
  if (dayShifts.length === 0) return []

  const slots = GANTT_HOURS * 4
  const covered = new Array(slots).fill(false)

  dayShifts.forEach(s => {
    const startSlot = Math.round((Math.max(s.start, GANTT_START) - GANTT_START) * 4)
    const endSlot = Math.round((Math.min(s.end, GANTT_END) - GANTT_START) * 4)
    for (let i = startSlot; i < endSlot; i++) {
      if (i >= 0 && i < slots) covered[i] = true
    }
  })

  const gaps = []
  let gs = null
  covered.forEach((c, i) => {
    if (!c && gs === null) gs = i
    if (c && gs !== null) {
      gaps.push({ s: GANTT_START + gs / 4, e: GANTT_START + i / 4 })
      gs = null
    }
  })
  if (gs !== null) gaps.push({ s: GANTT_START + gs / 4, e: GANTT_END })
  return gaps
}

// ── Team colour assignment ────────────────────────────────────────────────────

export function assignTeamColors(teams) {
  return teams.map((t, i) => ({
    ...t,
    color: PALETTE[i % PALETTE.length],
    colorLight: PALETTE_LIGHT[i % PALETTE_LIGHT.length],
  }))
}