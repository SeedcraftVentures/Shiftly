'use client'

import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from 'react'
import { TEAM_COLORS } from '../staff/utils/staffHelpers'
import { useTheme, Card, Button, Pill, Tag, Ring, Icon, Ic, Switch, Stepper, DayPicker, TimeRange, Segmented, Input, Label, Tip, fmtTime, EASE, THEMES } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  SHIFTS PAGE (live), Apple-esque rebuild on the shared kit.
//  UX brain kept from production: smart structural gap suggestions, extend-vs-add
//  adjacency fixes, "mark intentional" escape hatch, pin/length shortcuts, bulk
//  select. Visual/architecture from the lab: single-team = shift CARDS + a
//  ring-led week glance; all-teams = the coverage matrix + full rota grid.
//  Saving is now AUTOSAVE (debounced), no lossy explicit-save step.
//  NOTE: Inspector + TeamRotaGrid are imported by /try-me, keep their prop
//  signatures + readOnly behaviour stable.
// ════════════════════════════════════════════════════════════════════════════

const fmt = fmtTime
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4]
const WEEKEND = [5, 6]
// try-me renders these components OUTSIDE the ThemeProvider, fall back to light.
const LIGHT = THEMES.light

// ── pure helpers (theme-agnostic) ─────────────────────────────────────────────
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
export function coveragePct(shifts, cfg) {
  let open = 0
  for (const d of cfg.openDays) open += cfg.business[d][1] - cfg.business[d][0]
  const gapHours = teamGaps(shifts, cfg).reduce((s, g) => s + (g.to - g.from), 0)
  return open ? Math.round(((open - gapHours) / open) * 100) : 100
}
// the pin is an EXPLICIT stored choice (maps to/from anchor_type, no schema change)
const withPin = (s) => ({ ...s, pin: s.pin || (s.anchor_type === 'open' ? 'open' : s.anchor_type === 'close' ? 'close' : 'none') })
const pinToAnchor = (pin) => (pin === 'open' ? 'open' : pin === 'close' ? 'close' : 'fixed')
const autoName = (pin) => (pin === 'open' ? 'Open' : pin === 'close' ? 'Close' : 'Custom')
const isAutoName = (name) => !name || name === 'New shift' || ['Open', 'Close', 'Custom'].includes(name)
const sameSet = (a, b) => [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join()
const scopeLabel = (days, cfg) => sameSet(days, cfg.openDays) ? 'Full-week' : sameSet(days, WEEKDAYS.filter((d) => cfg.openDays.includes(d))) ? 'Weekday' : sameSet(days, WEEKEND.filter((d) => cfg.openDays.includes(d))) ? 'Weekend' : days.map((d) => DAYS[d]).join(' ')
// smart gaps, structural suggestions (full-week/weekday/weekend open or close) + interior windows
function smartGaps(shifts, cfg) {
  const EPS = 0.01, openMissing = [], closeMissing = [], mids = []
  for (const d of cfg.openDays) {
    const [open, close] = cfg.business[d]
    const ds = shifts.filter((s) => s.days.includes(d))
    if (!ds.some((s) => s.start <= open + EPS)) openMissing.push(d)
    if (!ds.some((s) => s.end >= close - EPS)) closeMissing.push(d)
    for (const [a, b] of dayGapsFor(shifts, d, cfg)) { if (a > open + EPS && b < close - EPS) mids.push({ kind: 'mid', day: d, from: a, to: b, label: `${DAYS[d]} ${fmt(a)}-${fmt(b)}` }) }
  }
  const out = []
  if (openMissing.length) out.push({ kind: 'open', days: openMissing, label: `${scopeLabel(openMissing, cfg)} open` })
  if (closeMissing.length) out.push({ kind: 'close', days: closeMissing, label: `${scopeLabel(closeMissing, cfg)} close` })
  return out.concat(mids)
}
function suggestFor(shifts, gap) {
  const before = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.end - gap.from) < 0.01)
  const after = shifts.find((s) => s.days.includes(gap.day) && Math.abs(s.start - gap.to) < 0.01)
  if (before) return { label: `Extend “${before.name}” to ${fmt(gap.to)}`, kind: 'end', target: before.id, value: gap.to }
  if (after) return { label: `Start “${after.name}” at ${fmt(gap.from)}`, kind: 'start', target: after.id, value: gap.from }
  return { label: `Add a ${fmt(gap.from)}-${fmt(gap.to)} shift`, kind: 'add', day: gap.day, from: gap.from, to: gap.to }
}

