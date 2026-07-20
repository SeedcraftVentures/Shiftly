'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTheme, LabCanvas, Card, Ring, Pill, Btn, Switch, Icon, Ic, FONT, EASE, PINK } from '../_apple/kit'

// ════════════════════════════════════════════════════════════════════════════
//  SHIFTS — UX SANDBOX v1 (Apple-esque · mock data only, nothing saves)
//  Single team: inspector · shift list · week-at-a-glance (+ gap fixes)
//  All teams: coverage matrix · per-team colour · click a row to drill in
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4]
const WEEKEND = [5, 6]
const BUSINESS = { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [10, 16], 6: null }
const OPEN_DAYS = ALL.filter((d) => BUSINESS[d])
const TEAM_OPEN = 9, TEAM_CLOSE = 17, DOM = [9, 17]

const TEAMS = [
  { id: 'foh', name: 'Front of House', color: PINK },
  { id: 'kit', name: 'Kitchen', color: '#5E5CE6' },
  { id: 'mgmt', name: 'Management', color: '#30B0C7' },
]
const teamColor = (id) => TEAMS.find((t) => t.id === id)?.color || PINK
const INITIAL_SHIFTS = [
  { id: 's1', team: 'foh', name: 'Opener', start: 9, end: 13, days: [0, 1, 2, 3, 4, 5], staff: 2, keyholder: true },
  { id: 's2', team: 'foh', name: 'Closer', start: 13, end: 17, days: [0, 1, 2, 3, 4], staff: 2, keyholder: true },
  { id: 's3', team: 'kit', name: 'Prep', start: 9, end: 14, days: [0, 1, 2, 3, 4], staff: 1, keyholder: false },
  { id: 's4', team: 'kit', name: 'Service', start: 12, end: 17, days: [0, 1, 2, 3, 4, 5], staff: 2, keyholder: false },
  { id: 's5', team: 'mgmt', name: 'Duty Manager', start: 9, end: 17, days: [0, 1, 2, 3, 4], staff: 1, keyholder: true },
]

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(h) {
  const hr = Math.floor(h), m = Math.round((h - hr) * 60)
  const ap = hr < 12 || hr === 24 ? 'am' : 'pm'
  let hh = hr % 12; if (hh === 0) hh = 12
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`
}
const norm = (a) => [...a].sort((x, y) => x - y).join(',')
function activePreset(days) {
  const s = norm(days)
  if (s === norm(OPEN_DAYS)) return 'all'
  if (s === norm(WEEKDAYS.filter((d) => OPEN_DAYS.includes(d)))) return 'weekdays'
  if (s === norm(WEEKEND.filter((d) => OPEN_DAYS.includes(d)))) return 'weekend'
  return null
}
function designation(s) {
  if (s.start <= TEAM_OPEN + 0.01) return 'Opening'
  if (s.end >= TEAM_CLOSE - 0.01) return 'Closing'
  return 'Regular'
}
function completeness(s) {
  let n = 0
  if (s.name && s.name.trim() && s.name !== 'New shift') n++
  if (s.days.length) n++; if (s.staff >= 1) n++; if (s.end > s.start) n++
  return n / 4
}
function dayGapsFor(shifts, d) {
  const bh = BUSINESS[d]; if (!bh) return []
  const [open, close] = bh
  const ranges = shifts.filter((s) => s.days.includes(d)).map((s) => [Math.max(s.start, open), Math.min(s.end, close)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0])
  const gaps = []; let cursor = open
  for (const [a, b] of ranges) { if (a > cursor) gaps.push([cursor, a]); cursor = Math.max(cursor, b) }
  if (cursor < close) gaps.push([cursor, close])
  return gaps
}
function teamGaps(shifts) {
  const out = []
  for (const d of OPEN_DAYS) for (const [from, to] of dayGapsFor(shifts, d)) out.push({ day: d, from, to })
  return out
}
function coveragePct(shifts) {
  let open = 0
  for (const d of OPEN_DAYS) open += BUSINESS[d][1] - BUSINESS[d][0]
  const gapHours = teamGaps(shifts).reduce((s, g) => s + (g.to - g.from), 0)
  return open ? Math.round(((open - gapHours) / open) * 100) : 100
}
function dayCoverage(shifts, d) {
  const bh = BUSINESS[d]; if (!bh) return null
  const total = bh[1] - bh[0]
  const gap = dayGapsFor(shifts, d).reduce((s, [a, b]) => s + (b - a), 0)
  return total ? (total - gap) / total : 1
}
function suggestFor(shifts, gap) {
  const before = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.end - gap.from) < 0.01)
  const after = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.start - gap.to) < 0.01)
  if (before) return { label: `Extend “${before.name}” to ${fmt(gap.to)}`, kind: 'end', target: before.id, value: gap.to }
  if (after) return { label: `Start “${after.name}” at ${fmt(gap.from)}`, kind: 'start', target: after.id, value: gap.from }
  return { label: `Add a ${fmt(gap.from)}–${fmt(gap.to)} shift`, kind: 'add', day: gap.day, from: gap.from, to: gap.to }
}

// ── themed form controls ─────────────────────────────────────────────────────
function FieldLabel({ T, children }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 9 }}>{children}</div>
}
function Stepper({ T, value, onChange, min, max }) {
  const btn = (label, on, side) => (
    <button onClick={on} style={{ width: 38, height: 38, border: 'none', background: T.inset, color: T.body, cursor: 'pointer', fontSize: 18, borderRadius: side === 'l' ? '999px 0 0 999px' : '0 999px 999px 0', transition: `background .2s ${EASE}` }}
      onMouseEnter={(e) => e.currentTarget.style.background = T.track} onMouseLeave={(e) => e.currentTarget.style.background = T.inset}>{label}</button>
  )
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: T.inset }}>
      {btn('−', () => onChange(Math.max(min, value - 1)), 'l')}
      <div style={{ minWidth: 46, textAlign: 'center', fontSize: 15, fontWeight: 700, color: T.ink }}>{value}</div>
      {btn('+', () => onChange(Math.min(max, value + 1)), 'r')}
    </div>
  )
}
function DayPicker({ T, days, onChange, accent }) {
  const preset = activePreset(days)
  const toggle = (i) => { if (!OPEN_DAYS.includes(i)) return; onChange(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b)) }
  const pbtn = (label, set, key) => (
    <button key={key} onClick={() => onChange(set.filter((d) => OPEN_DAYS.includes(d)))}
      style={{ fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', border: 'none', fontFamily: FONT,
        background: preset === key ? accent : T.inset, color: preset === key ? '#fff' : T.muted, transition: `all .2s ${EASE}` }}>{label}</button>
  )
  return (
    <div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>{pbtn('All', ALL, 'all')}{pbtn('Weekdays', WEEKDAYS, 'weekdays')}{pbtn('Weekend', WEEKEND, 'weekend')}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {DAYS.map((d, i) => {
          const closed = !OPEN_DAYS.includes(i), on = days.includes(i)
          return (
            <button key={i} onClick={() => toggle(i)} disabled={closed}
              style={{ flex: 1, fontSize: 12.5, fontWeight: 600, padding: '10px 0', borderRadius: 12, cursor: closed ? 'not-allowed' : 'pointer', border: 'none', fontFamily: FONT,
                background: on ? accent : T.inset, color: on ? '#fff' : closed ? T.faint : T.muted, opacity: closed ? 0.5 : 1,
                textDecoration: closed ? 'line-through' : 'none', transition: `all .2s ${EASE}` }}>{d}</button>
          )
        })}
      </div>
    </div>
  )
}
function TimeRange({ T, start, end, onChange, domain = [6, 22], accent }) {
  const trackRef = useRef(null), drag = useRef(null)
  const [dS, dE] = domain, span = dE - dS
  const pct = (v) => ((v - dS) / span) * 100
  useEffect(() => {
    function move(e) {
      if (!drag.current || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const t = Math.round((dS + r * span) * 4) / 4
      if (drag.current === 'start') onChange(Math.min(t, end - 0.5), end)
      else onChange(start, Math.max(t, start + 0.5))
    }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [start, end, onChange, dS, span])
  const handle = (which, v) => <div onPointerDown={() => (drag.current = which)} style={{ position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)', width: 22, height: 22, borderRadius: 999, background: '#fff', border: `2.5px solid ${accent}`, boxShadow: '0 2px 6px rgba(0,0,0,.22)', cursor: 'grab', touchAction: 'none', zIndex: 2 }} />
  const ticks = []; for (let h = Math.ceil(dS); h <= dE; h += 2) ticks.push(h)
  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>{fmt(start)}</span>
        <span style={{ fontSize: 12.5, color: T.faint }}>{end - start}h</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>{fmt(end)}</span>
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: 24 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 7, transform: 'translateY(-50%)', background: T.track, borderRadius: 999 }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%`, height: 7, transform: 'translateY(-50%)', background: accent, borderRadius: 999 }} />
        {handle('start', start)}{handle('end', end)}
      </div>
      <div style={{ position: 'relative', height: 14, marginTop: 3 }}>
        {ticks.map((h) => <span key={h} style={{ position: 'absolute', left: `${pct(h)}%`, transform: 'translateX(-50%)', fontSize: 9.5, color: T.faint }}>{fmt(h)}</span>)}
      </div>
    </div>
  )
}

