'use client'

import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from 'react'
import { TEAM_COLORS, coverageBottlenecks, availableHours, locationKeyholderGaps } from './utils/staffHelpers'

// ════════════════════════════════════════════════════════════════════════════
//  STAFF PAGE (live) — locked lab design wired to /api/teams + /api/location + /api/shifts + /api/staff
//  Availability = one per-day control persisted as JSON {day: true | [start,end]} on Staff.
//  Right glance answers "can our staff cover the shifts?" (capacity vs coverage).
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

// ── helpers (cfg = {business, openDays, slider}) ─────────────────────────────────
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
function dayLabel(days, openDays) {
  const p = activePreset(days, openDays)
  return p === 'all' ? 'Every open day' : p === 'weekdays' ? 'Weekdays' : p === 'weekend' ? 'Weekends' : days.map((d) => DAYS[d]).join(' ')
}
const initials = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const first = (name) => (name || '').split(' ')[0]
const allDayAvail = (openDays) => Object.fromEntries(openDays.map((d) => [d, true]))
const workDays = (s, cfg) => cfg.openDays.filter((d) => s.avail?.[d])
function windowForDay(s, d, cfg) { const a = s.avail?.[d]; if (!a) return null; return a === true ? cfg.business[d] : a }
function canWork(s, d, sh, cfg) { const w = windowForDay(s, d, cfg); if (!w) return false; return w[0] <= sh.start + 0.001 && w[1] >= sh.end - 0.001 }
function completeness(s, cfg) {
  let n = 0
  if (s.name?.trim()) n++; if (s.role?.trim()) n++; if (s.wage > 0) n++; if (s.contracted > 0) n++; if (workDays(s, cfg).length) n++
  return n / 5
}
const openDayCount = (days, openDays) => days.filter((d) => openDays.includes(d)).length
function requiredHours(shifts, cfg) { return shifts.reduce((a, s) => a + (s.end - s.start) * s.staff * openDayCount(s.days, cfg.openDays), 0) }
function staffing(staff, shifts, cfg) {
  let demand = 0, filled = 0
  const short = []
  for (const sh of shifts) {
    for (const d of sh.days) {
      if (!cfg.openDays.includes(d)) continue
      demand += sh.staff
      const q = staff.filter((st) => canWork(st, d, sh, cfg)) // keyholder is location-wide, not a per-shift filter
      filled += Math.min(q.length, sh.staff)
      if (q.length < sh.staff) short.push({ day: d, name: sh.name, need: sh.staff, have: q.length, start: sh.start, end: sh.end })
    }
  }
  return { demand, filled, pct: demand ? Math.round((filled / demand) * 100) : 100, short }
}
function groupShortfalls(short) {
  const map = {}
  for (const sf of short) {
    if (!map[sf.name]) map[sf.name] = { name: sf.name, need: sf.need, kh: sf.kh, start: sf.start, end: sf.end, days: [], have: Infinity }
    map[sf.name].days.push(sf.day); map[sf.name].have = Math.min(map[sf.name].have, sf.have)
  }
  return Object.values(map)
}
function suggestFixGroup(teamStaff, g, cfg) {
  const sh = { start: g.start, end: g.end }, D = g.days
  if (g.kh) {
    const cand = teamStaff.find((st) => !st.keyholder && D.some((d) => canWork(st, d, sh, cfg)))
    if (cand) return { label: `Make ${first(cand.name)} a keyholder`, kind: 'keyholder', id: cand.id }
  }
  const defCovers = (st) => Object.values(st.avail || {}).some((a) => a === true) || workDays(st, cfg).some((d) => canWork(st, d, sh, cfg))
  const addCand = teamStaff.find((st) => (!g.kh || st.keyholder) && defCovers(st) && D.some((d) => !st.avail?.[d]))
  if (addCand) { const add = D.filter((d) => !addCand.avail?.[d]); if (add.length) return { label: `Add ${add.map((d) => DAYS[d]).join(', ')} to ${first(addCand.name)}’s availability`, kind: 'adddays', id: addCand.id, days: add, start: sh.start, end: sh.end } }
  const wideCand = teamStaff.find((st) => (!g.kh || st.keyholder) && D.some((d) => Array.isArray(st.avail?.[d]) && !canWork(st, d, sh, cfg)))
  if (wideCand) return { label: `Extend ${first(wideCand.name)}’s hours to cover ${fmt(sh.start)}–${fmt(sh.end)}`, kind: 'widen', id: wideCand.id, days: D, start: sh.start, end: sh.end }
  return { label: `Add a ${g.kh ? 'keyholder ' : ''}team member`, kind: 'addstaff', kh: g.kh }
}
function readiness(staff, shifts, cfg) {
  const cov = staffing(staff, shifts, cfg)
  const req = requiredHours(shifts, cfg)
  const contracted = staff.reduce((a, s) => a + s.contracted, 0)
  const maxh = staff.reduce((a, s) => a + s.max, 0)
  const capacityPct = req ? Math.min(100, Math.round((maxh / req) * 100)) : 100
  const coverableAtMax = maxh >= req, withinContract = contracted >= req
  return {
    overallPct: Math.min(cov.pct, capacityPct), short: cov.short,
    ready: cov.short.length === 0 && coverableAtMax,
    contracted, maxh, req, coverableAtMax, withinContract,
    overContractH: coverableAtMax && !withinContract ? req - contracted : 0,
    shortAtMaxH: Math.max(0, req - maxh),
  }
}