// ── inspector (shared with /try-me · keep signature + readOnly stable) ─────────
function SaveStatus({ T, state }) {
  const cfg = state === 'saving' ? { c: T.muted, t: 'Saving…' } : state === 'saved' ? { c: T.green, t: 'Saved' } : state === 'error' ? { c: T.red, t: 'Couldn’t save,retry' } : null
  if (!cfg) return null
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: cfg.c }}>
    {state === 'saved' && <Icon path={Ic.check} size={13} stroke={2.6} />}{cfg.t}
  </span>
}
export function Inspector({ shift, patch, onDelete, saveState, onSave, accent, cfg, tips = false, readOnly = false }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const curLen = shift ? Math.round((shift.end - shift.start) * 10) / 10 : 0
  const [lenMode, setLenMode] = useState(() => ([4, 8, 12].includes(curLen) ? String(curLen) : 'custom'))
  if (!shift) return (
    <div style={{ color: T.faint, fontSize: 13.5, textAlign: 'center', marginTop: 90, lineHeight: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <span style={{ width: 52, height: 52, borderRadius: 16, background: T.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.faint }}><Icon path={Ic.shifts} size={24} /></span>
      Select a shift to edit<br />its properties here.
    </div>
  )
  const L = shift.end - shift.start
  const anchor = shift.pin || 'none'
  const brkMins = shift.break_duration_mins || 0
  const unpaidH = shift.break_type === 'paid' ? 0 : brkMins / 60
  const paidH = Math.round((curLen - unpaidH) * 10) / 10
  const rename = (p, a) => { if (isAutoName(shift.name)) p.name = autoName(a); return p }
  const setAnchor = (a) => {
    const p = { pin: a }
    if (a === 'open') { p.start = cfg.open; p.end = Math.min(cfg.close, cfg.open + L) }
    else if (a === 'close') { p.start = Math.max(cfg.open, cfg.close - L); p.end = cfg.close }
    patch(rename(p, a))
  }
  const setLen = (n) => {
    setLenMode(String(n))
    if (anchor === 'open') patch({ start: cfg.open, end: Math.min(cfg.close, cfg.open + n) })
    else if (anchor === 'close') patch({ start: Math.max(cfg.open, cfg.close - n), end: cfg.close })
    else patch({ end: Math.min(cfg.close, shift.start + n) })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div data-tour="shift-name">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <Label>Shift name</Label>
          {!readOnly && <button onClick={onDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: T.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, padding: 0 }}><Icon path="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" size={14} stroke={1.8} />Delete</button>}
        </div>
        <Tip text="Rename your shift, or keep the auto name" on={tips} style={{ display: 'block' }}><Input value={shift.name} onChange={(e) => patch({ name: e.target.value })} accent={accent} /></Tip>
      </div>
      <div data-tour="shift-pin">
        <Label style={{ marginBottom: 9 }}>Pin to</Label>
        <Tip text="Pin it to your opening time, your closing time, or leave it free" on={tips} style={{ display: 'block' }}>
          <Segmented full accent={accent} value={anchor} onChange={(v) => setAnchor(v)} options={[{ value: 'open', label: 'Open' }, { value: 'none', label: 'No pin' }, { value: 'close', label: 'Close' }]} />
        </Tip>
      </div>
      <div data-tour="shift-length">
        <Label style={{ marginBottom: 9 }}>Length</Label>
        <Segmented full accent={accent} value={lenMode} onChange={(v) => (v === 'custom' ? setLenMode('custom') : setLen(Number(v)))} options={[{ value: '4', label: '4h' }, { value: '8', label: '8h' }, { value: '12', label: '12h' }, { value: 'custom', label: 'Custom' }]} />
      </div>
      <div>
        <Label>{fmt(shift.start)} - {fmt(shift.end)} · {curLen}h at venue{unpaidH > 0 && <span style={{ color: T.muted, fontWeight: 700 }}> · {paidH}h paid</span>}{anchor !== 'none' && <span style={{ color: accent, fontWeight: 700 }}> · {anchor === 'open' ? 'opens' : 'closes'}</span>}</Label>
        <div style={{ marginTop: 11 }}><TimeRange start={shift.start} end={shift.end} onChange={(start, end) => { setLenMode('custom'); patch({ start, end }) }} accent={accent} domain={cfg.slider} /></div>
      </div>
      <div>
        <Label style={{ marginBottom: 9 }}>Break</Label>
        <Segmented full accent={accent} value={String(brkMins)} onChange={(v) => patch({ break_duration_mins: Number(v) })} options={[{ value: '0', label: 'None' }, { value: '30', label: '30 min' }, { value: '60', label: '1 hr' }]} />
        {brkMins > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>Paid break {shift.break_type === 'paid' ? '(counts toward pay)' : '(unpaid, part of the shift)'}</span>
          <Switch on={shift.break_type === 'paid'} onChange={() => patch({ break_type: shift.break_type === 'paid' ? 'unpaid' : 'paid' })} accent={accent} />
        </div>}
      </div>
      <div data-tour="shift-days"><Label style={{ marginBottom: 9 }}>Runs on</Label><DayPicker days={shift.days} onChange={(days) => patch({ days })} openDays={cfg.openDays} accent={accent} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'end' }}>
        <div data-tour="shift-staff"><Label style={{ marginBottom: 9 }}>Staff needed</Label><Stepper value={shift.staff} onChange={(staff) => patch({ staff })} min={1} max={20} accent={accent} /></div>
        <div data-tour="shift-keyholder"><Label style={{ marginBottom: 9 }}>Keyholder</Label>
          <Tip text="Whether this shift must be covered by someone who can lock up" on={tips} style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: T.r.md, background: T.card, border: `1px solid ${T.border}` }}>
              <Switch on={shift.keyholder} onChange={() => patch({ keyholder: !shift.keyholder })} accent={accent} />
            </div>
          </Tip>
        </div>
      </div>
      {/* legacy explicit-save button,only if a parent opts in via onSave (try-me passes readOnly, so hidden) */}
      {!readOnly && onSave && <Button full accent={accent} disabled={saveState !== 'dirty'} onClick={onSave}>Save shift</Button>}
    </div>
  )
}

