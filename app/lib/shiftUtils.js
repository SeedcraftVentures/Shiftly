// ── Constants ─────────────────────────────────────────────────────────────────

function getCSSVarValue(name) {
  if (typeof window === 'undefined') return '#000'
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value
}

export const PALETTE = [
  getCSSVarValue('--team-purple'),
  getCSSVarValue('--team-green'),
  getCSSVarValue('--team-blue'),
  getCSSVarValue('--team-orange'),
  getCSSVarValue('--team-red'),
  getCSSVarValue('--team-indigo'),
]

export const PALETTE_LIGHT = [
  getCSSVarValue('--team-purple-light'),
  getCSSVarValue('--team-green-light'),
  getCSSVarValue('--team-blue-light'),
  getCSSVarValue('--team-orange-light'),
  getCSSVarValue('--team-red-light'),
  getCSSVarValue('--team-indigo-light'),
]

export const GANTT_START = 7
export const GANTT_END = 23
export const GANTT_HOURS = GANTT_END - GANTT_START
export const DEFAULT_SHIFT_LENGTHS = [4, 6, 8, 10, 12]

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

// ── Shift time calculation ────────────────────────────────────────────────────
import { clampHours } from './timeUtils'

export function applyTimeChange(shift, fixedLock, field, val, openTime, closeTime) {
  let { start, end } = shift
  const val_ = parseFloat(val)

  if (shift.anchor_type === 'open') {
    start = openTime
    if (field === 'end') end = clampHours(val_)
    else if (field === 'length') end = clampHours(openTime + val_)
  } else if (shift.anchor_type === 'close') {
    end = closeTime
    if (field === 'start') start = clampHours(val_)
    else if (field === 'length') start = clampHours(closeTime - val_)
  } else {
    if (fixedLock === 'start') {
      if (field === 'end') end = clampHours(val_)
      else if (field === 'length') end = clampHours(start + val_)
    } else if (fixedLock === 'end') {
      if (field === 'start') start = clampHours(val_)
      else if (field === 'length') start = clampHours(end - val_)
    } else {
      // length locked — window shifts
      const len = end - start
      if (field === 'start') { start = clampHours(val_); end = clampHours(start + len) }
      else if (field === 'end') { end = clampHours(val_); start = clampHours(end - len) }
    }
  }

  if (start >= end) end = clampHours(start + 0.25)
  return { start: clampHours(start), end: clampHours(end) }
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