'use client'

import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { TEAM_COLORS, coverageBottlenecks, availableHours, locationKeyholderGaps } from './utils/staffHelpers'
import { useTheme, Card, Button, Pill, Ring, Icon, Ic, Switch, Stepper, TimeRange, Segmented, Input, Label, EASE, fmtTime, THEMES } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  STAFF PAGE (live) - Apple-esque rebuild on the shared kit.
//  Kept from production: the availability grid, typeable steppers, three pay
//  bases, location-wide keyholder logic + warning, coverage bottleneck detection,
//  readiness engine + one-click fixes, bulk select. New: AUTOSAVE (no lossy save
//  button) and a DIRECTLY EDITABLE grid (click a day to set Off / All day / Hours).
//  NOTE: Inspector + AvailabilityGrid + AvailKey are imported by /try-me - keep
//  their prop signatures + readOnly behaviour stable. The grid stays read-only
//  unless an onEditDay handler is passed (try-me passes none).
// ════════════════════════════════════════════════════════════════════════════

const fmt = fmtTime
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4]
const WEEKEND = [5, 6]
const LIGHT = THEMES.light // try-me renders shared components outside the ThemeProvider

// ── pure helpers (theme-agnostic) ─────────────────────────────────────────────
const norm = (a) => [...a].sort((x, y) => x - y).join(',')
function activePreset(days, openDays) {
  const s = norm(days)
  if (s === norm(openDays)) return 'all'
  if (s === norm(WEEKDAYS.filter((d) => openDays.includes(d)))) return 'weekdays'
  if (s === norm(WEEKEND.filter((d) => openDays.includes(d)))) return 'weekend'
  return null
}
const initials = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const first = (name) => (name || '').split(' ')[0]
const allDayAvail = (openDays) => Object.fromEntries(openDays.map((d) => [d, true]))
const workDays = (s, cfg) => cfg.openDays.filter((d) => s.avail?.[d])
function windowForDay(s, d, cfg) { const a = s.avail?.[d]; if (!a) return null; return a === true ? cfg.business[d] : a }
function canWork(s, d, sh, cfg) { const w = windowForDay(s, d, cfg); if (!w) return false; return w[0] <= sh.start + 0.001 && w[1] >= sh.end - 0.001 }
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
  if (addCand) { const add = D.filter((d) => !addCand.avail?.[d]); if (add.length) return { label: `Add ${add.map((d) => DAYS[d]).join(', ')} to ${first(addCand.name)}'s availability`, kind: 'adddays', id: addCand.id, days: add, start: sh.start, end: sh.end } }
  const wideCand = teamStaff.find((st) => (!g.kh || st.keyholder) && D.some((d) => Array.isArray(st.avail?.[d]) && !canWork(st, d, sh, cfg)))
  if (wideCand) return { label: `Extend ${first(wideCand.name)}'s hours to cover ${fmt(sh.start)}-${fmt(sh.end)}`, kind: 'widen', id: wideCand.id, days: D, start: sh.start, end: sh.end }
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

// ── themed money input ─────────────────────────────────────────────────────────
function Money({ T, value, onChange, step = '0.25', suffix = '', accent }) {
  accent = accent || T.pink
  const [f, setF] = useState(false), [h, setH] = useState(false); const lit = f || h
  return <div style={{ position: 'relative' }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: lit ? accent : T.faint, transition: 'color .12s', zIndex: 1 }}>£</span>
    <input value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} onFocus={() => setF(true)} onBlur={() => setF(false)} type="number" step={step}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, background: T.card, padding: `12px ${suffix ? 44 : 13}px 12px 26px`, borderRadius: T.r.sm, border: `1px solid ${lit ? accent : T.border}`, outline: 'none', boxShadow: f ? T.ring(accent) : 'none', transition: 'border-color .12s, box-shadow .12s' }} />
    {suffix && <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: lit ? accent : T.faint, pointerEvents: 'none', transition: 'color .12s' }}>{suffix}</span>}
  </div>
}