// ── shift card (single-team list) ──────────────────────────────────────────────
function ShiftCard({ shift, selected, onClick, accent, cfg, selectMode = false, checked = false }) {
  const { T } = useTheme()
  const preset = activePreset(shift.days, cfg.openDays)
  const dayLabel = preset === 'all' ? 'Every open day' : preset === 'weekdays' ? 'Weekdays' : preset === 'weekend' ? 'Weekends' : shift.days.map((d) => DAYS[d]).join(' ')
  const active = selectMode ? checked : selected
  const [h, setH] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: T.card, WebkitBackdropFilter: T.blur, backdropFilter: T.blur, borderRadius: 18, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${active ? accent : T.border}`, boxShadow: active ? `0 0 0 3px ${accent}22, ${T.shadow.md}` : (h ? T.shadowHover : T.shadow.md), transform: h && !active ? 'translateY(-2px)' : 'none', transition: `all .3s ${EASE}` }}>
      <div style={{ height: 3, background: T.track }}><div style={{ width: `${Math.round(completeness(shift) * 100)}%`, height: '100%', background: accent, transition: `width .4s ${EASE}` }} /></div>
      <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 13 }}>
        {selectMode && <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checked ? accent : T.faint}`, background: checked ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{checked && <Icon path={Ic.check} size={13} stroke={3} />}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>{shift.name}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: T.subtle, color: T.muted, letterSpacing: '0.03em' }}>{designation(shift, cfg).toUpperCase()}</span>
            {shift.keyholder && <Icon path={Ic.key} size={13} stroke={2} color={accent} />}
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4, letterSpacing: '-0.01em' }}>{fmt(shift.start)}-{fmt(shift.end)} · {dayLabel} · {shift.staff} staff{shift.break_duration_mins ? ` · ${shift.break_duration_mins === 60 ? '1h' : shift.break_duration_mins + 'm'} break` : ''}</div>
        </div>
        {!selectMode && <Icon path={Ic.chevron} size={17} stroke={2} color={T.faint} style={{ transform: h ? 'translateX(2px)' : 'none', transition: `transform .3s ${EASE}` }} />}
      </div>
    </div>
  )
}

// ── week at a glance ────────────────────────────────────────────────────────────
export function DayTimeline({ dayIndex, shifts, height = 11, color, cfg }) {
  const { T } = useTheme()
  color = color || T.pink
  const [dS, dE] = cfg.glance, span = (dE - dS) || 1
  const pct = (v) => ((Math.max(dS, Math.min(dE, v)) - dS) / span) * 100
  const bh = cfg.business[dayIndex]
  const dayShifts = shifts.filter((s) => s.days.includes(dayIndex))
  return <div style={{ position: 'relative', flex: 1, height, borderRadius: 999, background: T.subtle, overflow: 'hidden' }}>
    {!bh ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.faint }}>Closed</div> : <>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(bh[0])}%`, width: `${pct(bh[1]) - pct(bh[0])}%`, background: color + '2A' }} />
      {dayShifts.map((s) => <div key={s.id} style={{ position: 'absolute', top: 1.5, bottom: 1.5, left: `${pct(s.start)}%`, width: `${Math.max(2, pct(s.end) - pct(s.start))}%`, background: color, borderRadius: 999 }} title={`${s.name} ${fmt(s.start)}-${fmt(s.end)}`} />)}
      {/* close marker: the grey past here is closed, not a gap (days close at different times) */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(bh[1])}%`, width: 2, marginLeft: -1, background: T.body, borderRadius: 2 }} title={`Closes ${fmt(bh[1])}`} />
    </>}
  </div>
}
export function AxisTicks({ cfg, ml = 40 }) {
  const { T } = useTheme()
  const [dS, dE] = cfg.glance, span = (dE - dS) || 1
  const ticks = []; for (let h = Math.ceil(dS); h <= dE; h += 2) ticks.push(h)
  return <div style={{ position: 'relative', height: 12, marginLeft: ml }}>
    {ticks.map((h) => <span key={h} style={{ position: 'absolute', left: `${((h - dS) / span) * 100}%`, transform: 'translateX(-50%)', fontSize: 9.5, color: T.faint }}>{fmt(h)}</span>)}
  </div>
}
function Legend({ T, color }) {
  const item = (c, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.faint }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{label}</span>
  const line = (label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.faint }}><span style={{ width: 2, height: 11, borderRadius: 2, background: T.body }} />{label}</span>
  return <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>{item(color, 'Covered')}{item(color + '2A', 'Gap')}{item(T.subtle, 'Closed')}{line('Close')}</div>
}
// smart structural gap chips + the "this looks right" escape hatch
export function GapStrip({ shifts, onApply, accent, cfg, ok, onToggleOk }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const gaps = smartGaps(shifts, cfg)
  if (!gaps.length) return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: T.green }}><Icon path={Ic.check} size={15} stroke={2.4} />Every open hour is covered.</div>
  if (ok) return <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>✓ Marked as intentional, nothing to fill.{onToggleOk && <><br /><button onClick={onToggleOk} style={{ fontFamily: T.font, fontSize: 12.5, fontWeight: 600, color: accent, background: 'none', border: 'none', padding: '8px 0 0', cursor: 'pointer' }}>Show suggestions anyway</button></>}</div>
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 11 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{gaps.length} suggestion{gaps.length === 1 ? '' : 's'} to fill gaps</span>
      {onToggleOk && <button onClick={onToggleOk} title="This team's week is partial on purpose" style={{ fontFamily: T.font, fontSize: 11.5, fontWeight: 700, color: accent, background: 'none', border: 'none', padding: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>This looks right</button>}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{gaps.map((g, i) => <GapChip key={i} T={T} sug={g} onApply={onApply} accent={accent} />)}</div>
  </div>
}
function GapChip({ T, sug, onApply, accent }) {
  const [h, setH] = useState(false)
  return <button onClick={() => onApply(sug)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} title={`Add ${sug.label}`}
    style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', border: 'none', background: h ? T.subtleHover : T.subtle, color: T.body, transition: `all .15s ${EASE}` }}>
    <span style={{ width: 6, height: 6, borderRadius: 99, background: T.amber, flexShrink: 0 }} />
    {sug.label}
    <span style={{ color: accent, fontWeight: 700 }}>+ add</span>
  </button>
}
// adjacency fixes (extend/start an existing shift, else add)
function GapList({ T, shifts, teamId, onApply, cfg }) {
  const gaps = teamGaps(shifts, cfg)
  if (gaps.length === 0) return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: T.green }}><Icon path={Ic.check} size={15} stroke={2.4} />No gaps to fill.</div>
  return <>
    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>{gaps.length} gap{gaps.length === 1 ? '' : 's'} to fill</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {gaps.slice(0, 6).map((g, i) => {
        const sug = suggestFor(shifts, g)
        return <div key={i}>
          <div style={{ fontSize: 13, color: T.body, display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 7, lineHeight: 1.35 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: T.amber, flexShrink: 0, transform: 'translateY(-1px)' }} />
            <span><b style={{ color: T.ink }}>{DAY_FULL[g.day]}</b> {fmt(g.from)}-{fmt(g.to)}</span>
          </div>
          <button onClick={() => onApply(teamId, sug)} style={{ marginLeft: 13, fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.ink, background: T.subtle, border: 'none', borderRadius: 999, padding: '7px 13px', cursor: 'pointer' }}>↳ {sug.label}</button>
        </div>
      })}
    </div>
  </>
}
// single-team glance: ring + per-day timelines + smart gaps
function WeekGlance({ shifts, teamName, teamPct, accent, cfg, ok, onApply, onToggleOk }) {
  const { T } = useTheme()
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
      <Ring value={teamPct / 100} color={teamPct === 100 ? T.green : accent} size={72} stroke={9} />
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Week at a glance</div>
        <div style={{ fontSize: 12.5, color: accent, fontWeight: 600, marginTop: 2 }}>{teamName}</div>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
      {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 28, fontSize: 11.5, fontWeight: 600, color: cfg.business[d] ? T.muted : T.faint }}>{DAYS[d]}</span>
        <DayTimeline dayIndex={d} shifts={shifts} color={accent} cfg={cfg} />
      </div>)}
    </div>
    <AxisTicks cfg={cfg} />
    <div style={{ margin: '12px 0 16px' }}><Legend T={T} color={accent} /></div>
    <div style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 16 }}><GapStrip shifts={shifts} onApply={onApply} accent={accent} cfg={cfg} ok={ok} onToggleOk={onToggleOk} /></div>
  </div>
}

