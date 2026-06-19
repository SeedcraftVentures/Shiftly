'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { TEAM_COLORS } from '../staff/utils/staffHelpers'

// ════════════════════════════════════════════════════════════════════════════
//  SHIFTS PAGE (live) — locked lab design wired to /api/teams + /api/location + /api/shifts
//  One team per screen via tabs + All teams matrix · left inspector · week-at-a-glance
//  Open/close hours come from the Location (set in onboarding); open/close is auto-derived.
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const AMBER = '#F59E0B'
const FONT = "'Plus Jakarta Sans', sans-serif"
const FIX_BTN = { fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#111827', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4]
const WEEKEND = [5, 6]

// ── helpers (cfg = {business, openDays, open, close, glance, slider}) ─────────────
function fmt(h) {
  if (!Number.isFinite(h)) return '·'
  const hr = Math.floor(h), m = Math.round((h - hr) * 60)
  const ap = hr < 12 || hr === 24 ? 'am' : 'pm'
  let hh = hr % 12; if (hh === 0) hh = 12
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`
}
const norm = (a) => [...a].sort((x, y) => x - y).join(',')
function activePreset(days, openDays) {
  const s = norm(days)
  if (s === norm(openDays)) return 'all'
  if (s === norm(WEEKDAYS.filter((d) => openDays.includes(d)))) return 'weekdays'
  if (s === norm(WEEKEND.filter((d) => openDays.includes(d)))) return 'weekend'
  return null
}
function designation(s, cfg) {
  if (s.start <= cfg.open + 0.01) return 'Opening'
  if (s.end >= cfg.close - 0.01) return 'Closing'
  return 'Regular'
}
function completeness(s) {
  let n = 0
  if (s.name && s.name.trim() && s.name !== 'New shift') n++
  if (s.days.length) n++; if (s.staff >= 1) n++; if (s.end > s.start) n++
  return n / 4
}
function dayGapsFor(shifts, d, cfg) {
  const bh = cfg.business[d]; if (!bh) return []
  const [open, close] = bh
  const ranges = shifts.filter((s) => s.days.includes(d)).map((s) => [Math.max(s.start, open), Math.min(s.end, close)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0])
  const gaps = []; let cursor = open
  for (const [a, b] of ranges) { if (a > cursor) gaps.push([cursor, a]); cursor = Math.max(cursor, b) }
  if (cursor < close) gaps.push([cursor, close])
  return gaps
}
function teamGaps(shifts, cfg) {
  const out = []
  for (const d of cfg.openDays) for (const [from, to] of dayGapsFor(shifts, d, cfg)) out.push({ day: d, from, to })
  return out
}
function coveragePct(shifts, cfg) {
  let open = 0
  for (const d of cfg.openDays) open += cfg.business[d][1] - cfg.business[d][0]
  const gapHours = teamGaps(shifts, cfg).reduce((s, g) => s + (g.to - g.from), 0)
  return open ? Math.round(((open - gapHours) / open) * 100) : 100
}
function dayCoverage(shifts, d, cfg) {
  const bh = cfg.business[d]; if (!bh) return null
  const total = bh[1] - bh[0]
  const gap = dayGapsFor(shifts, d, cfg).reduce((s, [a, b]) => s + (b - a), 0)
  return total ? (total - gap) / total : 1
}
function suggestFor(shifts, gap) {
  const before = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.end - gap.from) < 0.01)
  const after = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.start - gap.to) < 0.01)
  if (before) return { label: `Extend “${before.name}” to ${fmt(gap.to)}`, kind: 'end', target: before.id, value: gap.to }
  if (after) return { label: `Start “${after.name}” at ${fmt(gap.from)}`, kind: 'start', target: after.id, value: gap.from }
  return { label: `Add a ${fmt(gap.from)}–${fmt(gap.to)} shift`, kind: 'add', day: gap.day, from: gap.from, to: gap.to }
}

// ── primitives ─────────────────────────────────────────────────────────────────
function Bar({ value, height = 3, color = PINK }) {
  return <div style={{ width: '100%', height, background: '#EFEFF2', overflow: 'hidden' }}><div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${color}99, ${color})`, transition: 'width .3s' }} /></div>
}
function Switch({ on, onClick, accent = PINK }) {
  const w = 42, h = 24
  return <button onClick={onClick} style={{ position: 'relative', width: w, height: h, borderRadius: 99, border: 'none', background: on ? accent : '#E5E7EB', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}><span style={{ position: 'absolute', top: 3, left: on ? w - h + 3 : 3, width: h - 6, height: h - 6, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /></button>
}
function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
}
// Shared interactive convention: pink outline on hover OR focus, soft ring while focused.
function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix = '', full = true }) {
  const [text, setText] = useState(String(value ?? 0))
  const [focused, setFocused] = useState(false)
  const [hover, setHover] = useState(false)
  const inputRef = useRef(null)
  useEffect(() => { setText(String(value ?? 0)) }, [value])
  const clamp = (n) => Math.max(min, Math.min(max, n))
  const commit = (raw) => { let n = parseFloat(raw); if (isNaN(n)) n = min; n = clamp(n); onChange(n); setText(String(n)) }
  const nudge = (d) => { const n = clamp((parseFloat(text) || 0) + d); onChange(n); setText(String(n)) }
  const btn = { width: 36, height: 38, border: '1px solid #E5E7EB', borderRadius: 9, background: '#F9FAFB', cursor: 'pointer', fontSize: 18, color: '#6B7280', flexShrink: 0, fontFamily: 'inherit', transition: 'background .12s' }
  const lit = focused || hover
  const fieldShadow = focused ? `0 0 0 3px ${PINK}33` : (hover ? `0 0 0 3px ${PINK}1F` : 'inset 0 1px 2px rgba(17,24,39,.08)')
  return <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: full ? 'flex' : 'inline-flex', alignItems: 'center', gap: 6 }}>
    <button type="button" onClick={() => nudge(-step)} style={btn}>−</button>
    <div onMouseDown={(e) => { if (e.target !== inputRef.current) { e.preventDefault(); inputRef.current?.focus() } }}
      style={{ ...(full ? { flex: 1, minWidth: 0 } : { width: 72 }), display: 'flex', alignItems: 'center', height: 38, boxSizing: 'border-box', border: `1px solid ${lit ? PINK : '#E5E7EB'}`, borderRadius: 9, background: '#fff', boxShadow: fieldShadow, cursor: 'text', transition: 'box-shadow .12s, border-color .12s' }}>
      <input ref={inputRef} type="text" inputMode="decimal" value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))}
        onFocus={(e) => { setFocused(true); e.target.select() }}
        onBlur={(e) => { setFocused(false); commit(e.target.value) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'ArrowUp') { e.preventDefault(); nudge(step) } if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-step) } }}
        style={{ flex: 1, minWidth: 0, width: '100%', height: '100%', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: focused ? PINK : '#111827', cursor: 'text', padding: suffix ? '0 0 0 12px' : 0 }} />
      {suffix && <span style={{ flexShrink: 0, paddingRight: 10, paddingLeft: 1, fontSize: 11.5, fontWeight: 600, color: lit ? PINK : '#9CA3AF', pointerEvents: 'none', transition: 'color .12s' }}>{suffix}</span>}
    </div>
    <button type="button" onClick={() => nudge(step)} style={btn}>+</button>
  </div>
}
function FieldInput({ style, onFocus, onBlur, ...rest }) {
  const [f, setF] = useState(false), [h, setH] = useState(false); const lit = f || h
  return <input {...rest} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onFocus={(e) => { setF(true); onFocus?.(e) }} onBlur={(e) => { setF(false); onBlur?.(e) }}
    style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: '#111827', padding: '10px 12px', borderRadius: 9, outline: 'none', border: `1px solid ${lit ? PINK : '#E5E7EB'}`, boxShadow: f ? `0 0 0 3px ${PINK}33` : 'none', transition: 'border-color .12s, box-shadow .12s', ...style }} />
}
function DayPicker({ days, onChange, openDays, accent = PINK }) {
  const preset = activePreset(days, openDays)
  const toggle = (i) => { if (!openDays.includes(i)) return; onChange(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b)) }
  const pbtn = (label, set, key) => <button onClick={() => onChange(set.filter((d) => openDays.includes(d)))} style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${preset === key ? accent : '#E5E7EB'}`, background: preset === key ? accent + '12' : '#fff', color: preset === key ? accent : '#6B7280' }}>{label}</button>
  return <div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{pbtn('All', ALL, 'all')}{pbtn('Weekdays', WEEKDAYS, 'weekdays')}{pbtn('Weekend', WEEKEND, 'weekend')}</div>
    <div style={{ display: 'flex', gap: 5 }}>
      {DAYS.map((d, i) => {
        const closed = !openDays.includes(i), on = days.includes(i)
        return <button key={i} onClick={() => toggle(i)} disabled={closed} style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '8px 0', borderRadius: 8, cursor: closed ? 'not-allowed' : 'pointer', border: `1px solid ${on ? accent : closed ? '#F0F0F2' : '#E5E7EB'}`, background: on ? accent : closed ? '#F7F7F9' : '#fff', color: on ? '#fff' : closed ? '#D1D1D6' : '#9CA3AF', textDecoration: closed ? 'line-through' : 'none' }}>{d}</button>
      })}
    </div>
  </div>
}
function TimeRange({ start, end, onChange, accent = PINK, domain }) {
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
  const c = state === 'saved' ? { c: '#16A34A', t: '✓ Saved' } : state === 'dirty' ? { c: AMBER, t: '• Unsaved changes' } : { c: '#9CA3AF', t: 'Up to date' }
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: c.c }}>{c.t}</span>
}
function Inspector({ shift, patch, onDelete, saveState, onSave, accent, cfg }) {
  if (!shift) return <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 70, lineHeight: 1.6 }}>Select a shift to edit<br />its properties here.</div>
  return <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 800 }}>Edit shift</span>
      <button onClick={onDelete} style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
    </div>
    <div style={{ marginBottom: 18 }}><SaveStatus state={saveState} /></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div><Label>Shift name</Label>
        <FieldInput value={shift.name} onChange={(e) => patch({ name: e.target.value })} />
      </div>
      <div><Label>Time</Label>
        <TimeRange start={shift.start} end={shift.end} onChange={(start, end) => patch({ start, end })} accent={accent} domain={cfg.slider} />
        <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>Auto-detected as <b style={{ color: '#6B7280' }}>{designation(shift, cfg)}</b> shift</div>
      </div>
      <div><Label>Days</Label><DayPicker days={shift.days} onChange={(days) => patch({ days })} openDays={cfg.openDays} accent={accent} /></div>
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
function ShiftCard({ shift, selected, onClick, accent, cfg, selectMode = false, checked = false }) {
  const preset = activePreset(shift.days, cfg.openDays)
  const dayLabel = preset === 'all' ? 'Every open day' : preset === 'weekdays' ? 'Weekdays' : preset === 'weekend' ? 'Weekends' : shift.days.map((d) => DAYS[d]).join(' ')
  const active = selectMode ? checked : selected
  return <div onClick={onClick} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: `1.5px solid ${active ? accent : '#ECECEF'}`, boxShadow: active ? `0 0 0 3px ${accent}18` : '0 1px 2px rgba(0,0,0,.04)', transition: 'border-color .15s, box-shadow .15s' }}>
    <Bar value={completeness(shift)} height={3} color={accent} />
    <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
      {selectMode && <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checked ? accent : '#D1D5DB'}`, background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>{checked ? '✓' : ''}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{shift.name}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#F3F4F6', color: '#9CA3AF', letterSpacing: 0.3 }}>{designation(shift, cfg).toUpperCase()}</span>
          {shift.keyholder && <span title="Keyholder" style={{ color: accent, fontSize: 12 }}>🔑</span>}
        </div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>{fmt(shift.start)}–{fmt(shift.end)} · {dayLabel} · {shift.staff} staff</div>
      </div>
      {!selectMode && <span style={{ color: '#C4C4CC', fontSize: 18 }}>›</span>}
    </div>
  </div>
}