// ── inspector (shared with /try-me · keep signature + readOnly stable) ─────────
function SaveStatus({ T, state }) {
  const c = state === 'saving' ? { c: T.muted, t: 'Saving…' } : state === 'saved' ? { c: T.green, t: 'Saved' } : state === 'error' ? { c: T.red, t: 'Couldn’t save, retry' } : null
  if (!c) return null
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c.c }}>{state === 'saved' && <Icon path={Ic.check} size={13} stroke={2.6} />}{c.t}</span>
}
export function Inspector({ s, patch, onDelete, saveState, onSave, accent, cfg, hidePay = false, readOnly = false }) {
  const { T } = useTheme()
  accent = accent || T.pink
  if (!s) return (
    <div style={{ color: T.faint, fontSize: 13.5, textAlign: 'center', marginTop: 90, lineHeight: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <span style={{ width: 52, height: 52, borderRadius: 16, background: T.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.faint }}><Icon path={Ic.staff} size={24} /></span>
      Select a staff member to<br />edit their details here.
    </div>
  )
  const shortAvail = availableHours(s, cfg) < s.contracted
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>{readOnly ? 'Staff details' : 'Edit staff'}</span>
        {!readOnly && <button onClick={onDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: T.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font }}><Icon path="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" size={14} stroke={1.8} />Delete</button>}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div data-tour="staff-name" style={{ flex: 1, minWidth: 0 }}><Label style={{ marginBottom: 8 }}>Name</Label><Input value={s.name} onChange={(e) => patch({ name: e.target.value })} accent={accent} /></div>
        <div data-tour="staff-role" style={{ flex: 1, minWidth: 0 }}><Label style={{ marginBottom: 8 }}>Role</Label><Input value={s.role || ''} onChange={(e) => patch({ role: e.target.value })} accent={accent} /></div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div data-tour="staff-contracted" style={{ flex: 1 }}><Label style={{ marginBottom: 8 }}>Contracted</Label><Stepper value={s.contracted} onChange={(v) => patch({ contracted: v })} min={0} max={60} suffix="h" full accent={accent} /></div>
        <div data-tour="staff-max" style={{ flex: 1 }}><Label style={{ marginBottom: 8 }}>Max / week</Label><Stepper value={s.max} onChange={(v) => patch({ max: v })} min={0} max={60} suffix="h" full accent={accent} /></div>
      </div>
      {!hidePay && <div>
        <Label style={{ marginBottom: 8 }}>Pay basis</Label>
        <Segmented full accent={accent} value={s.pay_basis || 'hourly'} onChange={(k) => patch({ pay_basis: k })} options={[{ value: 'hourly', label: 'Hourly' }, { value: 'salary', label: 'Salary' }, { value: 'annualised', label: 'Annualised' }]} />
        <div style={{ marginTop: 12 }}>
          {(s.pay_basis || 'hourly') === 'hourly' && <Money T={T} value={s.wage} step="0.25" suffix="/hr" onChange={(v) => patch({ wage: v })} accent={accent} />}
          {s.pay_basis === 'salary' && <Money T={T} value={s.annual_salary} step="500" suffix="/yr" onChange={(v) => patch({ annual_salary: v })} accent={accent} />}
          {s.pay_basis === 'annualised' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1.4 }}><Label style={{ marginBottom: 8 }}>Annual salary</Label><Money T={T} value={s.annual_salary} step="500" suffix="/yr" onChange={(v) => patch({ annual_salary: v })} accent={accent} /></div>
              <div style={{ flex: 1 }}><Label style={{ marginBottom: 8 }}>Hours / year</Label><Input value={s.annualised_hours || ''} onChange={(e) => patch({ annualised_hours: parseFloat(e.target.value) || 0 })} type="number" step="20" placeholder="1820" accent={accent} /></div>
            </div>
          )}
        </div>
      </div>}
      {!hidePay && <div>
        <Label style={{ marginBottom: 8 }}>Holiday override (weeks)</Label>
        <Input value={s.holiday_override ?? ''} onChange={(e) => patch({ holiday_override: e.target.value === '' ? null : parseFloat(e.target.value) })} type="number" step="0.1" min="0" placeholder="Uses company default" accent={accent} />
        <div style={{ fontSize: 12, color: T.faint, marginTop: 6 }}>Blank uses the company holiday policy from Settings.</div>
      </div>}
      <div data-tour="staff-keyholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>Keyholder</div><div style={{ fontSize: 12, color: T.faint }}>Can open and close</div></div>
        <Switch on={s.keyholder} onChange={() => patch({ keyholder: !s.keyholder })} accent={accent} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>Same shifts each week</div><div style={{ fontSize: 12, color: T.faint }}>Keep this person on the same days and shifts week to week</div></div>
        <Switch on={s.prefers_consistent} onChange={() => patch({ prefers_consistent: !s.prefers_consistent })} accent={accent} />
      </div>
      {shortAvail && <div style={{ fontSize: 12.5, color: T.red, background: T.red + '14', border: `1px solid ${T.red}33`, borderRadius: T.r.md, padding: '10px 12px', lineHeight: 1.45 }}>
        Available <b>{availableHours(s, cfg)}h</b> but contracted <b>{s.contracted}h</b>, so {first(s.name) || 'they'} can't reach their contract. Widen availability (in the grid) or lower the contracted hours.
      </div>}
      {!readOnly && <p style={{ fontSize: 12, color: T.faint, margin: 0, lineHeight: 1.5 }}>Set weekly availability by clicking the days in the grid. Changes save automatically.</p>}
    </div>
  )
}