// ── inspector ────────────────────────────────────────────────────────────────
function SaveStatus({ T, state }) {
  const cfg = state === 'saved' ? { c: T.green, t: 'Saved' } : state === 'dirty' ? { c: T.amber, t: 'Unsaved changes' } : { c: T.faint, t: 'Up to date' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: cfg.c }}><span style={{ width: 6, height: 6, borderRadius: 999, background: cfg.c }} />{cfg.t}</span>
}
function Inspector({ T, shift, patch, onDelete, saveState, onSave, accent }) {
  if (!shift) return (
    <div style={{ color: T.faint, fontSize: 13.5, textAlign: 'center', marginTop: 90, lineHeight: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <span style={{ width: 52, height: 52, borderRadius: 16, background: T.inset, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.faint }}><Icon path={Ic.shifts} size={24} /></span>
      Select a shift to edit<br />its properties here.
    </div>
  )
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Edit shift</span>
        <button onClick={onDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: T.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}><Icon path={Ic.trash} size={14} stroke={1.8} />Delete</button>
      </div>
      <div style={{ marginBottom: 22 }}><SaveStatus T={T} state={saveState} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div><FieldLabel T={T}>Shift name</FieldLabel>
          <input value={shift.name} onChange={(e) => patch({ name: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, fontWeight: 600, fontFamily: FONT, color: T.ink, padding: '12px 14px', borderRadius: 14, border: `1px solid ${T.border}`, background: T.fieldBg, outline: 'none' }} />
        </div>
        <div><FieldLabel T={T}>Time</FieldLabel>
          <TimeRange T={T} start={shift.start} end={shift.end} onChange={(start, end) => patch({ start, end })} accent={accent} />
          <div style={{ marginTop: 10, fontSize: 11.5, color: T.faint }}>Auto-detected as <b style={{ color: T.muted }}>{designation(shift)}</b> shift</div>
        </div>
        <div><FieldLabel T={T}>Days</FieldLabel><DayPicker T={T} days={shift.days} onChange={(days) => patch({ days })} accent={accent} /></div>
        <div><FieldLabel T={T}>Staff needed</FieldLabel><Stepper T={T} value={shift.staff} onChange={(staff) => patch({ staff })} min={1} max={20} /></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>Keyholder required</div><div style={{ fontSize: 12, color: T.faint }}>Only keyholders can be assigned</div></div>
          <Switch T={T} on={shift.keyholder} onClick={() => patch({ keyholder: !shift.keyholder })} accent={accent} />
        </div>
        <Btn T={T} primary full disabled={saveState !== 'dirty'} onClick={onSave} style={{ marginTop: 2, background: saveState === 'dirty' ? accent : undefined }}>Save shift</Btn>
      </div>
    </>
  )
}

// ── shift card ─────────────────────────────────────────────────────────────────
function ShiftCard({ T, shift, selected, onClick, accent }) {
  const preset = activePreset(shift.days)
  const dayLabel = preset === 'all' ? 'Every open day' : preset === 'weekdays' ? 'Weekdays' : preset === 'weekend' ? 'Weekends' : shift.days.map((d) => DAYS[d]).join(' ')
  const [h, setH] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: T.card, WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${selected ? accent : T.border}`, boxShadow: selected ? `0 0 0 3px ${accent}22, ${T.shadow}` : (h ? T.shadowHover : T.shadow),
        transform: h && !selected ? 'translateY(-2px)' : 'none', transition: `all .3s ${EASE}` }}>
      <div style={{ height: 3, background: T.track }}><div style={{ width: `${Math.round(completeness(shift) * 100)}%`, height: '100%', background: accent, transition: `width .4s ${EASE}` }} /></div>
      <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>{shift.name}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: T.inset, color: T.muted, letterSpacing: '0.03em' }}>{designation(shift).toUpperCase()}</span>
            {shift.keyholder && <Icon path={Ic.key} size={13} stroke={2} color={accent} />}
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4, letterSpacing: '-0.01em' }}>{fmt(shift.start)}–{fmt(shift.end)} · {dayLabel} · {shift.staff} staff</div>
        </div>
        <Icon path={Ic.chevron} size={17} stroke={2} color={T.faint} style={{ transform: h ? 'translateX(2px)' : 'none', transition: `transform .3s ${EASE}` }} />
      </div>
    </div>
  )
}

// ── day timeline + legend ────────────────────────────────────────────────────────
function DayTimeline({ T, dayIndex, shifts, height = 12, color }) {
  const [dS, dE] = DOM, span = dE - dS
  const pct = (v) => ((Math.max(dS, Math.min(dE, v)) - dS) / span) * 100
  const bh = BUSINESS[dayIndex]
  const dayShifts = shifts.filter((s) => s.days.includes(dayIndex))
  return (
    <div style={{ position: 'relative', flex: 1, height, borderRadius: 999, background: T.inset, overflow: 'hidden' }}>
      {!bh ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.faint }}>Closed</div> : <>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(bh[0])}%`, width: `${pct(bh[1]) - pct(bh[0])}%`, background: color + '2A' }} />
        {dayShifts.map((s) => <div key={s.id} style={{ position: 'absolute', top: 1.5, bottom: 1.5, left: `${pct(s.start)}%`, width: `${Math.max(2, pct(s.end) - pct(s.start))}%`, background: color, borderRadius: 999 }} title={`${s.name} ${fmt(s.start)}–${fmt(s.end)}`} />)}
      </>}
    </div>
  )
}
function AxisTicks({ T, ml = 40 }) {
  const [dS, dE] = DOM, span = dE - dS
  const ticks = []; for (let h = dS; h <= dE; h += 2) ticks.push(h)
  return <div style={{ position: 'relative', height: 12, marginLeft: ml }}>{ticks.map((h) => <span key={h} style={{ position: 'absolute', left: `${((h - dS) / span) * 100}%`, transform: 'translateX(-50%)', fontSize: 9.5, color: T.faint }}>{fmt(h)}</span>)}</div>
}
function Legend({ T, color }) {
  const item = (c, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.faint }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{label}</span>
  return <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>{item(color, 'Covered')}{item(color + '2A', 'Gap')}{item(T.inset, 'Closed')}</div>
}