// ── week at a glance ────────────────────────────────────────────────────────────
function DayTimeline({ dayIndex, shifts, height = 11, color = PINK, cfg }) {
  const [dS, dE] = cfg.glance, span = (dE - dS) || 1
  const pct = (v) => ((Math.max(dS, Math.min(dE, v)) - dS) / span) * 100
  const bh = cfg.business[dayIndex]
  const dayShifts = shifts.filter((s) => s.days.includes(dayIndex))
  return <div style={{ position: 'relative', flex: 1, height, borderRadius: 5, background: '#F4F4F6', overflow: 'hidden' }}>
    {!bh ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#C4C4CC' }}>Closed</div> : <>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(bh[0])}%`, width: `${pct(bh[1]) - pct(bh[0])}%`, background: color + '24' }} />
      {dayShifts.map((s) => <div key={s.id} style={{ position: 'absolute', top: 2, bottom: 2, left: `${pct(s.start)}%`, width: `${Math.max(2, pct(s.end) - pct(s.start))}%`, background: color, borderRadius: 3 }} title={`${s.name} ${fmt(s.start)}–${fmt(s.end)}`} />)}
    </>}
  </div>
}
function AxisTicks({ cfg, ml = 38 }) {
  const [dS, dE] = cfg.glance, span = (dE - dS) || 1
  const ticks = []; for (let h = Math.ceil(dS); h <= dE; h += 2) ticks.push(h)
  return <div style={{ position: 'relative', height: 12, marginLeft: ml }}>
    {ticks.map((h) => <span key={h} style={{ position: 'absolute', left: `${((h - dS) / span) * 100}%`, transform: 'translateX(-50%)', fontSize: 9, color: '#C4C4CC' }}>{fmt(h)}</span>)}
  </div>
}
function Legend({ color = PINK }) {
  const item = (c, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#9CA3AF' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{label}</span>
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{item(color, 'Covered')}{item(color + '24', 'Gap')}{item('#F4F4F6', 'Closed')}</div>
}
function GapList({ shifts, teamId, onApply, cfg }) {
  const gaps = teamGaps(shifts, cfg)
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
function WeekGlance({ shifts, teamName, teamId, onApply, accent, cfg }) {
  const pct = coveragePct(shifts, cfg)
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ fontSize: 13, fontWeight: 800 }}>Week at a glance</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? '#16A34A' : accent }}>{pct}%</span>
    </div>
    <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 12 }}>{teamName}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
      {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: cfg.business[d] ? '#6B7280' : '#C4C4CC' }}>{DAYS[d]}</span>
        <DayTimeline dayIndex={d} shifts={shifts} color={accent} cfg={cfg} />
      </div>)}
    </div>
    <AxisTicks cfg={cfg} />
    <div style={{ margin: '10px 0 14px' }}><Legend color={accent} /></div>
    <div style={{ borderTop: '1px solid #ECECEF', paddingTop: 14 }}><GapList shifts={shifts} teamId={teamId} onApply={onApply} cfg={cfg} /></div>
  </div>
}