// ── all-teams matrix (collapsible rows) ────────────────────────────────────────
function AllMatrix({ teams, shifts, expanded, setExpanded, onApply, cfg, okTeams, onToggleOk }) {
  const { T } = useTheme()
  return <Card pad="4px 22px">
    {teams.map((t, idx) => {
      const ts = shifts.filter((s) => s.team_id === t.id)
      const pct = coveragePct(ts, cfg)
      const ok = okTeams.has(t.id), low = pct < 100, isOpen = expanded === t.id
      const sg = low && !ok ? smartGaps(ts, cfg).length : 0
      const status = pct === 100 ? { c: T.green, t: 'Fully covered' } : ok ? { c: T.muted, t: 'Marked intentional' } : { c: T.warnInk, t: sg ? `${sg} suggestion${sg === 1 ? '' : 's'} to fill` : 'Has gaps' }
      return <Fragment key={t.id}>
        <div onClick={() => setExpanded(isOpen ? null : t.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 0', borderTop: idx ? `1px solid ${T.hair}` : 'none', cursor: 'pointer' }}>
          <Icon path={Ic.chevron} size={15} stroke={2} color={T.faint} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: `transform .25s ${EASE}`, flexShrink: 0 }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color, flexShrink: 0 }} />
          <span style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, flexShrink: 0, letterSpacing: '-0.01em' }}>{t.name}</span>
          <span style={{ fontSize: 12, color: T.faint, fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}>· {ts.length} shift{ts.length === 1 ? '' : 's'}</span>
          <div style={{ flex: 1, minWidth: 30, maxWidth: 220, height: 9, borderRadius: 99, background: t.color + '22', overflow: 'hidden' }}><div style={{ width: `${Math.round(Math.min(1, pct / 100) * 100)}%`, height: '100%', background: t.color, borderRadius: 99, transition: 'width .3s' }} /></div>
          <span style={{ fontSize: 12, fontWeight: 600, color: status.c, flexShrink: 0, textAlign: 'right' }}>{status.t}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? T.green : ok ? T.muted : t.color, flexShrink: 0, width: 48, textAlign: 'right' }}>{ok && low ? '✓ ' : ''}{pct}%</span>
        </div>
        {isOpen && <div style={{ padding: '2px 0 18px' }}>
          {low && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: ok ? T.green + '14' : T.subtle, border: `1px solid ${ok ? T.green + '44' : T.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: ok ? T.green : T.muted }}>{ok ? '✓ Marked as intentional, the gaps below are expected.' : `${t.name} covers ${pct}% of opening hours. If that's deliberate, mark it as fine.`}</span>
            <Button size="sm" accent={t.color} variant={ok ? 'secondary' : 'primary'} onClick={(e) => { e.stopPropagation(); onToggleOk(t.id) }}>{ok ? 'Undo' : 'Looks right'}</Button>
          </div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 24, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 10 }}>{t.name} this week</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 28, fontSize: 11.5, fontWeight: 600, color: cfg.business[d] ? T.muted : T.faint }}>{DAYS[d]}</span>
                  <DayTimeline dayIndex={d} shifts={ts} color={t.color} cfg={cfg} />
                </div>)}
              </div>
              <AxisTicks cfg={cfg} />
            </div>
            <div style={{ borderLeft: `1px solid ${T.hair}`, paddingLeft: 20 }}>
              <GapStrip shifts={ts} onApply={(sug) => onApply(t.id, sug)} accent={t.color} cfg={cfg} ok={ok} onToggleOk={() => onToggleOk(t.id)} />
            </div>
          </div>
        </div>}
      </Fragment>
    })}
  </Card>
}