// ── glances ──────────────────────────────────────────────────────────────────────
function FixBtn({ T, children, onClick, accent }) {
  const [h, setH] = useState(false)
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.ink, background: h ? T.subtleHover : T.subtle, border: 'none', borderRadius: 999, padding: '7px 13px', cursor: 'pointer', transition: `background .15s ${EASE}` }}>{children}</button>
}
function CapacityLine({ T, r, accent, teamId, onFix }) {
  const { contracted, maxh, req, withinContract, coverableAtMax, overContractH, shortAtMaxH } = r
  const solid = req ? Math.min(contracted, req) / req : 1
  const ot = req ? Math.max(0, Math.min(maxh, req) - contracted) / req : 0
  const hireH = Math.min(Math.max(req - contracted, 0), 40)
  const row = (label, val) => <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span style={{ color: T.muted }}>{label}</span><b style={{ color: T.ink }}>{val}</b></div>
  return <>
    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 9 }}>Capacity</div>
    <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', background: T.track }}>
      <div style={{ width: `${solid * 100}%`, background: accent }} />
      <div style={{ width: `${ot * 100}%`, background: accent + '40' }} />
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 11, color: coverableAtMax ? T.ink : T.red, display: 'flex', alignItems: 'center', gap: 6 }}>{coverableAtMax ? <><Icon path={Ic.check} size={15} stroke={2.6} color={T.green} />Shifts covered</> : `Short ${shortAtMaxH}h even at max`}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
      {row('Contracted', `${contracted}h`)}{row('Max available', `${maxh}h`)}{row('Shifts need', `${req}h`)}
    </div>
    {coverableAtMax && !withinContract && <div style={{ marginTop: 11, fontSize: 11.5, color: T.warnInk, background: T.amber + '16', borderRadius: T.r.sm, padding: '9px 11px', lineHeight: 1.45 }}>
      To cover, staff work <b>{overContractH}h</b> over contract.
      {onFix && <div style={{ marginTop: 8 }}><FixBtn T={T} accent={accent} onClick={() => onFix(teamId, { kind: 'addstaff', contracted: hireH, kh: false })}>↳ Hire a {hireH}h member to avoid this</FixBtn></div>}
    </div>}
    {!coverableAtMax && onFix && <div style={{ marginTop: 10 }}><FixBtn T={T} accent={accent} onClick={() => onFix(teamId, { kind: 'addstaff', contracted: hireH, kh: false })}>↳ Hire a {hireH}h team member</FixBtn></div>}
  </>
}
function ShortfallList({ T, staff, shifts, teamId, onFix, cfg }) {
  const groups = groupShortfalls(staffing(staff, shifts, cfg).short)
  return <>
    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 11 }}>Coverage</div>
    {groups.length === 0 ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: T.green, fontWeight: 600 }}><Icon path={Ic.check} size={15} stroke={2.4} />Every shift can be filled by available staff.</div> : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {groups.map((g, i) => {
          const fix = suggestFixGroup(staff, g, cfg)
          return <div key={i}>
            <div style={{ fontSize: 13, color: T.body, display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 7, lineHeight: 1.35 }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: T.amber, flexShrink: 0, transform: 'translateY(-1px)' }} />
              <span><b style={{ color: T.ink }}>{g.name}</b> ({fmt(g.start)}-{fmt(g.end)}) needs {g.need}{g.kh ? ' keyholder' : ''}{g.need > 1 ? 's' : ''}, short on {g.days.map((d) => DAYS[d]).join(', ')}</span>
            </div>
            <div style={{ marginLeft: 13 }}><FixBtn T={T} onClick={() => onFix(teamId, fix)}>↳ {fix.label}</FixBtn></div>
          </div>
        })}
      </div>
    )}
  </>
}
export function TeamGlance({ staff, shifts, teamName, teamId, accent, onFix, cfg, wide = false }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const r = readiness(staff, shifts, cfg)
  const bottlenecks = coverageBottlenecks(staff, shifts, cfg)
  const ok = r.ready && bottlenecks.length === 0
  const color = ok ? T.green : (bottlenecks.length ? T.red : accent)
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
      <Ring value={r.overallPct / 100} color={color} size={wide ? 84 : 72} stroke={wide ? 10 : 9} />
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Can we cover the shifts?</div>
        {!wide && <div style={{ fontSize: 12.5, color: accent, fontWeight: 600, marginTop: 2 }}>{teamName}</div>}
        {wide && <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{ok ? 'This team is ready to schedule.' : 'Some shifts still need cover.'}</div>}
      </div>
    </div>
    {bottlenecks.length > 0 && <div style={{ marginBottom: 16, padding: '11px 13px', borderRadius: T.r.md, background: T.red + '12', border: `1px solid ${T.red}33` }}>
      {bottlenecks.map((b, i) => {
        const lim = staff.filter((s) => s.id !== b.id).map((s) => ({ s, days: cfg.openDays.filter((d) => s.avail?.[d]).length })).sort((a, z) => a.days - z.days)[0]
        return <div key={i} style={{ marginTop: i ? 12 : 0 }}>
          <div style={{ fontSize: 12.5, color: T.red, lineHeight: 1.45 }}><b>{b.name}</b> is the only person available every open day, so they'd need to work {b.essential} days but can only do {b.maxDays}. Spread availability or add staff.</div>
          {onFix && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <FixBtn T={T} accent={accent} onClick={() => onFix(teamId, { kind: 'addstaff', contracted: 0, kh: false })}>↳ Add a team member</FixBtn>
            {lim && lim.days < cfg.openDays.length && <FixBtn T={T} accent={accent} onClick={() => onFix(teamId, { kind: 'fullweek', id: lim.s.id })}>↳ Give {first(lim.s.name)} the full week</FixBtn>}
          </div>}
        </div>
      })}
    </div>}
    {wide
      ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 24, alignItems: 'start' }}>
          <div><CapacityLine T={T} r={r} accent={accent} teamId={teamId} onFix={onFix} /></div>
          <div style={{ borderLeft: `1px solid ${T.hair}`, paddingLeft: 24 }}><ShortfallList T={T} staff={staff} shifts={shifts} teamId={teamId} onFix={onFix} cfg={cfg} /></div>
        </div>
      : <>
          <CapacityLine T={T} r={r} accent={accent} teamId={teamId} onFix={onFix} />
          <div style={{ borderTop: `1px solid ${T.hair}`, margin: '16px 0 14px' }} />
          <ShortfallList T={T} staff={staff} shifts={shifts} teamId={teamId} onFix={onFix} cfg={cfg} />
        </>}
  </div>
}
function AllTeams({ teams, staff, shifts, onFix, cfg }) {
  const { T } = useTheme()
  const [open, setOpen] = useState(null)
  const everyTeamReady = teams.every((t) => readiness(staff.filter((s) => s.team_id === t.id), shifts.filter((s) => s.team_id === t.id), cfg).ready)
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: everyTeamReady ? T.green + '14' : T.amber + '14', border: `1px solid ${everyTeamReady ? T.green + '33' : T.amber + '33'}`, borderRadius: T.r.md, padding: '12px 16px', marginBottom: 14, fontSize: 13, fontWeight: 600, color: everyTeamReady ? T.green : T.warnInk }}>
      <Icon path={everyTeamReady ? Ic.check : Ic.key} size={16} stroke={2.2} />
      {everyTeamReady ? 'Every team can cover its shifts. You are ready to generate a rota.' : 'Some teams cannot fully cover their shifts. Expand a team to fix the shortfalls.'}
    </div>
    <Card pad="4px 22px">
      {teams.map((t, idx) => {
        const ts = staff.filter((s) => s.team_id === t.id), tsh = shifts.filter((s) => s.team_id === t.id)
        const r = readiness(ts, tsh, cfg), isOpen = open === t.id
        const ng = groupShortfalls(r.short).length
        const notReady = []
        if (!r.coverableAtMax) notReady.push(`short ${r.shortAtMaxH}h even at max`)
        if (ng) notReady.push(`${ng} coverage gap${ng === 1 ? '' : 's'}`)
        const status = !r.ready ? { c: T.warnInk, t: notReady.join(', ') } : r.withinContract ? { c: T.green, t: 'Fully staffed' } : { c: T.green, t: `Coverable, ${r.overContractH}h over` }
        return <Fragment key={t.id}>
          <div onClick={() => setOpen(isOpen ? null : t.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 0', borderTop: idx ? `1px solid ${T.hair}` : 'none', cursor: 'pointer' }}>
            <Icon path={Ic.chevron} size={15} stroke={2} color={T.faint} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: `transform .25s ${EASE}`, flexShrink: 0 }} />
            <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color, flexShrink: 0 }} />
            <span style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, flexShrink: 0, letterSpacing: '-0.01em' }}>{t.name}</span>
            <span style={{ fontSize: 12, color: T.faint, fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}>· {ts.length} staff · {r.contracted}/{r.req}h</span>
            <div style={{ flex: 1, minWidth: 30, maxWidth: 220, height: 9, borderRadius: 99, background: t.color + '22', overflow: 'hidden' }}><div style={{ width: `${Math.round(Math.min(1, r.overallPct / 100) * 100)}%`, height: '100%', background: t.color, borderRadius: 99, transition: 'width .3s' }} /></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: status.c, flexShrink: 0, textAlign: 'right' }}>{status.t}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: r.ready ? T.green : t.color, flexShrink: 0, width: 42, textAlign: 'right' }}>{r.overallPct}%</span>
          </div>
          {isOpen && <div style={{ padding: '6px 0 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 28, alignItems: 'start' }}>
            <div><CapacityLine T={T} r={r} accent={t.color} teamId={t.id} onFix={onFix} /></div>
            <div style={{ borderLeft: `1px solid ${T.hair}`, paddingLeft: 24 }}><ShortfallList T={T} staff={ts} shifts={tsh} teamId={t.id} onFix={onFix} cfg={cfg} /></div>
          </div>}
        </Fragment>
      })}
    </Card>
  </div>
}