// ── gap fixes ────────────────────────────────────────────────────────────────────
function GapList({ T, shifts, teamId, onApply, color }) {
  const gaps = teamGaps(shifts)
  if (gaps.length === 0) return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: T.green, fontWeight: 600 }}><Icon path={Ic.check} size={15} stroke={2.4} />No gaps to fill.</div>
  return (
    <>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>{gaps.length} gap{gaps.length === 1 ? '' : 's'} to fill</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {gaps.slice(0, 6).map((g, i) => {
          const sug = suggestFor(shifts, g)
          return (
            <div key={i}>
              <div style={{ fontSize: 13, color: T.body, display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 7, lineHeight: 1.35 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: T.amber, flexShrink: 0, transform: 'translateY(-1px)' }} />
                <span><b style={{ color: T.ink }}>{DAY_FULL[g.day]}</b> {fmt(g.from)}–{fmt(g.to)}</span>
              </div>
              <button onClick={() => onApply(teamId, sug)}
                style={{ marginLeft: 13, fontFamily: FONT, fontSize: 12, fontWeight: 600, color: T.ink, background: T.inset, border: 'none', borderRadius: 999, padding: '7px 13px', cursor: 'pointer', transition: `background .2s ${EASE}` }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.track} onMouseLeave={(e) => e.currentTarget.style.background = T.inset}>↳ {sug.label}</button>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── single-team week glance ──────────────────────────────────────────────────────
function WeekGlance({ T, shifts, teamName, teamId, onApply, accent }) {
  const pct = coveragePct(shifts)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <Ring T={T} value={pct / 100} color={pct === 100 ? T.green : accent} size={72} stroke={9} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Week at a glance</div>
          <div style={{ fontSize: 12.5, color: accent, fontWeight: 600, marginTop: 2 }}>{teamName}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {ALL.map((d) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 28, fontSize: 11.5, fontWeight: 600, color: BUSINESS[d] ? T.muted : T.faint }}>{DAYS[d]}</span>
            <DayTimeline T={T} dayIndex={d} shifts={shifts} height={11} color={accent} />
          </div>
        ))}
      </div>
      <AxisTicks T={T} />
      <div style={{ margin: '12px 0 16px' }}><Legend T={T} color={accent} /></div>
      <div style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 16 }}><GapList T={T} shifts={shifts} teamId={teamId} onApply={onApply} color={accent} /></div>
    </div>
  )
}

