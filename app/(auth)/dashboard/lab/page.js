'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

// ════════════════════════════════════════════════════════════════════════════
//  SHIFTS PAGE — UX SANDBOX v4 (mock data only)
//  Single team: Inspector · list · week-at-a-glance (+ gap suggestions)
//  All teams: matrix (2 cell styles) · per-team colour · click row to drill in
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const AMBER = '#F59E0B'
const FIX_BTN = { fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#111827', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }
const FONT = "'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4]
const WEEKEND = [5, 6]

const BUSINESS = { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [10, 16], 6: null }
const OPEN_DAYS = ALL.filter((d) => BUSINESS[d])
const TEAM_OPEN = 9, TEAM_CLOSE = 17
const DOM = [9, 17]

const TEAMS = [
  { id: 'foh', name: 'Front of House', color: '#FF1F7D' },
  { id: 'kit', name: 'Kitchen', color: '#6366F1' },
  { id: 'mgmt', name: 'Management', color: '#14B8A6' },
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
// suggestion to fill a gap
function suggestFor(shifts, gap) {
  const before = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.end - gap.from) < 0.01)
  const after = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.start - gap.to) < 0.01)
  if (before) return { label: `Extend “${before.name}” to ${fmt(gap.to)}`, kind: 'end', target: before.id, value: gap.to }
  if (after) return { label: `Start “${after.name}” at ${fmt(gap.from)}`, kind: 'start', target: after.id, value: gap.from }
  return { label: `Add a ${fmt(gap.from)}–${fmt(gap.to)} shift`, kind: 'add', day: gap.day, from: gap.from, to: gap.to }
}