// ── availability grid (shared with /try-me; editable only when onEditDay passed) ──
const GRID_TH = { fontSize: 11, fontWeight: 700, padding: '6px 6px 10px', textAlign: 'center' }
export function AvailabilityGrid({ groups, cfg, selectedId, onSelect, selectMode, selectedIds, onToggle, onEditDay }) {
  const ctx = useTheme(); const T = ctx.T || LIGHT
  const [hoverId, setHoverId] = useState(null)
  const [edit, setEdit] = useState(null) // { s, day, rect }
  const interactive = !!onSelect || !!selectMode
  const editable = !!onEditDay && !selectMode
  const grouped = groups.length > 1
  const cell = { padding: '4px 4px', verticalAlign: 'middle' }
  const block = { height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }
  const total = groups.reduce((n, g) => n + g.staff.length, 0)
  return <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 760, tableLayout: 'fixed' }}>
      <colgroup><col style={{ width: 170 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
      <thead><tr style={{ background: 'transparent' }}><th style={{ ...GRID_TH, textAlign: 'left', position: 'sticky', left: 0, background: T.cardSolid, minWidth: 170 }} />{DAYS.map((d, i) => <th key={d} style={{ ...GRID_TH, color: cfg.openDays.includes(i) ? T.body : T.faint }}>{d}</th>)}</tr></thead>
      <tbody>
        {total === 0 && <tr style={{ background: 'transparent' }}><td colSpan={8} style={{ textAlign: 'center', color: T.faint, fontSize: 13, padding: '32px 0' }}>No staff yet, add someone to map their availability.</td></tr>}
        {groups.map((g) => <Fragment key={g.name}>
          {grouped && <tr style={{ background: 'transparent' }}><td colSpan={8} style={{ padding: '12px 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: g.color }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: g.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{g.name}</span>
              <div style={{ flex: 1, height: 1, background: T.hair }} />
            </div>
          </td></tr>}
          {grouped && g.staff.length === 0 && <tr style={{ background: 'transparent' }}><td colSpan={8} style={{ color: T.faint, fontSize: 12, padding: '4px 0 10px 18px' }}>No staff in this team yet.</td></tr>}
          {g.staff.map((s) => {
            const accent = g.color
            const sel = selectedId === s.id, checked = selectedIds?.has(s.id), hov = interactive && hoverId === s.id
            const rowBg = sel && !selectMode ? accent + '14' : (hov ? T.subtle : 'transparent')
            const active = rowBg !== 'transparent'
            const bar = sel && !selectMode ? accent : (hov ? accent + '66' : null)
            // frozen column must be OPAQUE so scrolled cells don't show through it: tint over cardSolid
            const stickyBg = active ? `linear-gradient(0deg, ${rowBg}, ${rowBg}), ${T.cardSolid}` : T.cardSolid
            return <tr key={s.id} onMouseEnter={() => interactive && setHoverId(s.id)} onMouseLeave={() => interactive && setHoverId(null)} style={{ background: 'transparent', transition: 'background .1s' }}>
              <td onClick={() => (interactive ? (selectMode ? onToggle?.(s.id) : onSelect?.(s.id)) : null)} style={{ ...cell, cursor: interactive ? 'pointer' : 'default', position: 'sticky', left: 0, background: stickyBg, borderTopLeftRadius: active ? 10 : 0, borderBottomLeftRadius: active ? 10 : 0, boxShadow: bar ? `inset 3px 0 0 ${bar}` : 'none' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, fontWeight: sel ? 800 : 600, color: T.ink }}>
                  {selectMode
                    ? <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `1.5px solid ${checked ? accent : T.faint}`, background: checked ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{checked && <Icon path={Ic.check} size={12} stroke={3} />}</span>
                    : <span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{initials(s.name)}</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{grouped ? s.name : first(s.name)}</span>
                  {s.keyholder && <Icon path={Ic.key} size={12} stroke={2} color={accent} />}
                </span>
              </td>
              {ALL.map((d) => {
                const a = s.avail?.[d], closed = !cfg.openDays.includes(d)
                const canEdit = editable && !closed
                return <td key={d}
                  onClick={canEdit ? (e) => { setEdit({ s, day: d, rect: e.currentTarget.getBoundingClientRect() }); if (!grouped) onSelect?.(s.id) } : (interactive ? () => (selectMode ? onToggle?.(s.id) : onSelect?.(s.id)) : undefined)}
                  style={{ ...cell, cursor: canEdit ? 'pointer' : (interactive ? 'pointer' : 'default'), background: active ? rowBg : 'transparent', borderTopRightRadius: active && d === 6 ? 10 : 0, borderBottomRightRadius: active && d === 6 ? 10 : 0 }}>
                  {closed
                    ? <div style={{ ...block, background: `repeating-linear-gradient(45deg, ${T.track}, ${T.track} 1.5px, transparent 1.5px, transparent 6px)` }} />
                    : a === true
                      ? <div style={{ ...block, background: accent, color: '#fff' }}>All day</div>
                      : Array.isArray(a)
                        ? <div style={{ ...block, background: accent + '1A', border: `1px solid ${accent}55`, color: accent }}>{fmt(a[0])}-{fmt(a[1])}</div>
                        : <div style={{ ...block, border: `1.5px dashed ${T.border}`, color: T.faint, fontSize: 15, fontWeight: 400 }}>{canEdit ? '+' : ''}</div>}
                </td>
              })}
            </tr>
          })}
        </Fragment>)}
      </tbody>
    </table>
    {edit && <DayEditPopover T={T} cfg={cfg} s={edit.s} day={edit.day} rect={edit.rect} accent={groups.find((g) => g.staff.some((x) => x.id === edit.s.id))?.color || T.pink} onApply={(val) => onEditDay(edit.s.id, edit.day, val)} onClose={() => setEdit(null)} />}
  </div>
}
// per-cell availability editor: Off / All day / Hours, applied immediately (autosaves)
function DayEditPopover({ T, cfg, s, day, rect, accent, onApply, onClose }) {
  const a = s.avail?.[day]
  const [mode, setMode] = useState(a === true ? 'all' : Array.isArray(a) ? 'hours' : 'off')
  const [win, setWin] = useState(Array.isArray(a) ? a : cfg.business[day])
  const choose = (m) => {
    setMode(m)
    if (m === 'off') { onApply(false); onClose() }
    else if (m === 'all') { onApply(true); onClose() }
    else { onApply(win) }
  }
  if (typeof document === 'undefined') return null
  const W = 260, vw = window.innerWidth, vh = window.innerHeight
  const hoursExtra = mode === 'hours' ? 120 : 0
  const left = Math.min(Math.max(10, rect.left + rect.width / 2 - W / 2), vw - W - 10)
  // flip above the cell if it would overflow the bottom
  const belowTop = rect.bottom + 6
  const top = belowTop + 96 + hoursExtra > vh ? Math.max(10, rect.top - 96 - hoursExtra - 6) : belowTop
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
      <div style={{ position: 'fixed', top, left, width: W, zIndex: 1001, background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: T.shadowHover, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10, letterSpacing: '-0.01em' }}>{DAY_FULL[day]} · {first(s.name)}</div>
        <Segmented full accent={accent} value={mode} onChange={choose} options={[{ value: 'off', label: 'Off' }, { value: 'all', label: 'All day' }, { value: 'hours', label: 'Hours' }]} />
        {mode === 'hours' && <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{fmt(win[0])}</span><span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{fmt(win[1])}</span></div>
          <TimeRange start={win[0]} end={win[1]} onChange={(x, y) => { setWin([x, y]); onApply([x, y]) }} accent={accent} domain={cfg.slider} labels={false} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Button size="sm" accent={accent} onClick={onClose}>Done</Button></div>
        </div>}
      </div>
    </>,
    document.body
  )
}
export function AvailKey({ accent }) {
  const ctx = useTheme(); const T = ctx.T || LIGHT
  accent = accent || T.pink
  const item = (box, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: T.muted }}>{box}<span>{label}</span></span>
  const sw = { width: 22, height: 14, borderRadius: 4, flexShrink: 0 }
  return <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12 }}>
    {item(<span style={{ ...sw, background: accent }} />, 'Available all day')}
    {item(<span style={{ ...sw, background: accent + '1A', border: `1px solid ${accent}55` }} />, 'Set hours (e.g. 1pm-5pm)')}
    {item(<span style={{ ...sw, border: `1.5px dashed ${T.border}` }} />, 'Not available')}
    {item(<span style={{ ...sw, background: `repeating-linear-gradient(45deg, ${T.track}, ${T.track} 1.5px, transparent 1.5px, transparent 6px)` }} />, 'Closed')}
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
const fromApi = (r) => ({ id: r.id, team_id: r.team_id, name: r.name, role: r.role, contracted: r.contracted_hours, max: r.max_hours, wage: r.hourly_rate, pay_basis: r.pay_basis || 'hourly', annual_salary: r.annual_salary || 0, annualised_hours: r.annualised_hours || 0, keyholder: r.keyholder, avail: r.availability || {}, linked: !!r.clerk_user_id, holiday_override: r.holiday_override ?? null })
const toApi = (s) => ({ team_id: s.team_id, name: s.name, role: s.role, contracted_hours: s.contracted, max_hours: s.max, hourly_rate: s.wage, pay_basis: s.pay_basis || 'hourly', annual_salary: s.annual_salary ?? 0, annualised_hours: s.annualised_hours ?? 0, keyholder: s.keyholder, availability: s.avail, holiday_override: s.holiday_override ?? null })

// Invite-by-code: the manager shares one business code; staff enter it in the
// Team app to join and set their own availability. Shows how many have joined.
function InviteCard({ T, joined, total }) {
  const [code, setCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/staff/join-code').then((r) => (r.ok ? r.json() : null)).then((d) => d && setCode(d.join_code)).catch(() => {})
  }, [])

  const regenerate = async () => {
    if (!confirm('Make a new code? The old one stops working, and anyone mid-join will need the new one.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/staff/join-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regenerate: true }) })
      if (res.ok) setCode((await res.json()).join_code)
    } finally { setBusy(false) }
  }
  const copy = () => { if (code) { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } }

  return (
    <Card pad={18} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>Invite your team</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>
          Share this code. Your team download the Shiftly Team app, enter it, pick their name and set their own availability.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={copy} title="Copy code" style={{ fontFamily: T.font, fontSize: 22, fontWeight: 800, letterSpacing: 4, color: T.pink, background: T.pink + '12', border: `1px solid ${T.pink}33`, borderRadius: 12, padding: '10px 18px', cursor: 'pointer' }}>
          {code || '······'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Button size="sm" variant="secondary" onClick={copy} disabled={!code}>{copied ? 'Copied' : 'Copy'}</Button>
          <button onClick={regenerate} disabled={busy || !code} style={{ fontFamily: T.font, fontSize: 11.5, fontWeight: 600, color: T.faint, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>New code</button>
        </div>
      </div>

      {total > 0 && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: joined >= total ? T.green : T.muted, borderLeft: `1px solid ${T.hair}`, paddingLeft: 16 }}>
          {joined} of {total} joined
        </div>
      )}
    </Card>
  )
}

export default function StaffPage() {
  const { T } = useTheme()
  const [teams, setTeams] = useState([])
  const [location, setLocation] = useState(null)
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const staffRef = useRef(staff); useEffect(() => { staffRef.current = staff }, [staff])
  const saveTimer = useRef(null), pending = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        const [tr, lr, shr, str] = await Promise.all([fetch('/api/teams'), fetch('/api/location'), fetch('/api/shifts'), fetch('/api/staff')])
        const td = await tr.json(), ld = await lr.json(), shd = await shr.json(), std = await str.json()
        const withColor = (Array.isArray(td) ? td : []).map((t, i) => ({ id: t.id, name: t.name, color: TEAM_COLORS[i % TEAM_COLORS.length] }))
        // Deep-link support: ?team=<id> opens that team's tab (the setup companion
        // uses this so people land on the granular view where gaps show), else 'all'.
        const wantTeam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('team') : null
        const initialTeam = wantTeam && withColor.some((t) => t.id === wantTeam) ? wantTeam : 'all'
        setTeams(withColor); setLocation(ld || null); setShifts(Array.isArray(shd) ? shd : []); setStaff((Array.isArray(std) ? std : []).map(fromApi)); setTeamId(initialTeam)
      } catch (e) { console.error('Failed to load staff page', e) } finally { setLoading(false) }
    })()
  }, [])

  // Live populate during setup: when the companion adds people/shifts it emits
  // this event; refetch so they appear without a manual reload. Skips the staff
  // replace if an edit is mid-save so we never clobber an in-flight change.
  useEffect(() => {
    const reload = async () => {
      try {
        const [shr, str] = await Promise.all([fetch('/api/shifts'), fetch('/api/staff')])
        const shd = await shr.json(), std = await str.json()
        setShifts(Array.isArray(shd) ? shd : [])
        if (!pending.current) setStaff((Array.isArray(std) ? std : []).map(fromApi))
      } catch {}
    }
    window.addEventListener('shiftly:staff-changed', reload)
    return () => window.removeEventListener('shiftly:staff-changed', reload)
  }, [])

  const cfg = useMemo(() => {
    const business = location?.business || { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: null }
    const openDays = ALL.filter((d) => business[d])
    const opens = openDays.map((d) => business[d][0]), closes = openDays.map((d) => business[d][1])
    const open = opens.length ? Math.min(...opens) : 9, close = closes.length ? Math.max(...closes) : 17
    return { business, openDays, slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
  }, [location])

  const accent = teams.find((t) => t.id === teamId)?.color || T.pink
  const isAll = teamId === 'all'
  const teamStaff = useMemo(() => staff.filter((s) => s.team_id === teamId), [staff, teamId])
  const teamShifts = useMemo(() => shifts.filter((s) => s.team_id === teamId), [shifts, teamId])
  const selected = staff.find((s) => s.id === selectedId)
  useEffect(() => { setSelectMode(false); setSelectedIds(new Set()) }, [teamId])

  // ── autosave (debounced PUT; flush on switch; race-guarded) ──
  const doSave = useCallback(async (s) => {
    if (!s) return
    setSaveState('saving')
    try {
      const res = await fetch('/api/staff', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, ...toApi(s) }) })
      if (!res.ok) throw new Error('save failed')
      const saved = fromApi(await res.json())
      setStaff((prev) => prev.map((x) => (x.id === s.id && !(pending.current && pending.current.id === s.id) ? saved : x)))
      setSaveState((x) => (pending.current ? x : 'saved')); setTimeout(() => setSaveState((x) => (x === 'saved' ? 'idle' : x)), 1400)
    } catch { setSaveState('error') }
  }, [])
  const flush = useCallback(() => { clearTimeout(saveTimer.current); const m = pending.current; pending.current = null; if (m) doSave(m) }, [doSave])
  const patch = useCallback((id, p) => {
    const base = (pending.current && pending.current.id === id) ? pending.current : staffRef.current.find((s) => s.id === id)
    const merged = { ...base, ...p }
    pending.current = merged
    setStaff((prev) => prev.map((s) => (s.id === id ? merged : s)))
    setSaveState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { const m = pending.current; pending.current = null; doSave(m) }, 650)
  }, [doSave])
  useEffect(() => () => { flush() }, [selectedId, flush])
  // grid cell edit -> patch that person's avail for one day (false | true | [start,end])
  const editDay = useCallback((id, day, val) => {
    const s = (pending.current && pending.current.id === id) ? pending.current : staffRef.current.find((x) => x.id === id)
    if (!s) return
    const a = { ...(s.avail || {}) }
    if (val === false) delete a[day]; else a[day] = val
    patch(id, { avail: a })
  }, [patch])

  const persist = useCallback(async (s) => { const res = await fetch('/api/staff', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, ...toApi(s) }) }); if (res.ok) { const saved = fromApi(await res.json()); setStaff((prev) => prev.map((x) => (x.id === s.id ? saved : x))) } }, [])
  const addStaff = useCallback(async (tId, over = {}) => {
    const draft = { team_id: tId, name: over.name || 'New staff member', role: over.role || '', contracted: over.contracted ?? 0, max: over.max ?? 40, wage: over.wage ?? 11.44, pay_basis: over.pay_basis || 'hourly', annual_salary: over.annual_salary ?? 0, annualised_hours: over.annualised_hours ?? 0, keyholder: over.keyholder ?? false, avail: over.avail || allDayAvail(cfg.openDays) }
    const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(draft)) })
    if (!res.ok) return
    const created = fromApi(await res.json())
    setStaff((prev) => [...prev, created])
    if (!over.noSelect) { setTeamId(tId); setSelectedId(created.id) }
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

  if (loading) return <div style={{ fontFamily: T.font, padding: 60, textAlign: 'center', color: T.faint }}>Loading staff…</div>
  if (teams.length === 0) return <div style={{ fontFamily: T.font, padding: 60, textAlign: 'center', color: T.muted }}>No teams yet. Open the setup assistant to add your teams and staff.</div>

  const tabs = [{ id: 'all', name: 'All teams' }, ...teams]
  const teamName = teams.find((t) => t.id === teamId)?.name || ''
  const khGaps = locationKeyholderGaps(staff, shifts, cfg)
  const khFlag = khGaps.noKeyholder || khGaps.openMissing.length > 0 || khGaps.closeMissing.length > 0

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 1240, margin: '0 auto', padding: '40px 32px 64px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Staff</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: '6px 0 18px', letterSpacing: '-0.01em' }}>Your team members, their contracts and availability.</p>
        <InviteCard T={T} joined={staff.filter((s) => s.linked).length} total={staff.length} />
      </div>

      {/* team segmented + team-level actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'inline-flex', background: T.segBg, borderRadius: 999, padding: 4, gap: 2, flexWrap: 'wrap' }}>
          {tabs.map((t) => {
            const active = t.id === teamId
            const count = t.id === 'all' ? staff.length : staff.filter((s) => s.team_id === t.id).length
            return <button key={t.id} onClick={() => { setTeamId(t.id); setSelectedId(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.font, fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', color: active ? T.ink : T.muted, background: active ? T.card : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none', transition: `all .3s ${EASE}` }}>
              {t.id !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />}{t.name}
              <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? (t.color || T.pink) : T.faint }}>{count}</span>
            </button>
          })}
        </div>
        {!isAll && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectMode ? <>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: T.muted }}>{selectedIds.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}>Cancel</Button>
            <Button size="sm" variant="danger" disabled={selectedIds.size === 0} onClick={bulkDelete}>Delete{selectedIds.size ? ` ${selectedIds.size}` : ''}</Button>
          </> : <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, color: T.muted }}>{teamStaff.length} {teamStaff.length === 1 ? 'person' : 'people'}<SaveStatus T={T} state={saveState} /></span>
            {teamStaff.length > 0 && <Button size="sm" variant="secondary" onClick={() => setSelectMode(true)}>Select</Button>}
            <Button size="sm" accent={accent} onClick={() => addStaff(teamId)}><Icon path={Ic.plus} size={15} stroke={2.4} />Add staff</Button>
          </>}
        </div>}
      </div>

      {khFlag && <Card pad={16} style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 12, background: T.amber + '14', border: `1px solid ${T.amber}33` }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: T.amber + '22', color: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={Ic.key} size={16} stroke={1.9} /></span>
        <span style={{ fontSize: 13, color: T.body, lineHeight: 1.5 }}>{khGaps.noKeyholder
          ? 'No keyholders set, mark at least one person as a keyholder so someone can open and close the location.'
          : <>No keyholder available to {khGaps.openMissing.length ? `open ${khGaps.openMissing.map((d) => DAYS[d]).join(', ')}` : ''}{khGaps.openMissing.length && khGaps.closeMissing.length ? ' · ' : ''}{khGaps.closeMissing.length ? `close ${khGaps.closeMissing.map((d) => DAYS[d]).join(', ')}` : ''}. Widen a keyholder's availability or add another. <span style={{ color: T.faint }}>(One keyholder covers the whole location, not per team.)</span></>}</span>
      </Card>}

      {isAll ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AllTeams teams={teams} staff={staff} shifts={shifts} onFix={applyFix} cfg={cfg} />
          <Card solid pad={24}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 3, letterSpacing: '-0.01em' }}>All availability <span style={{ color: T.faint, fontWeight: 500 }}>· whole location</span></div>
            <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 12 }}>Everyone's week at a glance. Click a day to set availability, or a name to open their team.</div>
            <AvailabilityGrid groups={teams.map((t) => ({ name: t.name, color: t.color, staff: staff.filter((s) => s.team_id === t.id) }))} cfg={cfg} onEditDay={editDay} onSelect={(id) => { const st = staff.find((x) => x.id === id); if (st) { setTeamId(st.team_id); setSelectedId(st.id) } }} />
            <AvailKey accent={T.pink} />
          </Card>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Card pad={24} style={{ position: 'sticky', top: 16, width: 380, flexShrink: 0, minHeight: 440 }}>
            <Inspector key={selected?.id || 'none'} s={selected} patch={(p) => patch(selected.id, p)} onDelete={() => removeStaff(selected.id)} accent={accent} cfg={cfg} />
          </Card>
          <Card solid pad={24} style={{ flex: 1, minWidth: 320 }}>
            {!selectMode && teamStaff.length > 0 && <div style={{ fontSize: 12.5, color: T.faint, marginBottom: 12 }}>Click a name to edit their details. Click any day to set that person's availability.</div>}
            <AvailabilityGrid groups={[{ name: teamName, color: accent, staff: teamStaff }]} cfg={cfg} selectedId={selectedId} onSelect={setSelectedId} selectMode={selectMode} selectedIds={selectedIds} onToggle={toggleSelect} onEditDay={editDay} />
            <AvailKey accent={accent} />
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${T.hair}` }}>
              <TeamGlance staff={teamStaff} shifts={teamShifts} teamName={teamName} teamId={teamId} accent={accent} onFix={applyFix} cfg={cfg} wide />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