// ── team rota-grid (all-teams overview · shared with /try-me) ───────────────────
export function TeamRotaGrid({ groups, cfg, selectedId, onSelect, selectMode, selectedIds, onToggle }) {
  const ctx = useTheme(); const T = ctx.T || LIGHT
  const [hoverKey, setHoverKey] = useState(null)
  const interactive = !!onSelect
  const dark = T.name === 'dark'

  // One row per POSITION, not per shift. The k-th shift (by start) of each
  // day-group merges into a single line, so a role that runs different hours on
  // weekdays vs the weekend reads as one row with per-day times. The count then
  // falls out like a real rota: staff-on per day along the bottom, hours per row
  // down the right, and a grand total for the whole place.
  const gross = (s) => Math.max(0, (s.end || 0) - (s.start || 0))
  const hrsFmt = (h) => { const v = Math.round(h * 2) / 2; return (Number.isInteger(v) ? v : v.toFixed(1)) + 'h' }
  const slotBase = (name) => (name && name.endsWith('s') ? name.slice(0, -1) : name || 'Staff')

  // One position per shift NAME: patterns of the same slot (its weekday, Saturday
  // and Sunday times) collapse into a single row with per-day times. Ordered by
  // earliest start, so the opener is row 1 and the closer is last.
  const positionsFor = (shifts) => {
    const byName = {}
    for (const s of shifts) {
      const key = s.name || `#${s.id}`
      const p = (byName[key] ||= { byDay: {}, primaryStart: 0, maxDays: -1, anchor: null, sample: null })
      p.sample = p.sample || s
      // order/label off the pattern that covers the most days (the "primary" hours)
      if ((s.days?.length || 0) > p.maxDays) { p.maxDays = s.days.length; p.primaryStart = s.start ?? 0; p.anchor = s.anchor_type || s.pin || null }
      for (const d of s.days) p.byDay[d] = s
    }
    const rank = (p) => (p.anchor === 'open' ? -1 : p.anchor === 'close' ? 1 : 0)
    return Object.values(byName).sort((a, b) => rank(a) - rank(b) || a.primaryStart - b.primaryStart)
  }

  const data = groups.map((g) => {
    const positions = positionsFor(g.shifts)
    const dayCount = (d) => positions.reduce((n, p) => n + (p.byDay[d] ? 1 : 0), 0)
    const teamHrs = positions.reduce((sum, p) => sum + ALL.reduce((s, d) => s + (p.byDay[d] ? gross(p.byDay[d]) : 0), 0), 0)
    return { name: g.name, color: g.color, positions, dayCount, teamHrs }
  })
  const grandDay = (d) => data.reduce((n, t) => n + t.dayCount(d), 0)
  const grandHrs = data.reduce((s, t) => s + t.teamHrs, 0)
  const anyStaff = data.some((t) => t.positions.length > 0)

  const cell = { padding: '3px 4px', verticalAlign: 'middle' }
  const RTH = { fontSize: 11, fontWeight: 700, color: T.faint, padding: '4px 6px 10px', textAlign: 'center' }
  const totTop = `1px solid ${T.hair}`
  const sticky = { position: 'sticky', left: 0, background: T.cardSolid }

  return <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 780, tableLayout: 'fixed' }}>
      <colgroup><col style={{ width: 150 }} />{DAYS.map((d) => <col key={d} />)}<col style={{ width: 62 }} /></colgroup>
      <thead><tr>
        <th style={{ ...RTH, textAlign: 'left', ...sticky, minWidth: 150 }} />
        {DAYS.map((d) => <th key={d} style={RTH}><span style={{ fontWeight: 800, color: T.body }}>{d}</span></th>)}
        <th style={{ ...RTH, textTransform: 'uppercase', letterSpacing: '.04em' }}>Hrs/wk</th>
      </tr></thead>
      <tbody>
        {!anyStaff && <tr><td colSpan={9} style={{ textAlign: 'center', color: T.faint, fontSize: 13, padding: '24px 0' }}>No shifts yet, add one to see the week build up.</td></tr>}
        {data.map((t) => <Fragment key={t.name}>
          {groups.length > 1 && t.positions.length > 0 && <tr><td colSpan={9} style={{ padding: '14px 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: t.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t.name}</span>
              <div style={{ flex: 1, height: 1, background: T.hair }} />
            </div>
          </td></tr>}
          {t.positions.map((p, i) => {
            const hint = t.positions.length === 1 ? 'all day' : i === 0 ? 'opens' : i === t.positions.length - 1 ? 'closes' : 'mid'
            const wk = ALL.reduce((s, d) => s + (p.byDay[d] ? gross(p.byDay[d]) : 0), 0)
            const rowKey = `${t.name}-${i}`
            const sel = interactive && p.sample && p.sample.id === selectedId
            const hov = interactive && hoverKey === rowKey
            const rowBg = sel ? t.color + '14' : (hov ? T.subtle : 'transparent')
            const stickyBg = rowBg !== 'transparent' ? `linear-gradient(0deg,${rowBg},${rowBg}),${T.cardSolid}` : T.cardSolid
            return <tr key={rowKey} onMouseEnter={() => interactive && setHoverKey(rowKey)} onMouseLeave={() => interactive && setHoverKey(null)} style={{ transition: 'background .1s' }}>
              <td style={{ ...cell, ...sticky, background: stickyBg }}>
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{slotBase(t.name)} {i + 1}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: T.faint }}>{hint}</span>
                </span>
              </td>
              {ALL.map((d) => {
                const s = p.byDay[d]
                return <td key={d} style={{ ...cell, background: rowBg }} onClick={interactive && s ? () => onSelect(s.id) : undefined} title={interactive && s ? 'Click to edit' : undefined}>
                  {s ? <div style={{ background: t.color + (dark ? 'E0' : 'F2'), borderRadius: 9, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: interactive ? 'pointer' : 'default' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 10.5, whiteSpace: 'nowrap' }}>{fmt(s.start)}-{fmt(s.end)}</span>
                    {s.keyholder && <Icon path={Ic.key} size={10} stroke={2.2} color="#fff" />}
                  </div> : null}
                </td>
              })}
              <td style={{ ...cell, textAlign: 'center', fontSize: 12, fontWeight: 700, color: T.muted }}>{hrsFmt(wk)}</td>
            </tr>
          })}
          {t.positions.length > 0 && <tr>
            <td style={{ ...cell, ...sticky, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: T.muted, borderTop: totTop }}>On</td>
            {ALL.map((d) => <td key={d} style={{ ...cell, textAlign: 'center', fontSize: 13, fontWeight: 800, color: t.dayCount(d) ? T.ink : T.faint, borderTop: totTop }}>{t.dayCount(d) || '·'}</td>)}
            <td style={{ ...cell, textAlign: 'center', fontSize: 12, fontWeight: 800, color: T.muted, borderTop: totTop }}>{hrsFmt(t.teamHrs)}</td>
          </tr>}
        </Fragment>)}
        {anyStaff && <tr>
          <td style={{ ...cell, ...sticky, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: T.ink, borderTop: `1.5px solid ${T.line}`, paddingTop: 9 }}>Total staff</td>
          {ALL.map((d) => <td key={d} style={{ ...cell, textAlign: 'center', fontSize: 13.5, fontWeight: 800, color: T.pink, borderTop: `1.5px solid ${T.line}`, paddingTop: 9 }}>{grandDay(d)}</td>)}
          <td style={{ ...cell, textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: T.ink, borderTop: `1.5px solid ${T.line}`, paddingTop: 9 }}>{hrsFmt(grandHrs)}</td>
        </tr>}
      </tbody>
    </table>
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
export default function ShiftsPage() {
  const { T } = useTheme()
  const [teams, setTeams] = useState([])
  const [location, setLocation] = useState(null)
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [expanded, setExpanded] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [okTeams, setOkTeams] = useState(() => new Set())
  const shiftsRef = useRef(shifts); useEffect(() => { shiftsRef.current = shifts }, [shifts])
  const saveTimer = useRef(null), pending = useRef(null)

  useEffect(() => { try { setOkTeams(new Set(JSON.parse(localStorage.getItem('shiftly_coverage_ok') || '[]'))) } catch { } }, [])
  const toggleOk = useCallback((id) => setOkTeams((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); try { localStorage.setItem('shiftly_coverage_ok', JSON.stringify([...n])) } catch { } return n }), [])

  useEffect(() => {
    (async () => {
      try {
        const [tr, lr, sr] = await Promise.all([fetch('/api/teams'), fetch('/api/location'), fetch('/api/shifts')])
        const td = await tr.json(), ld = await lr.json(), sd = await sr.json()
        const withColor = (Array.isArray(td) ? td : []).map((t, i) => ({ id: t.id, name: t.name, color: TEAM_COLORS[i % TEAM_COLORS.length] }))
        setTeams(withColor); setLocation(ld || null); setShifts((Array.isArray(sd) ? sd : []).map(withPin)); setTeamId('all')
      } catch (e) { console.error('Failed to load shifts page', e) } finally { setLoading(false) }
    })()
  }, [])

  // Live refresh: the setup companion emits this after creating shifts, so they
  // appear here without a reload during the review step. Skips the shift replace
  // mid-save so an in-flight edit is never clobbered.
  useEffect(() => {
    const reload = async () => {
      try {
        const [tr, sr] = await Promise.all([fetch('/api/teams'), fetch('/api/shifts')])
        const td = await tr.json(), sd = await sr.json()
        if (Array.isArray(td)) setTeams(td.map((t, i) => ({ id: t.id, name: t.name, color: TEAM_COLORS[i % TEAM_COLORS.length] })))
        if (!pending.current && Array.isArray(sd)) setShifts(sd.map(withPin))
      } catch {}
    }
    window.addEventListener('shiftly:shifts-changed', reload)
    return () => window.removeEventListener('shiftly:shifts-changed', reload)
  }, [])

  const cfg = useMemo(() => {
    const business = location?.business || { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: null }
    const openDays = ALL.filter((d) => business[d])
    const opens = openDays.map((d) => business[d][0]), closes = openDays.map((d) => business[d][1])
    const open = opens.length ? Math.min(...opens) : 9, close = closes.length ? Math.max(...closes) : 17
    return { business, openDays, open, close, glance: [Math.floor(open), Math.ceil(close)], slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
  }, [location])

  const accent = teams.find((t) => t.id === teamId)?.color || T.pink
  const isAll = teamId === 'all'
  const teamShifts = useMemo(() => shifts.filter((s) => s.team_id === teamId), [shifts, teamId])
  const selected = shifts.find((s) => s.id === selectedId)
  // From the all-teams grid, jump to the shift's own team tab with it selected so
  // its inspector opens (the all-teams view has no inspector of its own).
  const openShift = useCallback((id) => {
    const sh = shifts.find((s) => s.id === id)
    if (sh) { setTeamId(sh.team_id); setSelectedId(id) }
  }, [shifts])
  // When the space shrinks (e.g. the companion drawer opens), drop the week glance to
  // its own full-width row instead of letting the 3 columns wrap and jump around.
  const rowRef = useRef(null)
  const [stackGlance, setStackGlance] = useState(false)
  useEffect(() => {
    const el = rowRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setStackGlance(e.contentRect.width < 880))
    ro.observe(el)
    return () => ro.disconnect()
  }, [isAll])
  useEffect(() => { setSelectMode(false); setSelectedIds(new Set()) }, [teamId])

  const ANCHOR = { Opening: 'open', Closing: 'close', Regular: 'fixed' }
  const toApi = useCallback((s) => ({ team_id: s.team_id, name: s.name, anchor_type: s.pin ? pinToAnchor(s.pin) : ANCHOR[designation(s, cfg)], start: s.start, end: s.end, days: s.days, staff: s.staff, keyholder: s.keyholder, break_duration_mins: s.break_duration_mins || 0, break_type: s.break_type || 'unpaid' }), [cfg])

  // ── autosave: debounced PUT; flush on shift-switch/unmount; real error state ──
  const doSave = useCallback(async (shift) => {
    if (!shift) return
    setSaveState('saving')
    try {
      const res = await fetch('/api/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: shift.id, ...toApi(shift) }) })
      if (!res.ok) throw new Error('save failed')
      const saved = await res.json()
      // don't clobber newer in-flight edits: only re-sync from the server if no fresher
      // pending change for this shift arrived while the request was in flight.
      setShifts((prev) => prev.map((s) => (s.id === shift.id && !(pending.current && pending.current.id === shift.id) ? withPin(saved) : s)))
      setSaveState((x) => (pending.current ? x : 'saved')); setTimeout(() => setSaveState((x) => (x === 'saved' ? 'idle' : x)), 1400)
    } catch { setSaveState('error') }
  }, [toApi])
  const flush = useCallback(() => { clearTimeout(saveTimer.current); const m = pending.current; pending.current = null; if (m) doSave(m) }, [doSave])
  const patch = useCallback((id, p) => {
    const base = (pending.current && pending.current.id === id) ? pending.current : shiftsRef.current.find((s) => s.id === id)
    const merged = { ...base, ...p }
    pending.current = merged
    setShifts((prev) => prev.map((s) => (s.id === id ? merged : s)))
    setSaveState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { const m = pending.current; pending.current = null; doSave(m) }, 650)
  }, [doSave])
  // switching shift (or leaving) flushes any pending edit for the previous one
  useEffect(() => () => { flush() }, [selectedId, flush])

  const toggleSelect = useCallback((id) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) => fetch(`/api/shifts?id=${id}`, { method: 'DELETE' })))
    setShifts((prev) => prev.filter((s) => !selectedIds.has(s.id)))
    setSelectMode(false); setSelectedIds(new Set()); setSelectedId(null)
  }, [selectedIds])

  const addShift = useCallback(async (tId, over = {}, jump = true) => {
    const pin = over.pin || 'open'
    const draft = { team_id: tId, pin, name: over.name || autoName(pin), start: over.start ?? cfg.open, end: over.end ?? Math.min(cfg.open + 8, cfg.close), days: over.days || WEEKDAYS.filter((d) => cfg.openDays.includes(d)), staff: 1, keyholder: false }
    const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(draft)) })
    if (!res.ok) return
    const created = await res.json()
    setShifts((prev) => [...prev, withPin(created)]); if (jump) { setTeamId(tId); setSelectedId(created.id) }
  }, [cfg, toApi])
  // apply a smart (structural) gap suggestion to a specific team. `open`/`close` cover ALL the
  // missing days in ONE shift; `mid` fills an interior window. `jump` opens that team's editor.
  const applyGapForTeam = useCallback((tId, sug, jump = false) => {
    if (sug.kind === 'mid') return addShift(tId, { pin: 'none', name: autoName('none'), start: sug.from, end: sug.to, days: [sug.day] }, jump)
    const start = sug.kind === 'open' ? cfg.open : Math.max(cfg.open, cfg.close - 8)
    const end = sug.kind === 'open' ? Math.min(cfg.close, cfg.open + 8) : cfg.close
    return addShift(tId, { pin: sug.kind, name: autoName(sug.kind), start, end, days: [...sug.days] }, jump)
  }, [addShift, cfg])
  const applyGap = useCallback((sug) => applyGapForTeam(teamId, sug, true), [applyGapForTeam, teamId])
  const removeShift = useCallback(async (id) => { await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' }); setShifts((prev) => prev.filter((s) => s.id !== id)); setSelectedId(null) }, [])
  const applySuggestion = useCallback(async (tId, s) => {
    if (s.kind === 'end' || s.kind === 'start') {
      const field = s.kind === 'end' ? 'end' : 'start'
      let updated
      setShifts((prev) => prev.map((x) => { if (x.id === s.target) { updated = { ...x, [field]: s.value }; return updated } return x }))
      if (updated) { const res = await fetch('/api/shifts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated.id, ...toApi(updated) }) }); if (res.ok) { const saved = await res.json(); setShifts((prev) => prev.map((x) => (x.id === saved.id ? withPin(saved) : x))) } }
    } else {
      const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi({ team_id: tId, pin: 'none', name: 'Cover', start: s.from, end: s.to, days: [s.day], staff: 1, keyholder: false })) })
      if (res.ok) { const created = await res.json(); setShifts((prev) => [...prev, withPin(created)]) }
    }
  }, [toApi])

  if (loading) return <div style={{ fontFamily: T.font, padding: 60, textAlign: 'center', color: T.faint }}>Loading shifts…</div>
  if (teams.length === 0) return <div style={{ fontFamily: T.font, padding: 60, textAlign: 'center', color: T.muted }}>No teams yet. Finish onboarding to add teams first.</div>

  const tabs = [{ id: 'all', name: 'All teams' }, ...teams]
  const teamName = teams.find((t) => t.id === teamId)?.name || ''
  const teamOk = okTeams.has(teamId)
  const teamPct = coveragePct(teamShifts, cfg)

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 1240, margin: '0 auto', padding: '40px 32px 64px' }}>
      {/* header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Shifts</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: '6px 0 0', letterSpacing: '-0.01em' }}>The shift patterns each team runs every week.</p>
      </div>

      {/* team segmented control */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', background: T.segBg, borderRadius: 999, padding: 4, gap: 2, flexWrap: 'wrap' }}>
          {tabs.map((t) => {
            const active = t.id === teamId
            const count = t.id === 'all' ? shifts.length : shifts.filter((s) => s.team_id === t.id).length
            return <button key={t.id} onClick={() => { setTeamId(t.id); setSelectedId(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.font, fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', color: active ? T.ink : T.muted, background: active ? T.card : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none', transition: `all .3s ${EASE}` }}>
              {t.id !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />}{t.name}
              <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? (t.color || T.pink) : T.faint }}>{count}</span>
            </button>
          })}
        </div>
      </div>

      {isAll ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AllMatrix teams={teams} shifts={shifts} expanded={expanded} setExpanded={setExpanded} onApply={applyGapForTeam} cfg={cfg} okTeams={okTeams} onToggleOk={toggleOk} />
          <Card solid pad={24}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14, letterSpacing: '-0.01em' }}>Full rota <span style={{ color: T.faint, fontWeight: 500 }}>· all teams · click a shift to edit it</span></div>
            <TeamRotaGrid groups={teams.map((t) => ({ name: t.name, color: t.color, shifts: shifts.filter((s) => s.team_id === t.id) }))} cfg={cfg} selectedId={selectedId} onSelect={openShift} />
          </Card>
        </div>
      ) : (
        <div>
          {/* toolbar sits ABOVE the three columns, so the first shift card, the inspector
              and the week-glance all start at the same height */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16, flexWrap: 'wrap', minHeight: 40 }}>
            {selectMode ? <>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{selectedIds.size} selected</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="secondary" onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}>Cancel</Button>
                <Button size="sm" variant="danger" disabled={selectedIds.size === 0} onClick={bulkDelete}>Delete{selectedIds.size ? ` ${selectedIds.size}` : ''}</Button>
              </div>
            </> : <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600, color: T.ink }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: accent }} />{teamName} shifts</span><span style={{ color: T.faint, fontWeight: 500 }}>· {teamShifts.length}</span><SaveStatus T={T} state={saveState} /></span>
              <div style={{ display: 'flex', gap: 8 }}>
                {teamShifts.length > 0 && <Button size="sm" variant="secondary" onClick={() => setSelectMode(true)}>Select</Button>}
                <Button size="sm" accent={accent} onClick={() => addShift(teamId)}><Icon path={Ic.plus} size={15} stroke={2.4} />Add shift</Button>
              </div>
            </>}
          </div>
          <div ref={rowRef} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* inspector */}
            <Card pad={24} style={{ position: 'sticky', top: 16, width: 340, flexShrink: 0, minHeight: 440 }}>
              <Inspector key={selected?.id || 'none'} shift={selected} patch={(p) => patch(selected.id, p)} onDelete={() => removeShift(selected.id)} accent={accent} cfg={cfg} />
            </Card>
            {/* shift cards */}
            <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {teamShifts.map((s) => <ShiftCard key={s.id} shift={s} selected={selectedId === s.id} onClick={() => (selectMode ? toggleSelect(s.id) : setSelectedId(s.id))} accent={accent} cfg={cfg} selectMode={selectMode} checked={selectedIds.has(s.id)} />)}
              {teamShifts.length === 0 && <Card style={{ textAlign: 'center', color: T.faint, fontSize: 13.5, padding: '54px 0' }}>No shifts yet. Add one to get started.</Card>}
            </div>
            {/* week glance */}
            <Card pad={24} style={{ position: stackGlance ? 'static' : 'sticky', top: 16, width: stackGlance ? '100%' : 320, flexShrink: 0 }}>
              <WeekGlance shifts={teamShifts} teamName={teamName} teamPct={teamPct} accent={accent} cfg={cfg} ok={teamOk} onApply={applyGap} onToggleOk={() => toggleOk(teamId)} />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