// ── primitives ─────────────────────────────────────────────────────────────────
function Bar({ value, height = 3, radius = 0, color = PINK }) {
  return <div style={{ width: '100%', height, background: '#EFEFF2', borderRadius: radius, overflow: 'hidden' }}>
    <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${color}99, ${color})`, transition: 'width .3s ease' }} />
  </div>
}
function Switch({ on, onClick, accent = PINK }) {
  const w = 42, h = 24
  return <button onClick={onClick} style={{ position: 'relative', width: w, height: h, borderRadius: 99, border: 'none', background: on ? accent : '#E5E7EB', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 3, left: on ? w - h + 3 : 3, width: h - 6, height: h - 6, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </button>
}
function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
}
function Stepper({ value, onChange, min, max }) {
  const btn = { width: 34, height: 34, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: 17, color: '#6B7280' }
  return <div style={{ display: 'flex', alignItems: 'center' }}>
    <button onClick={() => onChange(Math.max(min, value - 1))} style={{ ...btn, borderRadius: '8px 0 0 8px' }}>−</button>
    <div style={{ minWidth: 50, height: 34, borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#111827', background: '#fff' }}>{value}</div>
    <button onClick={() => onChange(Math.min(max, value + 1))} style={{ ...btn, borderRadius: '0 8px 8px 0' }}>+</button>
  </div>
}
function DayPicker({ days, onChange, accent = PINK }) {
  const preset = activePreset(days)
  const toggle = (i) => { if (!OPEN_DAYS.includes(i)) return; onChange(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b)) }
  const pbtn = (label, set, key) => <button onClick={() => onChange(set.filter((d) => OPEN_DAYS.includes(d)))} style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${preset === key ? accent : '#E5E7EB'}`, background: preset === key ? accent + '12' : '#fff', color: preset === key ? accent : '#6B7280' }}>{label}</button>
  return <div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{pbtn('All', ALL, 'all')}{pbtn('Weekdays', WEEKDAYS, 'weekdays')}{pbtn('Weekend', WEEKEND, 'weekend')}</div>
    <div style={{ display: 'flex', gap: 5 }}>
      {DAYS.map((d, i) => {
        const closed = !OPEN_DAYS.includes(i), on = days.includes(i)
        return <button key={i} onClick={() => toggle(i)} disabled={closed} style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '8px 0', borderRadius: 8, cursor: closed ? 'not-allowed' : 'pointer', border: `1px solid ${on ? accent : closed ? '#F0F0F2' : '#E5E7EB'}`, background: on ? accent : closed ? '#F7F7F9' : '#fff', color: on ? '#fff' : closed ? '#D1D1D6' : '#9CA3AF', textDecoration: closed ? 'line-through' : 'none' }}>{d}</button>
      })}
    </div>
  </div>
}
function TimeRange({ start, end, onChange, domain = [6, 22], accent = PINK }) {
  const trackRef = useRef(null), drag = useRef(null)
  const [dS, dE] = domain, span = dE - dS
  const pct = (v) => ((v - dS) / span) * 100
  useEffect(() => {
    function move(e) {
      if (!drag.current || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      let r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      let t = Math.round((dS + r * span) * 4) / 4
      if (drag.current === 'start') onChange(Math.min(t, end - 0.5), end)
      else onChange(start, Math.max(t, start + 0.5))
    }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [start, end, onChange, dS, span])
  const handle = (which, v) => <div onPointerDown={() => (drag.current = which)} style={{ position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)', width: 20, height: 20, borderRadius: 99, background: '#fff', border: `2px solid ${accent}`, boxShadow: '0 1px 4px rgba(0,0,0,.18)', cursor: 'grab', touchAction: 'none', zIndex: 2 }} />
  const ticks = []; for (let h = Math.ceil(dS); h <= dE; h += 2) ticks.push(h)
  return <div style={{ userSelect: 'none' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{fmt(start)}</span>
      <span style={{ fontSize: 12, color: '#9CA3AF', alignSelf: 'center' }}>{end - start}h</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{fmt(end)}</span>
    </div>
    <div ref={trackRef} style={{ position: 'relative', height: 22 }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', background: '#EFEFF2', borderRadius: 99 }} />
      <div style={{ position: 'absolute', top: '50%', left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%`, height: 6, transform: 'translateY(-50%)', background: `linear-gradient(90deg, ${accent}99, ${accent})`, borderRadius: 99 }} />
      {handle('start', start)}{handle('end', end)}
    </div>
    <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
      {ticks.map((h) => <span key={h} style={{ position: 'absolute', left: `${pct(h)}%`, transform: 'translateX(-50%)', fontSize: 9, color: '#C4C4CC' }}>{fmt(h)}</span>)}
    </div>
  </div>
}

// ── inspector ────────────────────────────────────────────────────────────────
function SaveStatus({ state }) {
  const cfg = state === 'saved' ? { c: '#16A34A', t: '✓ Saved' } : state === 'dirty' ? { c: AMBER, t: '• Unsaved changes' } : { c: '#9CA3AF', t: 'Up to date' }
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: cfg.c }}>{cfg.t}</span>
}
function Inspector({ shift, patch, onDelete, saveState, onSave, accent = PINK }) {
  if (!shift) return <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 70, lineHeight: 1.6 }}>Select a shift to edit<br />its properties here.</div>
  return <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 800 }}>Edit shift</span>
      <button onClick={onDelete} style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
    </div>
    <div style={{ marginBottom: 18 }}><SaveStatus state={saveState} /></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div><Label>Shift name</Label>
        <input value={shift.name} onChange={(e) => patch({ name: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: '#111827', padding: '10px 12px', borderRadius: 9, border: '1px solid #E5E7EB', outline: 'none' }} />
      </div>
      <div><Label>Time</Label>
        <TimeRange start={shift.start} end={shift.end} onChange={(start, end) => patch({ start, end })} accent={accent} />
        <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>Auto-detected as <b style={{ color: '#6B7280' }}>{designation(shift)}</b> shift</div>
      </div>
      <div><Label>Days</Label><DayPicker days={shift.days} onChange={(days) => patch({ days })} accent={accent} /></div>
      <div><Label>Staff needed</Label><Stepper value={shift.staff} onChange={(staff) => patch({ staff })} min={1} max={20} /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Keyholder required</div><div style={{ fontSize: 11, color: '#9CA3AF' }}>Only keyholders can be assigned</div></div>
        <Switch on={shift.keyholder} onClick={() => patch({ keyholder: !shift.keyholder })} accent={accent} />
      </div>
      <button onClick={onSave} disabled={saveState !== 'dirty'} style={{ marginTop: 4, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', background: saveState === 'dirty' ? accent : '#E5E7EB', border: 'none', borderRadius: 10, padding: '11px 0', cursor: saveState === 'dirty' ? 'pointer' : 'default' }}>Save shift</button>
    </div>
  </>
}

// ── shift card ─────────────────────────────────────────────────────────────────
function ShiftCard({ shift, selected, onClick, accent = PINK }) {
  const preset = activePreset(shift.days)
  const dayLabel = preset === 'all' ? 'Every open day' : preset === 'weekdays' ? 'Weekdays' : preset === 'weekend' ? 'Weekends' : shift.days.map((d) => DAYS[d]).join(' ')
  return <div onClick={onClick} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: `1.5px solid ${selected ? accent : '#ECECEF'}`, boxShadow: selected ? `0 0 0 3px ${accent}18` : '0 1px 2px rgba(0,0,0,.04)', transition: 'border-color .15s, box-shadow .15s' }}>
    <Bar value={completeness(shift)} height={3} color={accent} />
    <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{shift.name}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#F3F4F6', color: '#9CA3AF', letterSpacing: 0.3 }}>{designation(shift).toUpperCase()}</span>
          {shift.keyholder && <span title="Keyholder" style={{ color: accent, fontSize: 12 }}>🔑</span>}
        </div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>{fmt(shift.start)}–{fmt(shift.end)} · {dayLabel} · {shift.staff} staff</div>
      </div>
      <span style={{ color: '#C4C4CC', fontSize: 18 }}>›</span>
    </div>
  </div>
}

// ── day timeline (closed / gap / covered) — team-coloured ────────────────────────
function DayTimeline({ dayIndex, shifts, height = 16, color = PINK }) {
  const [dS, dE] = DOM, span = dE - dS
  const pct = (v) => ((Math.max(dS, Math.min(dE, v)) - dS) / span) * 100
  const bh = BUSINESS[dayIndex]
  const dayShifts = shifts.filter((s) => s.days.includes(dayIndex))
  return <div style={{ position: 'relative', flex: 1, height, borderRadius: 5, background: '#F4F4F6', overflow: 'hidden' }}>
    {!bh ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#C4C4CC' }}>Closed</div> : <>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(bh[0])}%`, width: `${pct(bh[1]) - pct(bh[0])}%`, background: color + '24' }} />
      {dayShifts.map((s) => <div key={s.id} style={{ position: 'absolute', top: 2, bottom: 2, left: `${pct(s.start)}%`, width: `${Math.max(2, pct(s.end) - pct(s.start))}%`, background: color, borderRadius: 3 }} title={`${s.name} ${fmt(s.start)}–${fmt(s.end)}`} />)}
    </>}
  </div>
}
function AxisTicks({ ml = 38 }) {
  const [dS, dE] = DOM, span = dE - dS
  const ticks = []; for (let h = dS; h <= dE; h += 2) ticks.push(h)
  return <div style={{ position: 'relative', height: 12, marginLeft: ml }}>
    {ticks.map((h) => <span key={h} style={{ position: 'absolute', left: `${((h - dS) / span) * 100}%`, transform: 'translateX(-50%)', fontSize: 9, color: '#C4C4CC' }}>{fmt(h)}</span>)}
  </div>
}
function Legend({ color = PINK }) {
  const item = (c, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#9CA3AF' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{label}</span>
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{item(color, 'Covered')}{item(color + '24', 'Gap')}{item('#F4F4F6', 'Closed')}</div>
}

// ── gap list with one-click suggestions ──────────────────────────────────────────
function GapList({ shifts, teamId, onApply, color = PINK }) {
  const gaps = teamGaps(shifts)
  if (gaps.length === 0) return <div style={{ fontSize: 12.5, color: '#16A34A', fontWeight: 600 }}>✓ No gaps to fill.</div>
  return <>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{gaps.length} gap{gaps.length === 1 ? '' : 's'} to fill</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {gaps.slice(0, 6).map((g, i) => {
        const sug = suggestFor(shifts, g)
        return <div key={i}>
          <div style={{ fontSize: 12.5, color: '#374151', display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5, lineHeight: 1.35 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: AMBER, flexShrink: 0, transform: 'translateY(-1px)' }} />
            <span><b>{DAY_FULL[g.day]}</b> {fmt(g.from)}–{fmt(g.to)}</span>
          </div>
          <button onClick={() => onApply(teamId, sug)} style={{ ...FIX_BTN, marginLeft: 13 }}>↳ {sug.label}</button>
        </div>
      })}
    </div>
  </>
}

// ── single-team week glance ──────────────────────────────────────────────────────
function WeekGlance({ shifts, teamName, teamId, onApply, accent = PINK }) {
  const pct = coveragePct(shifts)
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ fontSize: 13, fontWeight: 800 }}>Week at a glance</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? '#16A34A' : accent }}>{pct}%</span>
    </div>
    <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 12 }}>{teamName}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
      {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: BUSINESS[d] ? '#6B7280' : '#C4C4CC' }}>{DAYS[d]}</span>
        <DayTimeline dayIndex={d} shifts={shifts} height={11} color={accent} />
      </div>)}
    </div>
    <AxisTicks />
    <div style={{ margin: '10px 0 14px' }}><Legend color={accent} /></div>
    <div style={{ borderTop: '1px solid #ECECEF', paddingTop: 14 }}><GapList shifts={shifts} teamId={teamId} onApply={onApply} color={accent} /></div>
  </div>
}