// ── primitives ─────────────────────────────────────────────────────────────────
function Bar({ value, height = 3, color = PINK }) {
  return <div style={{ width: '100%', height, background: '#EFEFF2', overflow: 'hidden' }}><div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${color}99, ${color})`, transition: 'width .3s' }} /></div>
}
function ClampBar({ value, color }) {
  const v = Math.min(1, value)
  return <div style={{ width: '100%', height: 10, borderRadius: 99, background: color + '18', overflow: 'hidden' }}><div style={{ width: `${Math.round(v * 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .3s' }} /></div>
}
function Switch({ on, onClick, accent = PINK, size = 1 }) {
  const w = 42 * size, h = 24 * size
  return <button onClick={onClick} style={{ position: 'relative', width: w, height: h, borderRadius: 99, border: 'none', background: on ? accent : '#E5E7EB', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}><span style={{ position: 'absolute', top: 3 * size, left: on ? w - h + 3 * size : 3 * size, width: h - 6 * size, height: h - 6 * size, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /></button>
}
function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</div>
}
function Stepper({ value, onChange, min, max, suffix = '', step = 1 }) {
  // Typeable: type the number directly (no more 40 clicks). +/- nudge by `step`.
  // Styled to look like an editable field (recessed well, hover highlight, focus ring)
  // so it's obvious you can click in and type, not just use the buttons.
  const [text, setText] = useState(String(value ?? 0))
  const [focused, setFocused] = useState(false)
  const [hover, setHover] = useState(false)
  const inputRef = useRef(null)
  useEffect(() => { setText(String(value ?? 0)) }, [value])
  const clamp = (n) => Math.max(min, Math.min(max, n))
  const commit = (raw) => { let n = parseFloat(raw); if (isNaN(n)) n = min; n = clamp(n); onChange(n); setText(String(n)) }
  const nudge = (d) => { const n = clamp((parseFloat(text) || 0) + d); onChange(n); setText(String(n)) }
  const btn = { width: 36, height: 38, border: '1px solid #E5E7EB', borderRadius: 9, background: '#F9FAFB', cursor: 'pointer', fontSize: 18, color: '#6B7280', flexShrink: 0, fontFamily: 'inherit', transition: 'background .12s' }
  const lit = focused || hover // pink outline whenever interactive, so it's clearly clickable
  const fieldShadow = focused ? `0 0 0 3px ${PINK}33` : (hover ? `0 0 0 3px ${PINK}1F` : 'inset 0 1px 2px rgba(17,24,39,.08)')
  return <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <button type="button" onClick={() => nudge(-step)} style={btn}>−</button>
    <div onMouseDown={(e) => { if (e.target !== inputRef.current) { e.preventDefault(); inputRef.current?.focus() } }}
      style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', height: 38, boxSizing: 'border-box', border: `1px solid ${lit ? PINK : '#E5E7EB'}`, borderRadius: 9, background: '#fff', boxShadow: fieldShadow, cursor: 'text', transition: 'box-shadow .12s, border-color .12s' }}>
      <input ref={inputRef} type="text" inputMode="decimal" value={text} aria-label={suffix === 'h' ? 'hours' : undefined}
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
function MiniBtn({ children, onClick, accent = PINK, active = false }) {
  const [h, setH] = useState(false)
  const on = active || h
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ fontSize: 11, fontWeight: active ? 700 : 600, padding: '4px 10px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${on ? accent : '#E5E7EB'}`, background: active ? accent + '14' : (h ? accent + '10' : '#fff'), color: on ? accent : '#6B7280', transition: 'all .12s' }}>{children}</button>
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
  const handle = (which, v) => <div onPointerDown={() => (drag.current = which)} style={{ position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: 99, background: '#fff', border: `2px solid ${accent}`, boxShadow: '0 1px 4px rgba(0,0,0,.18)', cursor: 'grab', touchAction: 'none', zIndex: 2 }} />
  return <div ref={trackRef} style={{ position: 'relative', height: 18, userSelect: 'none' }}>
    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', background: '#EFEFF2', borderRadius: 99 }} />
    <div style={{ position: 'absolute', top: '50%', left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%`, height: 6, transform: 'translateY(-50%)', background: `linear-gradient(90deg, ${accent}99, ${accent})`, borderRadius: 99 }} />
    {handle('start', start)}{handle('end', end)}
  </div>
}

// ── icons (no emoji) ─────────────────────────────────────────────────────────────
// keyholder mark — a clean line key, replacing the 🔑 emoji everywhere
function KeyMark({ size = 13, color = PINK, title = 'Keyholder' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}><title>{title}</title><circle cx="8" cy="15" r="5" /><path d="M11.6 11.4 21 2" /><path d="M16.5 6.5 19.5 9.5" /></svg>
}
function Pencil({ size = 11, color = '#9CA3AF' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
}
// collapsed "set hours" summary — neutral, with a pencil so it's clearly editable
function HoursChip({ w, accent, onClick }) {
  const [h, setH] = useState(false)
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} title="Edit hours" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, color: h ? '#111827' : '#4B5563', background: h ? '#fff' : '#F1F1F4', border: `1px solid ${h ? '#D1D5DB' : 'transparent'}`, borderRadius: 7, padding: '4px 9px', cursor: 'pointer', transition: 'all .12s', whiteSpace: 'nowrap' }}>
    {fmt(w[0])}–{fmt(w[1])}
    <Pencil size={10.5} color={h ? accent : '#B5B5BD'} />
  </button>
}

// ── availability editor (one per-day control) ─────────────────────────────────────
// "Set hours" opens an inline editor with Save; collapsed days show a compact time chip
// instead of an always-open dragger, so the panel stays short.
function AvailabilityEditor({ s, patch, accent, cfg }) {
  const [editDay, setEditDay] = useState(null)
  const setDay = (d, val) => { const a = { ...(s.avail || {}) }; if (val === false) delete a[d]; else a[d] = val; patch({ avail: a }) }
  const allWeekOn = cfg.openDays.every((d) => s.avail?.[d] === true)
  const seg = (act, lbl, onClick) => <button onClick={onClick} style={{ fontSize: 11, fontWeight: act ? 700 : 600, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: act ? '#fff' : 'transparent', color: act ? accent : '#9CA3AF', boxShadow: act ? '0 1px 2px rgba(0,0,0,.08)' : 'none', transition: 'all .12s' }}>{lbl}</button>
  return <div style={{ borderTop: '1px solid #F0F0F2', paddingTop: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <Label>Availability</Label>
      <div style={{ display: 'flex', gap: 8 }}>
        <MiniBtn active={allWeekOn} onClick={() => { patch({ avail: allDayAvail(cfg.openDays) }); setEditDay(null) }} accent={accent}>All week</MiniBtn>
        <MiniBtn onClick={() => { patch({ avail: {} }); setEditDay(null) }} accent={accent}>Clear</MiniBtn>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {cfg.openDays.map((d) => {
        const a = s.avail?.[d], on = !!a, allDay = a === true
        const w = Array.isArray(a) ? a : cfg.business[d]
        const editing = editDay === d
        return <div key={d} style={{ padding: '9px 0', borderBottom: '1px solid #F4F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minHeight: 30 }}>
            <Switch on={on} onClick={() => { setDay(d, on ? false : true); if (on) setEditDay(null) }} accent={accent} size={0.82} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: on ? '#111827' : '#C4C4CC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{DAY_FULL[d]}</span>
            {on
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!allDay && !editing && <HoursChip w={w} accent={accent} onClick={() => setEditDay(d)} />}
                  <div style={{ display: 'inline-flex', background: '#F1F1F4', borderRadius: 8, padding: 2, gap: 2 }}>
                    {seg(allDay, 'All day', () => { setDay(d, true); setEditDay(null) })}
                    {seg(!allDay, 'Set hours', () => { if (!Array.isArray(a)) setDay(d, cfg.business[d]); setEditDay(d) })}
                  </div>
                </div>
              : <span style={{ fontSize: 11.5, color: '#C4C4CC' }}>Off</span>}
          </div>
          {on && !allDay && editing && <div style={{ marginTop: 10, paddingLeft: 46, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{fmt(w[0])}</span><span style={{ fontSize: 12.5, fontWeight: 700 }}>{fmt(w[1])}</span></div>
              <TimeRange start={w[0]} end={w[1]} onChange={(x, y) => setDay(d, [x, y])} accent={accent} domain={cfg.slider} />
            </div>
            <button onClick={() => setEditDay(null)} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#fff', background: accent, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', flexShrink: 0 }}>Save</button>
          </div>}
        </div>
      })}
    </div>
  </div>
}

// ── inspector ────────────────────────────────────────────────────────────────
function SaveStatus({ state }) {
  const c = state === 'saved' ? { c: '#16A34A', t: '✓ Saved' } : state === 'dirty' ? { c: AMBER, t: '• Unsaved changes' } : { c: '#9CA3AF', t: 'Up to date' }
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: c.c }}>{c.t}</span>
}
const inputStyle = (extra = {}) => ({ width: '100%', boxSizing: 'border-box', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: '#111827', padding: '10px 12px', borderRadius: 9, border: '1px solid #E5E7EB', outline: 'none', ...extra })
// app-wide convention: pink outline on hover OR focus, soft ring while focused
const litStyle = (lit, f) => ({ border: `1px solid ${lit ? PINK : '#E5E7EB'}`, boxShadow: f ? `0 0 0 3px ${PINK}33` : 'none', transition: 'border-color .12s, box-shadow .12s' })
function FieldLabel({ children }) { return <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div> }
function FieldInput({ style, onFocus, onBlur, ...rest }) {
  const [f, setF] = useState(false), [h, setH] = useState(false)
  return <input {...rest} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onFocus={(e) => { setF(true); onFocus?.(e) }} onBlur={(e) => { setF(false); onBlur?.(e) }} style={inputStyle({ ...litStyle(f || h, f), ...style })} />
}
function Money({ value, onChange, step = '0.25', suffix = '' }) {
  const [f, setF] = useState(false), [h, setH] = useState(false); const lit = f || h
  return <div style={{ position: 'relative' }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: lit ? PINK : '#9CA3AF', transition: 'color .12s' }}>£</span>
    <input value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} onFocus={() => setF(true)} onBlur={() => setF(false)} type="number" step={step} style={inputStyle({ paddingLeft: 24, paddingRight: suffix ? 44 : 12, ...litStyle(lit, f) })} />
    {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: lit ? PINK : '#9CA3AF', pointerEvents: 'none', transition: 'color .12s' }}>{suffix}</span>}
  </div>
}
export function Inspector({ s, patch, onDelete, saveState, onSave, accent, cfg, hidePay = false }) {
  if (!s) return <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 70, lineHeight: 1.6 }}>Select a staff member to<br />edit their details here.</div>
  return <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 800 }}>Edit staff</span>
      <button onClick={onDelete} style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
    </div>
    <div style={{ marginBottom: 18 }}><SaveStatus state={saveState} /></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}><FieldLabel>Name</FieldLabel><FieldInput value={s.name} onChange={(e) => patch({ name: e.target.value })} /></div>
        <div style={{ flex: 1, minWidth: 0 }}><FieldLabel>Role</FieldLabel><FieldInput value={s.role || ''} onChange={(e) => patch({ role: e.target.value })} /></div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}><FieldLabel>Contracted</FieldLabel><Stepper value={s.contracted} onChange={(v) => patch({ contracted: v })} min={0} max={60} suffix="h" /></div>
        <div style={{ flex: 1 }}><FieldLabel>Max / week</FieldLabel><Stepper value={s.max} onChange={(v) => patch({ max: v })} min={0} max={60} suffix="h" /></div>
      </div>
      {!hidePay && <div>
        <FieldLabel>Pay basis</FieldLabel>
        <div style={{ display: 'inline-flex', background: '#F1F1F4', borderRadius: 9, padding: 3, gap: 2, marginBottom: 14, marginTop: 2 }}>
          {[['hourly', 'Hourly'], ['salary', 'Salary'], ['annualised', 'Annualised']].map(([k, lbl]) => {
            const act = (s.pay_basis || 'hourly') === k
            return <button key={k} onClick={() => patch({ pay_basis: k })} style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', background: act ? '#fff' : 'transparent', color: act ? accent : '#9CA3AF', boxShadow: act ? '0 1px 2px rgba(0,0,0,.08)' : 'none', transition: 'all .12s' }}>{lbl}</button>
          })}
        </div>
        {(s.pay_basis || 'hourly') === 'hourly' && (
          <Money value={s.wage} step="0.25" suffix="/hr" onChange={(v) => patch({ wage: v })} />
        )}
        {s.pay_basis === 'salary' && (
          <Money value={s.annual_salary} step="500" suffix="/yr" onChange={(v) => patch({ annual_salary: v })} />
        )}
        {s.pay_basis === 'annualised' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1.4 }}><FieldLabel>Annual salary</FieldLabel><Money value={s.annual_salary} step="500" suffix="/yr" onChange={(v) => patch({ annual_salary: v })} /></div>
            <div style={{ flex: 1 }}><FieldLabel>Hours / year</FieldLabel><input value={s.annualised_hours || ''} onChange={(e) => patch({ annualised_hours: parseFloat(e.target.value) || 0 })} type="number" step="20" placeholder="1820" style={inputStyle()} /></div>
          </div>
        )}
      </div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Keyholder</div><div style={{ fontSize: 11, color: '#9CA3AF' }}>Can open & close</div></div>
        <Switch on={s.keyholder} onClick={() => patch({ keyholder: !s.keyholder })} accent={accent} />
      </div>
      <AvailabilityEditor s={s} patch={patch} accent={accent} cfg={cfg} />
      {availableHours(s, cfg) < s.contracted && <div style={{ fontSize: 12, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 12px', lineHeight: 1.45 }}>
        ⚠ Available <b>{availableHours(s, cfg)}h</b> but contracted <b>{s.contracted}h</b> — {first(s.name) || 'they'} can’t reach their contract. Widen availability or lower the contracted hours.
      </div>}
      <button onClick={onSave} disabled={saveState !== 'dirty'} style={{ marginTop: 4, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', background: saveState === 'dirty' ? accent : '#E5E7EB', border: 'none', borderRadius: 10, padding: '11px 0', cursor: saveState === 'dirty' ? 'pointer' : 'default' }}>Save staff</button>
    </div>
  </>
}

// ── staff card ─────────────────────────────────────────────────────────────────
function StaffCard({ s, selected, onClick, accent, cfg, selectMode = false, checked = false }) {
  const wd = workDays(s, cfg)
  const allSame = wd.length > 0 && wd.every((d) => s.avail[d] === true)
  const availTxt = wd.length === 0 ? 'no availability' : allSame ? `${dayLabel(wd, cfg.openDays)}, all day` : `${dayLabel(wd, cfg.openDays)}, varies`
  const active = selectMode ? checked : selected
  return <div onClick={onClick} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: `1.5px solid ${active ? accent : '#ECECEF'}`, boxShadow: active ? `0 0 0 3px ${accent}18` : '0 1px 2px rgba(0,0,0,.04)', transition: 'border-color .15s, box-shadow .15s' }}>
    <Bar value={completeness(s, cfg)} height={3} color={accent} />
    <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
      {selectMode && <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checked ? accent : '#D1D5DB'}`, background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>{checked ? '✓' : ''}</span>}
      <div style={{ width: 38, height: 38, borderRadius: 99, flexShrink: 0, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{initials(s.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{s.name}</span>
          {s.keyholder && <KeyMark size={13} color={accent} />}
          {availableHours(s, cfg) < s.contracted && <span title={`Available ${availableHours(s, cfg)}h but contracted ${s.contracted}h`} style={{ color: '#EF4444', fontSize: 12 }}>⚠</span>}
        </div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>{s.role || 'No role'} · {s.contracted}/{s.max}h · £{(s.wage || 0).toFixed(2)} · {availTxt}</div>
      </div>
      {!selectMode && <span style={{ color: '#C4C4CC', fontSize: 18 }}>›</span>}
    </div>
  </div>
}

// ── glances ──────────────────────────────────────────────────────────────────────
function CapacityLine({ r, accent, teamId, onFix }) {
  const { contracted, maxh, req, withinContract, coverableAtMax, overContractH, shortAtMaxH } = r
  const solid = req ? Math.min(contracted, req) / req : 1
  const ot = req ? Math.max(0, Math.min(maxh, req) - contracted) / req : 0
  const hireH = Math.min(Math.max(req - contracted, 0), 40)
  const row = (label, val) => <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span style={{ color: '#6B7280' }}>{label}</span><b style={{ color: '#111827' }}>{val}</b></div>
  return <>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Capacity</div>
    <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: '#EFEFF2' }}>
      <div style={{ width: `${solid * 100}%`, background: accent }} />
      <div style={{ width: `${ot * 100}%`, background: accent + '40' }} />
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 11, color: coverableAtMax ? '#111827' : '#EF4444' }}>{coverableAtMax ? '✓ Shifts covered' : `Short ${shortAtMaxH}h even at max`}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 9 }}>
      {row('Contracted', `${contracted}h`)}{row('Max available', `${maxh}h`)}{row('Shifts need', `${req}h`)}
    </div>
    {coverableAtMax && !withinContract && <div style={{ marginTop: 11, fontSize: 11.5, color: '#92660B', background: AMBER + '14', borderRadius: 8, padding: '9px 11px', lineHeight: 1.45 }}>
      To cover, staff work <b>{overContractH}h</b> over contract.
      {onFix && <div style={{ marginTop: 6 }}><button onClick={() => onFix(teamId, { kind: 'addstaff', contracted: hireH, kh: false })} style={{ ...FIX_BTN, background: '#fff' }}>↳ Hire a {hireH}h member to avoid this</button></div>}
    </div>}
    {!coverableAtMax && onFix && <button onClick={() => onFix(teamId, { kind: 'addstaff', contracted: hireH, kh: false })} style={{ ...FIX_BTN, marginTop: 10 }}>↳ Hire a {hireH}h team member</button>}
  </>
}
function ShortfallList({ staff, shifts, teamId, onFix, cfg }) {
  const groups = groupShortfalls(staffing(staff, shifts, cfg).short)
  return <>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Coverage</div>
    {groups.length === 0 ? <div style={{ fontSize: 12.5, color: '#16A34A', fontWeight: 600 }}>✓ Every shift can be filled by available staff.</div> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map((g, i) => {
          const fix = suggestFixGroup(staff, g, cfg)
          return <div key={i}>
            <div style={{ fontSize: 12.5, color: '#374151', display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 5, lineHeight: 1.35 }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: AMBER, flexShrink: 0, transform: 'translateY(-1px)' }} />
              <span><b>{g.name}</b> ({fmt(g.start)}–{fmt(g.end)}) needs {g.need}{g.kh ? ' keyholder' : ''}{g.need > 1 ? 's' : ''} · short on {g.days.map((d) => DAYS[d]).join(', ')}</span>
            </div>
            <button onClick={() => onFix(teamId, fix)} style={{ ...FIX_BTN, marginLeft: 13 }}>↳ {fix.label}</button>
          </div>
        })}
      </div>
    )}
  </>
}
export function TeamGlance({ staff, shifts, teamName, teamId, accent, onFix, cfg, wide = false }) {
  const r = readiness(staff, shifts, cfg)
  const bottlenecks = coverageBottlenecks(staff, shifts, cfg)
  const ok = r.ready && bottlenecks.length === 0
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: wide ? 16 : 2 }}>
      <span style={{ fontSize: wide ? 14 : 13, fontWeight: 800 }}>Can we cover the shifts?</span>
      <span style={{ fontSize: wide ? 14 : 13, fontWeight: 800, color: ok ? '#16A34A' : (bottlenecks.length ? '#EF4444' : accent) }}>{r.overallPct}%</span>
    </div>
    {!wide && <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 16 }}>{teamName}</div>}
    {bottlenecks.length > 0 && <div style={{ marginBottom: 16, padding: '11px 13px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA' }}>
      {bottlenecks.map((b, i) => {
        const lim = staff.filter((s) => s.id !== b.id).map((s) => ({ s, days: cfg.openDays.filter((d) => s.avail?.[d]).length })).sort((a, z) => a.days - z.days)[0]
        return <div key={i} style={{ marginTop: i ? 12 : 0 }}>
          <div style={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.45 }}><b>{b.name}</b> is the only person available every open day — they'd need to work {b.essential} days but can only do {b.maxDays}. Spread availability or add staff.</div>
          {onFix && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={() => onFix(teamId, { kind: 'addstaff', contracted: 0, kh: false })} style={FIX_BTN}>↳ Add a team member</button>
            {lim && lim.days < cfg.openDays.length && <button onClick={() => onFix(teamId, { kind: 'fullweek', id: lim.s.id })} style={FIX_BTN}>↳ Give {first(lim.s.name)} the full week</button>}
          </div>}
        </div>
      })}
    </div>}
    {wide
      ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          <div><CapacityLine r={r} accent={accent} teamId={teamId} onFix={onFix} /></div>
          <div style={{ borderLeft: '1px solid #ECECEF', paddingLeft: 24 }}><ShortfallList staff={staff} shifts={shifts} teamId={teamId} onFix={onFix} cfg={cfg} /></div>
        </div>
      : <>
          <CapacityLine r={r} accent={accent} teamId={teamId} onFix={onFix} />
          <div style={{ borderTop: '1px solid #ECECEF', margin: '16px 0 14px' }} />
          <ShortfallList staff={staff} shifts={shifts} teamId={teamId} onFix={onFix} cfg={cfg} />
        </>}
  </div>
}
function AllTeams({ teams, staff, shifts, onFix, cfg }) {
  const [open, setOpen] = useState(null)
  const everyTeamReady = teams.every((t) => readiness(staff.filter((s) => s.team_id === t.id), shifts.filter((s) => s.team_id === t.id), cfg).ready)
  const panel = { background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '4px 18px', boxShadow: '0 3px 10px rgba(17,24,39,.06), 0 1px 2px rgba(17,24,39,.04)' }
  return <div>
    <div style={{ background: everyTeamReady ? '#16A34A12' : AMBER + '12', borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 13, fontWeight: 600, color: everyTeamReady ? '#16A34A' : '#92660B' }}>
      {everyTeamReady ? '✓ Every team can cover its shifts. You’re ready to generate a rota.' : '⚠ Some teams can’t fully cover their shifts. Expand a team to fix the shortfalls.'}
    </div>
    {/* one container, thin collapsible rows — same treatment as the Shifts all-teams matrix */}
    <div style={panel}>
      {teams.map((t, idx) => {
        const ts = staff.filter((s) => s.team_id === t.id), tsh = shifts.filter((s) => s.team_id === t.id)
        const r = readiness(ts, tsh, cfg), isOpen = open === t.id
        const ng = groupShortfalls(r.short).length
        const notReady = []
        if (!r.coverableAtMax) notReady.push(`short ${r.shortAtMaxH}h even at max`)
        if (ng) notReady.push(`${ng} coverage gap${ng === 1 ? '' : 's'}`)
        const status = !r.ready ? { c: '#92660B', t: notReady.join(' · ') } : r.withinContract ? { c: '#16A34A', t: '✓ Fully staffed' } : { c: '#16A34A', t: `✓ Coverable · ${r.overContractH}h over` }
        return <Fragment key={t.id}>
          <div onClick={() => setOpen(isOpen ? null : t.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 0', borderTop: idx ? '1px solid #F0F0F2' : 'none', cursor: 'pointer' }}>
            <span style={{ color: '#C4C4CC', fontSize: 15, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>›</span>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{t.name}</span>
            <span style={{ fontSize: 11.5, color: '#9CA3AF', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>· {ts.length} staff · {r.contracted}/{r.req}h</span>
            <div style={{ flex: 1, minWidth: 30, maxWidth: 220 }}><ClampBar value={r.overallPct / 100} color={t.color} /></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: status.c, flexShrink: 0, textAlign: 'right' }}>{status.t}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: r.ready ? '#16A34A' : t.color, flexShrink: 0, width: 42, textAlign: 'right' }}>{r.overallPct}%</span>
          </div>
          {isOpen && <div style={{ padding: '6px 0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>
            <div><CapacityLine r={r} accent={t.color} teamId={t.id} onFix={onFix} /></div>
            <div style={{ borderLeft: '1px solid #ECECEF', paddingLeft: 24 }}><ShortfallList staff={ts} shifts={tsh} teamId={t.id} onFix={onFix} cfg={cfg} /></div>
          </div>}
        </Fragment>
      })}
    </div>
  </div>
}

// ── availability grid — one row per person, days across, cell = their availability that day ──
const GRID_TH = { fontSize: 11, fontWeight: 700, padding: '6px 6px 10px', textAlign: 'center' }
export function AvailabilityGrid({ groups, cfg, selectedId, onSelect, selectMode, selectedIds, onToggle }) {
  const [hoverId, setHoverId] = useState(null)
  const interactive = !!onSelect || !!selectMode
  const grouped = groups.length > 1
  const cell = { padding: '4px 4px', verticalAlign: 'middle' }
  const block = { height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }
  const total = groups.reduce((n, g) => n + g.staff.length, 0)
  return <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, tableLayout: 'fixed' }}>
      <colgroup><col style={{ width: 170 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
      <thead><tr><th style={{ ...GRID_TH, textAlign: 'left', position: 'sticky', left: 0, background: '#fff', minWidth: 170 }} />{DAYS.map((d, i) => <th key={d} style={{ ...GRID_TH, color: cfg.openDays.includes(i) ? '#374151' : '#C4C4CC' }}>{d}</th>)}</tr></thead>
      <tbody>
        {total === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '32px 0' }}>No staff yet — add someone to map their availability.</td></tr>}
        {groups.map((g) => <Fragment key={g.name}>
          {grouped && <tr><td colSpan={8} style={{ padding: '12px 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: g.color }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: g.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{g.name}</span>
              <div style={{ flex: 1, height: 1, background: '#F0F0F2' }} />
            </div>
          </td></tr>}
          {grouped && g.staff.length === 0 && <tr><td colSpan={8} style={{ color: '#C4C4CC', fontSize: 12, padding: '4px 0 10px 18px' }}>No staff in this team yet.</td></tr>}
          {g.staff.map((s) => {
            const accent = g.color
            const sel = selectedId === s.id, checked = selectedIds?.has(s.id), hov = interactive && hoverId === s.id
            const rowBg = sel && !selectMode ? accent + '14' : (hov ? '#F4F5F8' : 'transparent')
            const active = rowBg !== 'transparent'
            const bar = sel && !selectMode ? accent : (hov ? accent + '66' : null)
            return <tr key={s.id} onClick={() => (interactive ? (selectMode ? onToggle?.(s.id) : onSelect?.(s.id)) : null)} onMouseEnter={() => interactive && setHoverId(s.id)} onMouseLeave={() => interactive && setHoverId(null)} style={{ cursor: interactive ? 'pointer' : 'default', transition: 'background .1s' }}>
              <td style={{ ...cell, position: 'sticky', left: 0, background: active ? rowBg : '#fff', borderTopLeftRadius: active ? 10 : 0, borderBottomLeftRadius: active ? 10 : 0, boxShadow: bar ? `inset 3px 0 0 ${bar}` : 'none' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, fontWeight: sel ? 800 : 600, color: '#111827' }}>
                  {selectMode
                    ? <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `1.5px solid ${checked ? accent : '#D1D5DB'}`, background: checked ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>{checked ? '✓' : ''}</span>
                    : <span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{initials(s.name)}</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{grouped ? s.name : first(s.name)}</span>
                  {s.keyholder && <KeyMark size={12} color={accent} />}
                </span>
              </td>
              {ALL.map((d) => {
                const a = s.avail?.[d], closed = !cfg.openDays.includes(d)
                return <td key={d} style={{ ...cell, background: active ? rowBg : 'transparent', borderTopRightRadius: active && d === 6 ? 10 : 0, borderBottomRightRadius: active && d === 6 ? 10 : 0 }}>
                  {closed
                    ? <div style={{ ...block, background: 'repeating-linear-gradient(45deg, #DDDDE3, #DDDDE3 1.5px, transparent 1.5px, transparent 6px)' }} />
                    : a === true
                      ? <div style={{ ...block, background: accent, color: '#fff' }}>All day</div>
                      : Array.isArray(a)
                        ? <div style={{ ...block, background: accent + '1A', border: `1px solid ${accent}55`, color: accent }}>{fmt(a[0])}–{fmt(a[1])}</div>
                        : <div style={{ ...block, border: '1.5px dashed #D5D7DD' }} />}
                </td>
              })}
            </tr>
          })}
        </Fragment>)}
      </tbody>
    </table>
  </div>
}
export function AvailKey({ accent }) {
  const item = (box, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#6B7280' }}>{box}<span>{label}</span></span>
  const sw = { width: 22, height: 14, borderRadius: 4, flexShrink: 0 }
  return <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
    {item(<span style={{ ...sw, background: accent }} />, 'Available all day')}
    {item(<span style={{ ...sw, background: accent + '1A', border: `1px solid ${accent}55` }} />, 'Set hours (e.g. 1pm–5pm)')}
    {item(<span style={{ ...sw, border: '1.5px dashed #D5D7DD' }} />, 'Not available')}
    {item(<span style={{ ...sw, background: 'repeating-linear-gradient(45deg, #DDDDE3, #DDDDE3 1.5px, transparent 1.5px, transparent 6px)' }} />, 'Closed')}
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
const fromApi = (r) => ({ id: r.id, team_id: r.team_id, name: r.name, role: r.role, contracted: r.contracted_hours, max: r.max_hours, wage: r.hourly_rate, pay_basis: r.pay_basis || 'hourly', annual_salary: r.annual_salary || 0, annualised_hours: r.annualised_hours || 0, keyholder: r.keyholder, avail: r.availability || {} })
const toApi = (s) => ({ team_id: s.team_id, name: s.name, role: s.role, contracted_hours: s.contracted, max_hours: s.max, hourly_rate: s.wage, pay_basis: s.pay_basis || 'hourly', annual_salary: s.annual_salary ?? 0, annualised_hours: s.annualised_hours ?? 0, keyholder: s.keyholder, availability: s.avail })

export default function StaffPage() {
  const [teams, setTeams] = useState([])
  const [location, setLocation] = useState(null)
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('clean')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  useEffect(() => {
    (async () => {
      try {
        const [tr, lr, shr, str] = await Promise.all([fetch('/api/teams'), fetch('/api/location'), fetch('/api/shifts'), fetch('/api/staff')])
        const td = await tr.json(), ld = await lr.json(), shd = await shr.json(), std = await str.json()
        const withColor = (Array.isArray(td) ? td : []).map((t, i) => ({ id: t.id, name: t.name, color: TEAM_COLORS[i % TEAM_COLORS.length] }))
        setTeams(withColor); setLocation(ld || null); setShifts(Array.isArray(shd) ? shd : []); setStaff((Array.isArray(std) ? std : []).map(fromApi)); setTeamId('all')
      } catch (e) { console.error('Failed to load staff page', e) } finally { setLoading(false) }
    })()
  }, [])

  const cfg = useMemo(() => {
    const business = location?.business || { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: null }
    const openDays = ALL.filter((d) => business[d])
    const opens = openDays.map((d) => business[d][0]), closes = openDays.map((d) => business[d][1])
    const open = opens.length ? Math.min(...opens) : 9, close = closes.length ? Math.max(...closes) : 17
    return { business, openDays, slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
  }, [location])

  const accent = teams.find((t) => t.id === teamId)?.color || PINK
  const isAll = teamId === 'all'
  const teamStaff = useMemo(() => staff.filter((s) => s.team_id === teamId), [staff, teamId])
  const teamShifts = useMemo(() => shifts.filter((s) => s.team_id === teamId), [shifts, teamId])
  const selected = staff.find((s) => s.id === selectedId)
  // switching teams clears multi-select but NOT the selected person — adding/clicking from the
  // all-teams view jumps you into that team with their inspector already open.
  useEffect(() => { setSelectMode(false); setSelectedIds(new Set()) }, [teamId])
  useEffect(() => { setSaveState('clean') }, [selectedId])

  const patch = useCallback((id, p) => { setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setSaveState('dirty') }, [])
  const persist = useCallback(async (s) => { const res = await fetch('/api/staff', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, ...toApi(s) }) }); if (res.ok) { const saved = fromApi(await res.json()); setStaff((prev) => prev.map((x) => (x.id === s.id ? saved : x))) } }, [])
  const saveStaff = useCallback(async (s) => { setSaveState('saved'); await persist(s); setTimeout(() => setSaveState((x) => (x === 'saved' ? 'clean' : x)), 1500) }, [persist])
  const addStaff = useCallback(async (tId, over = {}) => {
    const draft = { team_id: tId, name: over.name || 'New staff member', role: over.role || '', contracted: over.contracted ?? 0, max: over.max ?? 40, wage: over.wage ?? 11.44, pay_basis: over.pay_basis || 'hourly', annual_salary: over.annual_salary ?? 0, annualised_hours: over.annualised_hours ?? 0, keyholder: over.keyholder ?? false, avail: over.avail || allDayAvail(cfg.openDays) }
    const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(draft)) })
    if (!res.ok) return
    const created = fromApi(await res.json())
    setStaff((prev) => [...prev, created])
    if (!over.noSelect) { setTeamId(tId); setSelectedId(created.id); setSaveState('clean') }
  }, [cfg])
  const removeStaff = useCallback(async (id) => { await fetch(`/api/staff?id=${id}`, { method: 'DELETE' }); setStaff((prev) => prev.filter((s) => s.id !== id)); setSelectedId(null) }, [])
  const toggleSelect = useCallback((id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) => fetch(`/api/staff?id=${id}`, { method: 'DELETE' })))
    setStaff((prev) => prev.filter((s) => !selectedIds.has(s.id)))
    setSelectMode(false); setSelectedIds(new Set()); setSelectedId(null)
  }, [selectedIds])
  const applyFix = useCallback(async (tId, fix) => {
    if (fix.kind === 'addstaff') { await addStaff(tId, { contracted: fix.contracted ?? 0, keyholder: !!fix.kh, name: fix.kh ? 'New keyholder' : 'New team member', avail: allDayAvail(cfg.openDays), noSelect: true }); return }
    const target = staff.find((s) => s.id === fix.id)
    if (!target) return
    let updated
    if (fix.kind === 'keyholder') updated = { ...target, keyholder: true }
    else if (fix.kind === 'fullweek') updated = { ...target, avail: allDayAvail(cfg.openDays) }
    else if (fix.kind === 'adddays') updated = { ...target, avail: { ...target.avail, ...Object.fromEntries(fix.days.map((d) => [d, [fix.start, fix.end]])) } }
    else { const a = { ...target.avail }; for (const d of fix.days) { const cur = a[d]; if (Array.isArray(cur)) a[d] = [Math.min(cur[0], fix.start), Math.max(cur[1], fix.end)] } updated = { ...target, avail: a } }
    setStaff((prev) => prev.map((s) => (s.id === fix.id ? updated : s)))
    await persist(updated)
  }, [staff, addStaff, persist, cfg])

  if (loading) return <div style={{ fontFamily: FONT, padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading staff…</div>
  if (teams.length === 0) return <div style={{ fontFamily: FONT, padding: 60, textAlign: 'center', color: '#6B7280' }}>No teams yet. Finish onboarding to add teams first.</div>

  const tabs = [{ id: 'all', name: 'All teams' }, ...teams]
  const panel = { background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 20, boxShadow: '0 3px 10px rgba(17,24,39,.06), 0 1px 2px rgba(17,24,39,.04)' }
  const teamName = teams.find((t) => t.id === teamId)?.name || ''
  const khGaps = locationKeyholderGaps(staff, shifts, cfg)
  const khFlag = khGaps.noKeyholder || khGaps.openMissing.length > 0 || khGaps.closeMissing.length > 0

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 24px 0' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: -0.3 }}>Staff</h1>
      <p style={{ fontSize: 13.5, color: '#6B7280', margin: '5px 0 0' }}>Your team members, their contracts and availability.</p>
    </div>
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', background: '#F1F1F4', borderRadius: 11, padding: 4, gap: 2 }}>
        {tabs.map((t) => {
          const active = t.id === teamId
          const count = t.id === 'all' ? staff.length : staff.filter((s) => s.team_id === t.id).length
          return <button key={t.id} onClick={() => { setTeamId(t.id); setSelectedId(null) }} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', color: active ? '#111827' : '#9CA3AF', background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>{t.id !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />}{t.name}<span style={{ fontSize: 11, fontWeight: 700, color: active ? (t.color || PINK) : '#C4C4CC' }}>{count}</span></button>
        })}
      </div>
      {!isAll && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {selectMode ? <>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', marginRight: 2 }}>{selectedIds.size} selected</span>
          <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 14px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={bulkDelete} disabled={selectedIds.size === 0} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: selectedIds.size ? '#EF4444' : '#E5E7EB', border: 'none', borderRadius: 9, padding: '9px 16px', cursor: selectedIds.size ? 'pointer' : 'default' }}>Delete{selectedIds.size ? ` ${selectedIds.size}` : ''}</button>
        </> : <>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', marginRight: 2 }}>{teamStaff.length} {teamStaff.length === 1 ? 'person' : 'people'}</span>
          {teamStaff.length > 0 && <button onClick={() => setSelectMode(true)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 14px', cursor: 'pointer' }}>Select</button>}
          <button onClick={() => addStaff(teamId)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: accent, border: 'none', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}>+ Add staff</button>
        </>}
      </div>}
    </div>
    {khFlag && <div style={{ maxWidth: 640, margin: '0 auto 10px', padding: '11px 14px', borderRadius: 10, background: AMBER + '14', border: `1px solid ${AMBER}40`, fontSize: 12.5, color: '#92660B', lineHeight: 1.45, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ marginTop: 2 }}><KeyMark size={14} color={AMBER} /></span>
      <span>{khGaps.noKeyholder
        ? <>No keyholders set — mark at least one person as a keyholder so someone can open &amp; close the location.</>
        : <>No keyholder available to {khGaps.openMissing.length ? `open ${khGaps.openMissing.map((d) => DAYS[d]).join(', ')}` : ''}{khGaps.openMissing.length && khGaps.closeMissing.length ? ' · ' : ''}{khGaps.closeMissing.length ? `close ${khGaps.closeMissing.map((d) => DAYS[d]).join(', ')}` : ''}. Widen a keyholder’s availability or add another keyholder. <span style={{ color: '#6B7280' }}>(One keyholder covers the whole location — not per team.)</span></>}</span>
    </div>}

    {isAll ? (
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '4px 24px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <AllTeams teams={teams} staff={staff} shifts={shifts} onFix={applyFix} cfg={cfg} />
        {/* whole-location availability — same idea as Shifts' all-teams full rota */}
        <div style={panel}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>All availability <span style={{ color: '#9CA3AF', fontWeight: 600 }}>· whole location</span></div>
          <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 12 }}>Everyone’s week at a glance — click anyone to jump into their team and edit.</div>
          <AvailabilityGrid groups={teams.map((t) => ({ name: t.name, color: t.color, staff: staff.filter((s) => s.team_id === t.id) }))} cfg={cfg} onSelect={(id) => { const st = staff.find((x) => x.id === id); if (st) { setTeamId(st.team_id); setSelectedId(st.id) } }} />
          <AvailKey accent={PINK} />
        </div>
      </div>
    ) : (
      // mirrors Shifts: inspector sticky-left; availability grid + key + coverage on the right
      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '2px 24px 40px', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ ...panel, position: 'sticky', top: 16 }}>
          <Inspector key={selected?.id || 'none'} s={selected} patch={(p) => patch(selected.id, p)} onDelete={() => removeStaff(selected.id)} saveState={saveState} onSave={() => saveStaff(selected)} accent={accent} cfg={cfg} />
        </div>
        <div style={panel}>
          {!selectMode && teamStaff.length > 0 && <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 12 }}>Click a staff member to edit them — their weekly availability shows in the grid.</div>}
          <AvailabilityGrid groups={[{ name: teamName, color: accent, staff: teamStaff }]} cfg={cfg} selectedId={selectedId} onSelect={setSelectedId} selectMode={selectMode} selectedIds={selectedIds} onToggle={toggleSelect} />
          <AvailKey accent={accent} />
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #ECECEF' }}>
            <TeamGlance staff={teamStaff} shifts={teamShifts} teamName={teamName} teamId={teamId} accent={accent} onFix={applyFix} cfg={cfg} wide />
          </div>
        </div>
      </div>
    )}
  </div>
}