// ── all-teams matrix + drill-in ──────────────────────────────────────────────────
function MatrixCell({ T, shifts, dayIndex, color }) {
  const cov = dayCoverage(shifts, dayIndex)
  if (cov === null) return <div style={{ height: 9, borderRadius: 999, background: T.inset }} />
  return <div style={{ height: 9, borderRadius: 999, background: color + '24', overflow: 'hidden' }}><div style={{ width: `${Math.round(cov * 100)}%`, height: '100%', background: color, borderRadius: 999 }} /></div>
}
function MatrixRow({ T, team, ts, pct, open, toggle, onApply }) {
  return (
    <>
      <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: FONT, fontSize: 14, fontWeight: 600, color: T.ink, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, letterSpacing: '-0.01em' }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: team.color, flexShrink: 0 }} />
        {team.name}
        <Icon path={Ic.chevron} size={15} stroke={2} color={T.faint} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: `transform .25s ${EASE}` }} />
      </button>
      {ALL.map((d) => <div key={d}><MatrixCell T={T} shifts={ts} dayIndex={d} color={team.color} /></div>)}
      <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? T.green : team.color, textAlign: 'right' }}>{pct}%</span>

      {open && (
        <div style={{ gridColumn: '1 / -1', background: T.inset, border: `1px solid ${T.hair}`, borderRadius: 16, padding: 18, margin: '6px 0 8px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>{team.name} · this week</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 28, fontSize: 11.5, fontWeight: 600, color: BUSINESS[d] ? T.muted : T.faint }}>{DAYS[d]}</span><DayTimeline T={T} dayIndex={d} shifts={ts} height={11} color={team.color} /></div>)}
            </div>
            <AxisTicks T={T} />
            <div style={{ marginTop: 12 }}><Legend T={T} color={team.color} /></div>
          </div>
          <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${T.hair}`, paddingLeft: 22 }}><GapList T={T} shifts={ts} teamId={team.id} onApply={onApply} color={team.color} /></div>
        </div>
      )}
    </>
  )
}
function AllMatrix({ T, shifts, expanded, setExpanded, onApply }) {
  return (
    <Card T={T} pad={22}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr) 56px', gap: 10, alignItems: 'center' }}>
        <span />
        {DAYS.map((d, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: BUSINESS[i] ? T.muted : T.faint, textAlign: 'center' }}>{d}</span>)}
        <span style={{ fontSize: 10, fontWeight: 700, color: T.faint, textAlign: 'right', letterSpacing: '0.03em' }}>COVER</span>
        {TEAMS.map((t) => {
          const ts = shifts.filter((s) => s.team === t.id)
          const open = expanded === t.id
          return <MatrixRow key={t.id} T={T} team={t} ts={ts} pct={coveragePct(ts)} open={open} toggle={() => setExpanded(open ? null : t.id)} onApply={onApply} />
        })}
      </div>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.hair}` }}><AxisTicks T={T} ml={170} /></div>
    </Card>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function ShiftsLab() {
  const { theme, setTheme, T } = useTheme()
  const [teamId, setTeamId] = useState('foh')
  const [shifts, setShifts] = useState(INITIAL_SHIFTS)
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('clean')
  const [expanded, setExpanded] = useState(null)
  const seq = useRef(0)

  const isAll = teamId === 'all'
  const teamShifts = useMemo(() => shifts.filter((s) => s.team === teamId), [shifts, teamId])
  const selected = shifts.find((s) => s.id === selectedId)
  const patch = useCallback((id, p) => { setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setSaveState('dirty') }, [])
  const addShift = useCallback((tId, over = {}) => {
    const id = 'new-' + (seq.current++)
    const days = over.days || WEEKDAYS.filter((d) => OPEN_DAYS.includes(d))
    setShifts((prev) => [...prev, { id, team: tId, name: over.name || 'New shift', start: over.start ?? 9, end: over.end ?? 13, days, staff: 1, keyholder: false }])
    setTeamId(tId); setSelectedId(id); setSaveState('dirty')
  }, [])
  const removeShift = useCallback((id) => { setShifts((prev) => prev.filter((s) => s.id !== id)); setSelectedId(null) }, [])
  const save = useCallback(() => { setSaveState('saved'); setTimeout(() => setSaveState((s) => (s === 'saved' ? 'clean' : s)), 1800) }, [])
  const applySuggestion = useCallback((tId, s) => {
    if (s.kind === 'end') setShifts((prev) => prev.map((x) => (x.id === s.target ? { ...x, end: s.value } : x)))
    else if (s.kind === 'start') setShifts((prev) => prev.map((x) => (x.id === s.target ? { ...x, start: s.value } : x)))
    else setShifts((prev) => [...prev, { id: 'new-' + (seq.current++), team: tId, name: 'Cover', start: s.from, end: s.to, days: [s.day], staff: 1, keyholder: false }])
  }, [])
  useEffect(() => { setSelectedId(null) }, [teamId])
  useEffect(() => { setSaveState('clean') }, [selectedId])

  const tabs = [...TEAMS, { id: 'all', name: 'All teams' }]
  const accent = teamColor(teamId)
  const panelStyle = { position: 'sticky', top: 16 }

  return (
    <LabCanvas T={T} theme={theme} setTheme={setTheme} note="shifts · mock data" maxWidth={1280}>
      {/* header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Shifts</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: '6px 0 0', letterSpacing: '-0.01em' }}>Design the shift patterns your rota is built from.</p>
      </div>

      {/* team segmented control */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
        <div style={{ display: 'inline-flex', background: T.toggleBg, borderRadius: 999, padding: 4, gap: 2 }}>
          {tabs.map((t) => {
            const active = t.id === teamId
            const count = t.id === 'all' ? shifts.length : shifts.filter((s) => s.team === t.id).length
            return (
              <button key={t.id} onClick={() => setTeamId(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  color: active ? T.ink : T.muted, background: active ? T.toggleKnob : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none', transition: `all .3s ${EASE}` }}>
                {t.id !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color }} />}
                {t.name}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? (t.color || T.pink) : T.faint }}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {isAll ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
            <AddPicker T={T} onPick={(tId) => addShift(tId)} />
          </div>
          <AllMatrix T={T} shifts={shifts} expanded={expanded} setExpanded={setExpanded} onApply={applySuggestion} />
          <div style={{ fontSize: 12, color: T.faint, marginTop: 14, textAlign: 'center' }}>Click a team row to see its week and fill gaps.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Card T={T} pad={24} style={{ ...panelStyle, width: 340, flexShrink: 0, minHeight: 440 }}>
            <Inspector T={T} shift={selected} patch={(p) => patch(selected.id, p)} onDelete={() => removeShift(selected.id)} saveState={saveState} onSave={save} accent={accent} />
          </Card>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: T.muted, letterSpacing: '-0.01em' }}>{teamShifts.length} shift{teamShifts.length === 1 ? '' : 's'} in {TEAMS.find((t) => t.id === teamId).name}</span>
              <Btn T={T} size="sm" onClick={() => addShift(teamId)} style={{ background: accent, color: '#fff' }}><Icon path={Ic.plus} size={15} stroke={2.4} />Add shift</Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {teamShifts.map((s) => <ShiftCard key={s.id} T={T} shift={s} selected={selectedId === s.id} onClick={() => setSelectedId(s.id)} accent={accent} />)}
              {teamShifts.length === 0 && <Card T={T} style={{ textAlign: 'center', color: T.faint, fontSize: 13.5, padding: '54px 0' }}>No shifts yet. Add one to get started.</Card>}
            </div>
          </div>
          <Card T={T} pad={24} style={{ ...panelStyle, width: 320, flexShrink: 0 }}>
            <WeekGlance T={T} shifts={teamShifts} teamName={TEAMS.find((t) => t.id === teamId).name} teamId={teamId} onApply={applySuggestion} accent={accent} />
          </Card>
        </div>
      )}
    </LabCanvas>
  )
}

function AddPicker({ T, onPick }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <Btn T={T} primary onClick={() => setOpen((o) => !o)}><Icon path={Ic.plus} size={15} stroke={2.4} />Add shift</Btn>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: T.cardSolid, WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)', border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: T.shadowHover, padding: 6, zIndex: 5, minWidth: 190 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.faint, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '8px 12px' }}>Add to which team?</div>
          {TEAMS.map((t) => (
            <button key={t.id} onClick={() => { setOpen(false); onPick(t.id) }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: T.body, background: 'none', border: 'none', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', transition: `background .2s ${EASE}` }}
              onMouseEnter={(e) => e.currentTarget.style.background = T.hover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color }} />{t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