// ── all-teams matrix (2 cell styles) + drill-in ──────────────────────────────────
function MatrixCell({ shifts, dayIndex, color }) {
  // slim coverage-fraction bar (minimal)
  const cov = dayCoverage(shifts, dayIndex)
  if (cov === null) return <div style={{ height: 8, borderRadius: 99, background: '#F4F4F6' }} />
  return <div style={{ height: 8, borderRadius: 99, background: color + '20', overflow: 'hidden' }}>
    <div style={{ width: `${Math.round(cov * 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
  </div>
}
function AllMatrix({ shifts, expanded, setExpanded, onApply }) {
  return <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 18 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '150px repeat(7, 1fr) 56px', gap: 9, alignItems: 'center' }}>
      <span />
      {DAYS.map((d, i) => <span key={i} style={{ fontSize: 11, fontWeight: 700, color: BUSINESS[i] ? '#6B7280' : '#C4C4CC', textAlign: 'center' }}>{d}</span>)}
      <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textAlign: 'right' }}>COVER</span>

      {TEAMS.map((t) => {
        const ts = shifts.filter((s) => s.team === t.id)
        const pct = coveragePct(ts)
        const open = expanded === t.id
        return <RowFragment key={t.id} team={t} ts={ts} pct={pct} open={open} toggle={() => setExpanded(open ? null : t.id)} onApply={onApply} />
      })}
    </div>
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F0F0F2' }}><AxisTicks ml={159} /></div>
  </div>
}
function RowFragment({ team, ts, pct, open, toggle, onApply }) {
  return <>
    <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#111827', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, background: team.color, flexShrink: 0 }} />
      {team.name}
      <span style={{ color: '#C4C4CC', fontSize: 15, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
    </button>
    {ALL.map((d) => <div key={d}><MatrixCell shifts={ts} dayIndex={d} color={team.color} /></div>)}
    <span style={{ fontSize: 12.5, fontWeight: 800, color: pct === 100 ? '#16A34A' : team.color, textAlign: 'right' }}>{pct}%</span>

    {open && <div style={{ gridColumn: '1 / -1', background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 12, padding: 16, margin: '4px 0 8px', display: 'flex', gap: 24 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{team.name} · this week</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: BUSINESS[d] ? '#6B7280' : '#C4C4CC' }}>{DAYS[d]}</span>
            <DayTimeline dayIndex={d} shifts={ts} height={11} color={team.color} />
          </div>)}
        </div>
        <AxisTicks />
        <div style={{ marginTop: 10 }}><Legend color={team.color} /></div>
      </div>
      <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid #ECECEF', paddingLeft: 20 }}>
        <GapList shifts={ts} teamId={team.id} onApply={onApply} color={team.color} />
      </div>
    </div>}
  </>
}

// ════════════════════════════════════════════════════════════════════════════
export default function ShiftsLab() {
  const [teamId, setTeamId] = useState('foh')
  const [shifts, setShifts] = useState(INITIAL_SHIFTS)
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('clean')
  const [expanded, setExpanded] = useState(null)

  const isAll = teamId === 'all'
  const teamShifts = useMemo(() => shifts.filter((s) => s.team === teamId), [shifts, teamId])
  const selected = shifts.find((s) => s.id === selectedId)
  const patch = useCallback((id, p) => { setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setSaveState('dirty') }, [])
  const addShift = useCallback((tId, over = {}) => {
    const id = 'new-' + Math.round(Math.random() * 1e6)
    const days = over.days || WEEKDAYS.filter((d) => OPEN_DAYS.includes(d))
    setShifts((prev) => [...prev, { id, team: tId, name: over.name || 'New shift', start: over.start ?? 9, end: over.end ?? 13, days, staff: 1, keyholder: false }])
    setTeamId(tId); setSelectedId(id); setSaveState('dirty')
  }, [])
  const removeShift = useCallback((id) => { setShifts((prev) => prev.filter((s) => s.id !== id)); setSelectedId(null) }, [])
  const save = useCallback(() => { setSaveState('saved'); setTimeout(() => setSaveState((s) => (s === 'saved' ? 'clean' : s)), 1800) }, [])
  // apply a gap suggestion WITHOUT changing the current view/selection
  const applySuggestion = useCallback((tId, s) => {
    if (s.kind === 'end') setShifts((prev) => prev.map((x) => (x.id === s.target ? { ...x, end: s.value } : x)))
    else if (s.kind === 'start') setShifts((prev) => prev.map((x) => (x.id === s.target ? { ...x, start: s.value } : x)))
    else setShifts((prev) => [...prev, { id: 'new-' + Math.round(Math.random() * 1e6), team: tId, name: 'Cover', start: s.from, end: s.to, days: [s.day], staff: 1, keyholder: false }])
  }, [])
  useEffect(() => { setSelectedId(null) }, [teamId])
  useEffect(() => { setSaveState('clean') }, [selectedId])

  const tabs = [...TEAMS, { id: 'all', name: 'All teams' }]
  const accent = teamColor(teamId) // single-team view wears its team's colour
  const panel = { background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 20 }

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827' }}>
    <div style={{ padding: '12px 28px', background: '#fff', borderBottom: '1px solid #ECECEF', fontSize: 13, color: '#9CA3AF' }}>Shifts · UX sandbox · mock data, nothing saves</div>

    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
      <div style={{ display: 'inline-flex', background: '#F1F1F4', borderRadius: 11, padding: 4, gap: 2 }}>
        {tabs.map((t) => {
          const active = t.id === teamId
          const count = t.id === 'all' ? shifts.length : shifts.filter((s) => s.team === t.id).length
          return <button key={t.id} onClick={() => setTeamId(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', color: active ? '#111827' : '#9CA3AF', background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>{t.id !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />}{t.name}<span style={{ fontSize: 11, fontWeight: 700, color: active ? (t.color || PINK) : '#C4C4CC' }}>{count}</span></button>
        })}
      </div>
    </div>

    {isAll ? (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
          <AddPicker onPick={(tId) => addShift(tId)} />
        </div>
        <AllMatrix shifts={shifts} expanded={expanded} setExpanded={setExpanded} onApply={applySuggestion} />
        <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>Click a team row to see its week and fill gaps.</div>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '4px 24px 40px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ ...panel, width: 320, flexShrink: 0, position: 'sticky', top: 16, minHeight: 420 }}>
          <Inspector shift={selected} patch={(p) => patch(selected.id, p)} onDelete={() => removeShift(selected.id)} saveState={saveState} onSave={save} accent={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>{teamShifts.length} shift{teamShifts.length === 1 ? '' : 's'} in {TEAMS.find((t) => t.id === teamId).name}</span>
            <button onClick={() => addShift(teamId)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: accent, border: 'none', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}>+ Add shift</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {teamShifts.map((s) => <ShiftCard key={s.id} shift={s} selected={selectedId === s.id} onClick={() => setSelectedId(s.id)} accent={accent} />)}
            {teamShifts.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '50px 0', ...panel }}>No shifts yet. Add one to get started.</div>}
          </div>
        </div>
        <div style={{ ...panel, width: 300, flexShrink: 0, position: 'sticky', top: 16 }}>
          <WeekGlance shifts={teamShifts} teamName={TEAMS.find((t) => t.id === teamId).name} teamId={teamId} onApply={applySuggestion} accent={accent} />
        </div>
      </div>
    )}
  </div>
}

function AddPicker({ onPick }) {
  const [open, setOpen] = useState(false)
  return <div style={{ position: 'relative' }}>
    <button onClick={() => setOpen((o) => !o)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: PINK, border: 'none', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}>+ Add shift ▾</button>
    {open && <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.1)', padding: 6, zIndex: 5, minWidth: 180 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', padding: '6px 10px' }}>Add to which team?</div>
      {TEAMS.map((t) => <button key={t.id} onClick={() => { setOpen(false); onPick(t.id) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#374151', background: 'none', border: 'none', borderRadius: 7, padding: '8px 10px', cursor: 'pointer' }}><span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />{t.name}</button>)}
    </div>}
  </div>
}