// ── all-teams matrix ─────────────────────────────────────────────────────────────
function MatrixCell({ shifts, dayIndex, color, cfg }) {
  const cov = dayCoverage(shifts, dayIndex, cfg)
  if (cov === null) return <div style={{ height: 8, borderRadius: 99, background: '#F4F4F6' }} />
  return <div style={{ height: 8, borderRadius: 99, background: color + '20', overflow: 'hidden' }}><div style={{ width: `${Math.round(cov * 100)}%`, height: '100%', background: color, borderRadius: 99 }} /></div>
}
function RowFragment({ team, ts, pct, open, toggle, onApply, cfg }) {
  return <>
    <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#111827', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, background: team.color, flexShrink: 0 }} />{team.name}
      <span style={{ color: '#C4C4CC', fontSize: 15, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
    </button>
    {ALL.map((d) => <div key={d}><MatrixCell shifts={ts} dayIndex={d} color={team.color} cfg={cfg} /></div>)}
    <span style={{ fontSize: 12.5, fontWeight: 800, color: pct === 100 ? '#16A34A' : team.color, textAlign: 'right' }}>{pct}%</span>
    {open && <div style={{ gridColumn: '1 / -1', background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 12, padding: 16, margin: '4px 0 8px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{team.name} this week</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: cfg.business[d] ? '#6B7280' : '#C4C4CC' }}>{DAYS[d]}</span>
            <DayTimeline dayIndex={d} shifts={ts} color={team.color} cfg={cfg} />
          </div>)}
        </div>
        <AxisTicks cfg={cfg} />
      </div>
      <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid #ECECEF', paddingLeft: 20 }}>
        <GapList shifts={ts} teamId={team.id} onApply={onApply} cfg={cfg} />
      </div>
    </div>}
  </>
}
function AllMatrix({ teams, shifts, expanded, setExpanded, onApply, cfg }) {
  return <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 18 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '150px repeat(7, 1fr) 56px', gap: 9, alignItems: 'center' }}>
      <span />
      {DAYS.map((d, i) => <span key={i} style={{ fontSize: 11, fontWeight: 700, color: cfg.business[i] ? '#6B7280' : '#C4C4CC', textAlign: 'center' }}>{d}</span>)}
      <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textAlign: 'right' }}>COVER</span>
      {teams.map((t) => {
        const ts = shifts.filter((s) => s.team_id === t.id)
        return <RowFragment key={t.id} team={t} ts={ts} pct={coveragePct(ts, cfg)} open={expanded === t.id} toggle={() => setExpanded(expanded === t.id ? null : t.id)} onApply={onApply} cfg={cfg} />
      })}
    </div>
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F0F0F2' }}><AxisTicks cfg={cfg} ml={159} /></div>
  </div>
}
function AddPicker({ teams, onPick }) {
  const [open, setOpen] = useState(false)
  return <div style={{ position: 'relative' }}>
    <button onClick={() => setOpen((o) => !o)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: PINK, border: 'none', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}>+ Add shift ▾</button>
    {open && <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.1)', padding: 6, zIndex: 5, minWidth: 180 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', padding: '6px 10px' }}>Add to which team?</div>
      {teams.map((t) => <button key={t.id} onClick={() => { setOpen(false); onPick(t.id) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#374151', background: 'none', border: 'none', borderRadius: 7, padding: '8px 10px', cursor: 'pointer' }}><span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />{t.name}</button>)}
    </div>}
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
export default function ShiftsPage() {
  const [teams, setTeams] = useState([])
  const [location, setLocation] = useState(null)
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('clean')
  const [expanded, setExpanded] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  useEffect(() => {
    (async () => {
      try {
        const [tr, lr, sr] = await Promise.all([fetch('/api/teams'), fetch('/api/location'), fetch('/api/shifts')])
        const td = await tr.json(), ld = await lr.json(), sd = await sr.json()
        const withColor = (Array.isArray(td) ? td : []).map((t, i) => ({ id: t.id, name: t.name, color: TEAM_COLORS[i % TEAM_COLORS.length] }))
        setTeams(withColor); setLocation(ld || null); setShifts(Array.isArray(sd) ? sd : []); setTeamId(withColor[0]?.id || null)
      } catch (e) { console.error('Failed to load shifts page', e) } finally { setLoading(false) }
    })()
  }, [])

  const cfg = useMemo(() => {
    const business = location?.business || { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: null }
    const openDays = ALL.filter((d) => business[d])
    const opens = openDays.map((d) => business[d][0]), closes = openDays.map((d) => business[d][1])
    const open = opens.length ? Math.min(...opens) : 9, close = closes.length ? Math.max(...closes) : 17
    return { business, openDays, open, close, glance: [Math.floor(open), Math.ceil(close)], slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
  }, [location])

  const accent = teams.find((t) => t.id === teamId)?.color || PINK
  const isAll = teamId === 'all'
  const teamShifts = useMemo(() => shifts.filter((s) => s.team_id === teamId), [shifts, teamId])
  const selected = shifts.find((s) => s.id === selectedId)
  useEffect(() => { setSelectedId(null); setSelectMode(false); setSelectedIds(new Set()) }, [teamId])
  useEffect(() => { setSaveState('clean') }, [selectedId])

  const toggleSelect = useCallback((id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) => fetch(`/api/shifts?id=${id}`, { method: 'DELETE' })))
    setShifts((prev) => prev.filter((s) => !selectedIds.has(s.id)))
    setSelectMode(false); setSelectedIds(new Set()); setSelectedId(null)
  }, [selectedIds])

  const ANCHOR = { Opening: 'open', Closing: 'close', Regular: 'fixed' }
  const toApi = useCallback((s) => ({ team_id: s.team_id, name: s.name, anchor_type: ANCHOR[designation(s, cfg)], start: s.start, end: s.end, days: s.days, staff: s.staff, keyholder: s.keyholder, break_duration_mins: 0, break_type: 'unpaid' }), [cfg])
  const patch = useCallback((id, p) => { setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setSaveState('dirty') }, [])
  const saveShift = useCallback(async (shift) => {
    setSaveState('saved')
    const res = await fetch('/api/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: shift.id, ...toApi(shift) }) })
    if (res.ok) { const saved = await res.json(); setShifts((prev) => prev.map((s) => (s.id === shift.id ? saved : s))) }
    setTimeout(() => setSaveState((x) => (x === 'saved' ? 'clean' : x)), 1500)
  }, [toApi])
  const addShift = useCallback(async (tId, over = {}) => {
    const draft = { team_id: tId, name: over.name || 'New shift', start: over.start ?? cfg.open, end: over.end ?? Math.min(cfg.open + 4, cfg.close), days: over.days || WEEKDAYS.filter((d) => cfg.openDays.includes(d)), staff: 1, keyholder: false }
    const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(draft)) })
    if (!res.ok) return
    const created = await res.json()
    setShifts((prev) => [...prev, created]); setTeamId(tId); setSelectedId(created.id)
  }, [cfg, toApi])
  const removeShift = useCallback(async (id) => { await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' }); setShifts((prev) => prev.filter((s) => s.id !== id)); setSelectedId(null) }, [])
  const applySuggestion = useCallback(async (tId, s) => {
    if (s.kind === 'end' || s.kind === 'start') {
      const field = s.kind === 'end' ? 'end' : 'start'
      let updated
      setShifts((prev) => prev.map((x) => { if (x.id === s.target) { updated = { ...x, [field]: s.value }; return updated } return x }))
      if (updated) { const res = await fetch('/api/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated.id, ...toApi(updated) }) }); if (res.ok) { const saved = await res.json(); setShifts((prev) => prev.map((x) => (x.id === saved.id ? saved : x))) } }
    } else {
      const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi({ team_id: tId, name: 'Cover', start: s.from, end: s.to, days: [s.day], staff: 1, keyholder: false })) })
      if (res.ok) { const created = await res.json(); setShifts((prev) => [...prev, created]) }
    }
  }, [toApi])

  if (loading) return <div style={{ fontFamily: FONT, padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading shifts…</div>
  if (teams.length === 0) return <div style={{ fontFamily: FONT, padding: 60, textAlign: 'center', color: '#6B7280' }}>No teams yet. Finish onboarding to add teams first.</div>

  const tabs = [...teams, { id: 'all', name: 'All teams' }]
  const panel = { background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 20, boxShadow: '0 3px 10px rgba(17,24,39,.06), 0 1px 2px rgba(17,24,39,.04)' }
  const teamName = teams.find((t) => t.id === teamId)?.name || ''

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 24px 0' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: -0.3 }}>Shifts</h1>
      <p style={{ fontSize: 13.5, color: '#6B7280', margin: '5px 0 0' }}>The shift patterns each team runs every week.</p>
    </div>
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', background: '#F1F1F4', borderRadius: 11, padding: 4, gap: 2 }}>
        {tabs.map((t) => {
          const active = t.id === teamId
          const count = t.id === 'all' ? shifts.length : shifts.filter((s) => s.team_id === t.id).length
          return <button key={t.id} onClick={() => setTeamId(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', color: active ? '#111827' : '#9CA3AF', background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>{t.id !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />}{t.name}<span style={{ fontSize: 11, fontWeight: 700, color: active ? (t.color || PINK) : '#C4C4CC' }}>{count}</span></button>
        })}
      </div>
      {!isAll && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {selectMode ? <>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', marginRight: 2 }}>{selectedIds.size} selected</span>
          <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 14px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={bulkDelete} disabled={selectedIds.size === 0} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: selectedIds.size ? '#EF4444' : '#E5E7EB', border: 'none', borderRadius: 9, padding: '9px 16px', cursor: selectedIds.size ? 'pointer' : 'default' }}>Delete{selectedIds.size ? ` ${selectedIds.size}` : ''}</button>
        </> : <>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', marginRight: 2 }}>{teamShifts.length} shift{teamShifts.length === 1 ? '' : 's'}</span>
          {teamShifts.length > 0 && <button onClick={() => setSelectMode(true)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 14px', cursor: 'pointer' }}>Select</button>}
          <button onClick={() => addShift(teamId)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: accent, border: 'none', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}>+ Add shift</button>
        </>}
      </div>}
    </div>

    {isAll ? (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '4px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}><AddPicker teams={teams} onPick={(tId) => addShift(tId)} /></div>
        <AllMatrix teams={teams} shifts={shifts} expanded={expanded} setExpanded={setExpanded} onApply={applySuggestion} cfg={cfg} />
        <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>Click a team row to see its week and fill gaps.</div>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '2px 24px 40px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ ...panel, width: 320, flexShrink: 0, position: 'sticky', top: 16, minHeight: 420 }}>
          <Inspector shift={selected} patch={(p) => patch(selected.id, p)} onDelete={() => removeShift(selected.id)} saveState={saveState} onSave={() => saveShift(selected)} accent={accent} cfg={cfg} />
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {teamShifts.map((s) => <ShiftCard key={s.id} shift={s} selected={selectedId === s.id} onClick={() => (selectMode ? toggleSelect(s.id) : setSelectedId(s.id))} accent={accent} cfg={cfg} selectMode={selectMode} checked={selectedIds.has(s.id)} />)}
            {teamShifts.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '50px 0', ...panel }}>No shifts yet. Add one to get started.</div>}
          </div>
        </div>
        <div style={{ ...panel, width: 300, flexShrink: 0, position: 'sticky', top: 16 }}>
          <WeekGlance shifts={teamShifts} teamName={teamName} teamId={teamId} onApply={applySuggestion} accent={accent} cfg={cfg} />
        </div>
      </div>
    )}
  </div>
}
