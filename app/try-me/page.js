'use client'

import { useState, useMemo } from 'react'
import { HeatGlow, SHIFTLY_PALETTE } from '../components/HeatGlow'
import { Inspector as ShiftInspector, TeamRotaGrid } from '../(auth)/dashboard/shifts/page'
import { Inspector as StaffInspector, AvailabilityGrid, AvailKey } from '../(auth)/dashboard/staff/page'

// ════════════════════════════════════════════════════════════════════════════
//  /try-me - guided, no-sign-in demo (lead magnet).
//  Pick an establishment (cafe / bar / shop, all single-team) → drop into a
//  pre-built scenario → a coach walks you through the real builder → generate a
//  rota → "make it yours" gate (waitlist email). Teaches + de-risks overwhelm.
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const FONT = "'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const ALL = [0, 1, 2, 3, 4, 5, 6]
const uid = (() => { let n = 0; return () => `id${++n}` })()

function fmt(h) {
  if (typeof h === 'string') { const [a, b] = h.split(':').map(Number); h = a + (b || 0) / 60 }
  if (!Number.isFinite(h)) return '·'
  const hr = Math.floor(h), m = Math.round((h - hr) * 60)
  const ap = hr < 12 || hr === 24 ? 'am' : 'pm'
  let hh = hr % 12; if (hh === 0) hh = 12
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`
}
const dayIdx = (d) => (typeof d === 'number' ? d : (DAY_INDEX[d] ?? DAYS.indexOf(d)))
const initials = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const panel = { background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, padding: 20, boxShadow: '0 3px 10px rgba(17,24,39,.06), 0 1px 2px rgba(17,24,39,.04)' }
const primaryBtn = (disabled) => ({ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: disabled ? '#F9A8D0' : PINK, border: 'none', borderRadius: 10, padding: '11px 22px', cursor: disabled ? 'default' : 'pointer' })
const addBtn = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: PINK, border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }
const TM_ANIM = `@keyframes tmUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes tmPulse{0%,100%{box-shadow:0 0 0 0 ${PINK}55}50%{box-shadow:0 0 0 7px ${PINK}00}}@keyframes tmFall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}.tmUp{animation:tmUp .4s ease both}`
const RULES = [
  { key: 'keyholder', label: 'A keyholder opens & closes, every day', tip: 'Someone who can lock up is always on at open and close.' },
  { key: 'rest', label: 'At least 11 hours’ rest between shifts', tip: 'No one finishes late then starts early the next morning.' },
  { key: 'consecutive', label: 'Never more than 5 days in a row', tip: 'Everyone gets a proper break during the week.' },
  { key: 'maxhours', label: 'Everyone within their max hours', tip: 'No one is pushed past the hours they’re happy to work.' },
]
const TIP = Object.fromEntries(RULES.map((r) => [r.key, r.tip]))
function RuleRow({ marker, color, label, detail, tip }) {
  const row = <span style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5, cursor: tip ? 'help' : 'default' }}>
    <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800 }}>{marker}</span>
    <span style={{ color: '#374151', lineHeight: 1.4 }}><b style={{ color: '#111827', borderBottom: tip ? '1px dotted #C4C4CC' : 'none' }}>{label}</b>{detail ? <span style={{ color: '#92660B' }}> · {detail}</span> : ''}</span>
  </span>
  return tip ? <Tip text={tip} style={{ display: 'flex' }}>{row}</Tip> : row
}
function KeyMark({ size = 13, color = PINK }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}><title>Keyholder</title><circle cx="8" cy="15" r="5" /><path d="M11.6 11.4 21 2" /><path d="M16.5 6.5 19.5 9.5" /></svg>
}
function Tip({ text, children, style }) {
  const [show, setShow] = useState(false)
  return <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ position: 'relative', display: 'inline-flex', ...style }}>
    {children}
    {show && <span style={{ position: 'absolute', bottom: 'calc(100% + 9px)', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, padding: '7px 10px', borderRadius: 8, width: 'max-content', maxWidth: 220, textAlign: 'center', zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,.22)', pointerEvents: 'none' }}>{text}<span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '5px 5px 0', borderStyle: 'solid', borderColor: '#111827 transparent transparent' }} /></span>}
  </span>
}

// ── establishment scenarios (single team each) ───────────────────────────────
// realistic scenarios: opener + a lunch/peak cover + closer, staffed to comfortably (and fairly)
// cover the week. Everyone's a keyholder (small teams trust each other with the keys), so a
// keyholder always opens & closes (the demo always builds a perfect, compliant rota).
const ESTS = [
  {
    id: 'cafe', short: 'cafe', name: 'a cafe', tag: 'Coffee, brunch & the morning rush', team: 'Cafe team',
    openDays: [0, 1, 2, 3, 4, 5, 6], hours: [7, 16],
    shifts: [
      { name: 'Opener', start: 7, end: 15, days: [0, 1, 2, 3, 4, 5, 6], staff: 1, keyholder: true, pin: 'open' },
      { name: 'Lunch cover', start: 11, end: 15, days: [0, 1, 2, 3, 4, 5, 6], staff: 1, keyholder: false, pin: 'none' },
      { name: 'Closer', start: 8, end: 16, days: [0, 1, 2, 3, 4, 5, 6], staff: 1, keyholder: true, pin: 'close' },
    ],
    staff: [
      { name: 'Sam Rivera', contracted: 32, keyholder: true, days: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Alex Kim', contracted: 30, keyholder: true, days: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Jess Doyle', contracted: 24, keyholder: true, days: [0, 1, 2, 3, 4] },
      { name: 'Riley Quinn', contracted: 22, keyholder: true, days: [3, 4, 5, 6] },
    ],
  },
  {
    id: 'bar', short: 'bar', name: 'a bar', tag: 'Evenings, weekends & late closes', team: 'Bar team',
    openDays: [2, 3, 4, 5, 6], hours: [15, 23],
    shifts: [
      { name: 'Bar open', start: 15, end: 23, days: [2, 3, 4, 5, 6], staff: 1, keyholder: true, pin: 'open' },
      { name: 'Evening', start: 18, end: 23, days: [2, 3, 4, 5, 6], staff: 1, keyholder: false, pin: 'none' },
    ],
    staff: [
      { name: 'Charlie Fox', contracted: 32, keyholder: true, days: [2, 3, 4, 5, 6] },
      { name: 'Robin Shah', contracted: 30, keyholder: true, days: [2, 3, 4, 5, 6] },
      { name: 'Drew Ellis', contracted: 24, keyholder: true, days: [2, 3, 4, 5, 6] },
      { name: 'Sam Page', contracted: 18, keyholder: true, days: [4, 5, 6] },
    ],
  },
  {
    id: 'shop', short: 'shop', name: 'a shop', tag: 'One floor, open till evening', team: 'Shop floor',
    openDays: [0, 1, 2, 3, 4, 5], hours: [9, 18],
    shifts: [
      { name: 'Open', start: 9, end: 17, days: [0, 1, 2, 3, 4, 5], staff: 1, keyholder: true, pin: 'open' },
      { name: 'Midday cover', start: 12, end: 16, days: [0, 1, 2, 3, 4, 5], staff: 1, keyholder: false, pin: 'none' },
      { name: 'Close', start: 10, end: 18, days: [0, 1, 2, 3, 4, 5], staff: 1, keyholder: true, pin: 'close' },
    ],
    staff: [
      { name: 'Pat Owens', contracted: 32, keyholder: true, days: [0, 1, 2, 3, 4, 5] },
      { name: 'Jordan Lee', contracted: 30, keyholder: true, days: [0, 1, 2, 3, 4, 5] },
      { name: 'Morgan Tate', contracted: 24, keyholder: true, days: [0, 1, 2, 3, 4] },
      { name: 'Sky Adams', contracted: 18, keyholder: true, days: [3, 4, 5] },
    ],
  },
]
function buildCfg(openDays, hours) {
  const business = Object.fromEntries(ALL.map((d) => [d, openDays.includes(d) ? [hours[0], hours[1]] : null]))
  const open = hours[0], close = hours[1]
  return { business, openDays, open, close, glance: [Math.floor(open), Math.ceil(close)], slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
}

// ════════════════════════════════════════════════════════════════════════════
export default function TryMe() {
  const [est, setEst] = useState(null)
  const [teamId, setTeamId] = useState('demo')
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [step, setStep] = useState(0)
  const [selShift, setSelShift] = useState(null)
  const [selStaff, setSelStaff] = useState(null)
  const [shiftSave, setShiftSave] = useState('clean')
  const [staffSave, setStaffSave] = useState('clean')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [finished, setFinished] = useState(false)

  const cfg = useMemo(() => (est ? buildCfg(est.openDays, est.hours) : buildCfg([0, 1, 2, 3, 4], [9, 17])), [est])

  const pick = (e) => {
    const tid = uid()
    setTeamId(tid)
    setShifts(e.shifts.map((s) => ({ id: uid(), team_id: tid, pin: s.pin, name: s.name, start: s.start, end: s.end, days: [...s.days], staff: s.staff, keyholder: s.keyholder })))
    setStaff(e.staff.map((p) => ({ id: uid(), team_id: tid, name: p.name, role: '', contracted: p.contracted, max: Math.max(40, p.contracted), wage: 11.44, pay_basis: 'hourly', annual_salary: 0, annualised_hours: 0, keyholder: p.keyholder, avail: Object.fromEntries(p.days.map((d) => [d, true])) })))
    setEst(e); setStep(0); setResult(null); setError(null); setSelShift(null); setSelStaff(null)
  }

  const patchShift = (id, p) => { setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setShiftSave('dirty') }
  const removeShift = (id) => { setShifts((prev) => prev.filter((s) => s.id !== id)); setSelShift(null) }
  const saveShift = () => { setShiftSave('saved'); setTimeout(() => setShiftSave((x) => (x === 'saved' ? 'clean' : x)), 1200) }
  const addShift = () => { const s = { id: uid(), team_id: teamId, pin: 'open', name: 'New shift', start: cfg.open, end: Math.min(cfg.close, cfg.open + 6), days: cfg.openDays.slice(0, 5), staff: 1, keyholder: false }; setShifts((p) => [...p, s]); setSelShift(s.id); setShiftSave('clean') }
  const patchStaff = (id, p) => { setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setStaffSave('dirty') }
  const removeStaff = (id) => { setStaff((prev) => prev.filter((s) => s.id !== id)); setSelStaff(null) }
  const saveStaff = () => { setStaffSave('saved'); setTimeout(() => setStaffSave((x) => (x === 'saved' ? 'clean' : x)), 1200) }
  const addStaff = () => { const s = { id: uid(), team_id: teamId, name: '', role: '', contracted: 0, max: 40, wage: 11.44, pay_basis: 'hourly', annual_salary: 0, annualised_hours: 0, keyholder: false, avail: Object.fromEntries(cfg.openDays.map((d) => [d, true])) }; setStaff((p) => [...p, s]); setSelStaff(s.id); setStaffSave('clean') }

  const generate = async () => {
    setGenerating(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/try-me/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business: cfg.business, shifts, staff }) })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Could not build a rota.') }
      else { setResult(data); setStep(3) }
    } catch { setError('Network error, try again.') } finally { setGenerating(false) }
  }

  if (!est) return <Picker onPick={pick} />

  const steps = [
    { tab: 'shifts', title: `Here’s ${est.name}’s week`, body: `I’ve set up the shifts a typical ${est.short} runs across the week. Click any shift to tweak its hours, days or cover, or just carry on.` },
    { tab: 'team', title: 'Meet the team', body: 'Each row shows when someone can work; pink means available. Click a name to change their hours, keyholder status or availability.' },
    { tab: 'rota', title: 'Now the whole point: fairness', body: 'Anyone can fill a grid. Shiftly builds it fair: 11h rest between shifts, never more than 5 days in a row, a keyholder on every open and close, and hours shared evenly. Hit generate and see it prove it.', generate: true },
    { tab: 'rota', title: 'That’s the week, sorted', body: `Built in seconds, and fair by the rules below. This is exactly how it works for your place. Ready to finish?`, done: true },
  ]
  const cur = steps[step]
  const shiftObj = shifts.find((s) => s.id === selShift)
  const staffObj = staff.find((s) => s.id === selStaff)
  const groups = [{ name: est.team, color: PINK, shifts }]
  const staffGroups = [{ name: est.team, color: PINK, staff }]

  if (finished) return <Finish est={est} onRestart={() => { setEst(null); setFinished(false); setResult(null); setStep(0) }} />

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827', paddingBottom: 60 }}>
    <style>{TM_ANIM}</style>
    {/* header / progress */}
    <div style={{ borderBottom: '1px solid #ECECEF', background: '#fff' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Shiftly</span>
          <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>· {est.team}</span>
        </div>
        <Progress steps={steps} step={step} />
      </div>
    </div>

    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 24px 0' }}>
      {/* coach in the flow, right above the content, at eye height */}
      <Coach step={step} cur={cur} generating={generating}
        onBack={() => step > 0 && setStep(step - 1)}
        onNext={() => { if (cur.generate) generate(); else if (cur.done) setFinished(true); else setStep(step + 1) }}
        onRestart={() => setEst(null)} />

      {cur.tab === 'shifts' && <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ ...panel, position: 'sticky', top: 16 }}><ShiftInspector key={selShift || 'none'} shift={shiftObj} patch={(p) => patchShift(selShift, p)} onDelete={() => removeShift(selShift)} saveState={shiftSave} onSave={saveShift} accent={PINK} cfg={cfg} tips /></div>
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Your shifts <span style={{ color: '#9CA3AF', fontWeight: 600 }}>· {shifts.length}</span></span>
            <Tip text="Add another shift pattern, e.g. a weekend brunch shift"><button onClick={addShift} style={addBtn}>+ Add shift</button></Tip>
          </div>
          <TeamRotaGrid groups={groups} cfg={cfg} selectedId={selShift} onSelect={setSelShift} />
        </div>
      </div>}

      {cur.tab === 'team' && <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ ...panel, position: 'sticky', top: 16 }}><StaffInspector key={selStaff || 'none'} s={staffObj} patch={(p) => patchStaff(selStaff, p)} onDelete={() => removeStaff(selStaff)} saveState={staffSave} onSave={saveStaff} accent={PINK} cfg={cfg} hidePay /></div>
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Your team <span style={{ color: '#9CA3AF', fontWeight: 600 }}>· {staff.length}</span></span>
            <Tip text="Add a team member and set when they’re available"><button onClick={addStaff} style={addBtn}>+ Add person</button></Tip>
          </div>
          <AvailabilityGrid groups={staffGroups} cfg={cfg} selectedId={selStaff} onSelect={setSelStaff} />
          <AvailKey accent={PINK} />
        </div>
      </div>}

      {cur.tab === 'rota' && <div>
        {generating && <div style={{ ...panel, textAlign: 'center', padding: '48px 24px', color: '#6B7280', fontSize: 14 }}>Building your rota… <span style={{ color: '#9CA3AF' }}>(the scheduler may take a few seconds to wake up)</span></div>}
        {error && <div style={{ ...panel, padding: '16px 18px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13.5 }}>{error} <button onClick={generate} style={{ marginLeft: 8, fontFamily: 'inherit', fontWeight: 700, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button></div>}
        {!generating && !error && !result && <RulesPanel />}
        {result && <Result result={result} staff={staff} team={est.team} />}
      </div>}
    </div>
  </div>
}

// ── pieces ───────────────────────────────────────────────────────────────────
function Progress({ steps, step }) {
  const labels = ['Shifts', 'Team', 'Rota']
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {labels.map((l, i) => { const on = (steps[step].tab === 'shifts' ? 0 : steps[step].tab === 'team' ? 1 : 2) >= i
      return <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 22, height: 22, borderRadius: 99, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? PINK : '#EFEFF2', color: on ? '#fff' : '#9CA3AF' }}>{i + 1}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? '#111827' : '#9CA3AF' }}>{l}</span>
        </span>
        {i < labels.length - 1 && <span style={{ width: 16, height: 1, background: '#E5E7EB' }} />}
      </div> })}
  </div>
}

function Coach({ step, cur, generating, onBack, onNext, onRestart }) {
  const nextLabel = cur.generate ? (generating ? 'Building…' : 'Generate the rota →') : cur.done ? 'Finish →' : 'Next →'
  return <div key={step} className="tmUp" style={{ background: '#FFF4F8', border: `1px solid ${PINK}33`, borderLeft: `5px solid ${PINK}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap', boxShadow: `0 6px 20px ${PINK}1A` }}>
    <div style={{ width: 38, height: 38, borderRadius: 99, flexShrink: 0, background: PINK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, animation: 'tmPulse 2.4s ease-in-out infinite' }}>S</div>
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: PINK, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>Your guide</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2, color: '#111827' }}>{cur.title}</div>
      <div style={{ fontSize: 13.5, color: '#4B5563', lineHeight: 1.5 }}>{cur.body}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {step > 0 && !cur.done && <button onClick={onBack} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#6B7280', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '11px 16px', cursor: 'pointer' }}>Back</button>}
      {cur.done && <button onClick={onRestart} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#6B7280', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '11px 16px', cursor: 'pointer' }}>Try another</button>}
      <button onClick={onNext} disabled={generating} style={{ ...primaryBtn(generating), fontSize: 14.5, padding: '12px 22px' }}>{nextLabel}</button>
    </div>
  </div>
}
function RulesPanel() {
  return <div className="tmUp" style={panel}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>The rules</div>
    <div style={{ fontSize: 15, fontWeight: 800 }}>Every Shiftly rota is built fair</div>
    <div style={{ fontSize: 13, color: '#6B7280', margin: '3px 0 16px' }}>Anyone can fill a grid. Shiftly fills it fairly, every time <span style={{ color: '#9CA3AF' }}>(hover a rule to see what it means)</span>:</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {RULES.map((r) => <RuleRow key={r.key} marker="✓" color={PINK} label={r.label} tip={r.tip} />)}
    </div>
    <div style={{ marginTop: 16, fontSize: 12.5, color: '#9CA3AF' }}>Generate the rota above and we’ll prove every one.</div>
  </div>
}
function Confetti() {
  const cols = [PINK, '#6366F1', '#14B8A6', '#F59E0B', '#FFA8C7', '#C20D5C']
  const pieces = Array.from({ length: 70 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 1.2, dur: 2.8 + Math.random() * 2.2, c: cols[i % cols.length], w: 6 + Math.random() * 7, rot: Math.random() * 360 }))
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {pieces.map((p, i) => <span key={i} style={{ position: 'absolute', top: -24, left: `${p.left}%`, width: p.w, height: p.w * 0.55, background: p.c, borderRadius: 2, transform: `rotate(${p.rot}deg)`, animation: `tmFall ${p.dur}s linear ${p.delay}s infinite` }} />)}
  </div>
}
function Finish({ est, onRestart }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [sent, setSent] = useState(false)
  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/try-me/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (!res.ok || data.error) { setErr(data.error || 'Try again.'); setBusy(false); return }
      setSent(true); setBusy(false)
    } catch { setErr('Network error, try again.'); setBusy(false) }
  }
  const featuresLink = <a href="/features" style={{ display: 'inline-block', marginTop: 16, fontSize: 13, fontWeight: 700, color: PINK, textDecoration: 'none' }}>Take a closer look at our features →</a>
  return <div style={{ fontFamily: FONT, minHeight: '100vh', background: '#FAFAFB', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
    <style>{TM_ANIM}</style>
    <Confetti />
    <div className="tmUp" style={{ position: 'relative', zIndex: 1, maxWidth: 460, width: '100%', background: '#fff', color: '#111827', borderRadius: 22, padding: '40px 34px', textAlign: 'center', border: '1px solid #ECECEF', boxShadow: '0 24px 60px rgba(17,24,39,.14)' }}>
      {sent ? <>
        <div style={{ width: 56, height: 56, borderRadius: 99, background: '#16A34A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, margin: '0 auto 16px' }}>✓</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, margin: '0 0 10px' }}>You’re on the list</h1>
        <p style={{ fontSize: 14.5, color: '#6B7280', margin: '0 0 18px', lineHeight: 1.55 }}>We’ll email you the moment Shiftly opens up, and set it up for your {est.short} from day one.</p>
        {featuresLink}
        <button onClick={onRestart} style={{ ...primaryBtn(false), width: '100%', marginTop: 18 }}>Try another type</button>
      </> : <>
        <div style={{ fontSize: 12, fontWeight: 800, color: PINK, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>That’s the whole loop</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 12px', lineHeight: 1.12 }}>Fair shifts, in a couple of clicks.</h1>
        <p style={{ fontSize: 14.5, color: '#6B7280', margin: '0 0 22px', lineHeight: 1.55 }}>That’s exactly how Shiftly builds your real rota: fair, covered and compliant. Join the waitlist and we’ll set you up for your {est.short} the moment we go live.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} type="email" placeholder="you@business.com" autoFocus style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', padding: '13px 15px', borderRadius: 11, border: '1px solid #E5E7EB', outline: 'none', textAlign: 'center' }} />
        {err && <div style={{ fontSize: 12.5, color: '#B91C1C', marginTop: 8 }}>{err}</div>}
        <button onClick={submit} disabled={busy} style={{ ...primaryBtn(busy), width: '100%', fontSize: 15, marginTop: 12 }}>{busy ? 'Saving…' : 'Join the waitlist →'}</button>
        {featuresLink}
        <div><button onClick={onRestart} style={{ marginTop: 6, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 6 }}>Try another type of place</button></div>
      </>}
    </div>
  </div>
}

function Picker({ onPick }) {
  return <HeatGlow as="div" palette={SHIFTLY_PALETTE} style={{ fontFamily: FONT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div className="tmUp" style={{ maxWidth: 660, width: '100%', background: '#fff', color: '#111827', borderRadius: 26, padding: '52px 48px', textAlign: 'center', boxShadow: '0 30px 80px rgba(17,24,39,.30)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: PINK, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Try it free · no sign-up</div>
      <h1 style={{ fontFamily: "'Cal Sans', system-ui, sans-serif", fontSize: 44, fontWeight: 600, letterSpacing: -0.5, margin: '0 0 14px', lineHeight: 1.08 }}>See Shiftly build a rota, in under a minute.</h1>
      <p style={{ fontSize: 16, color: '#6B7280', maxWidth: 480, margin: '0 auto 30px', lineHeight: 1.55 }}>Pick a kind of place and we’ll walk you through building a real week’s rota, the same way you would for your own business.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ESTS.map((e) => <button key={e.id} onClick={() => onPick(e)} style={{ fontFamily: 'inherit', background: '#FAFAFB', borderRadius: 14, textAlign: 'left', cursor: 'pointer', border: '1px solid #ECECEF', padding: 16, transition: 'transform .12s, box-shadow .12s, border-color .12s' }}
          onMouseEnter={(ev) => { ev.currentTarget.style.transform = 'translateY(-3px)'; ev.currentTarget.style.boxShadow = `0 10px 24px ${PINK}22`; ev.currentTarget.style.borderColor = PINK }}
          onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'none'; ev.currentTarget.style.boxShadow = 'none'; ev.currentTarget.style.borderColor = '#ECECEF' }}>
          <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'capitalize', marginBottom: 5 }}>{e.short}</div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{e.tag}</div>
          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: PINK }}>Walk me through it →</div>
        </button>)}
      </div>
      <div style={{ marginTop: 22, fontSize: 12.5, color: '#9CA3AF' }}>Takes about a minute · nothing to install · no card</div>
    </div>
  </HeatGlow>
}

function Result({ result, staff, team }) {
  const blocksFor = (s) => (result.assignments || []).filter((a) => String(a.staff_id) === String(s.id) || a.staff_name === s.name)
  const total = (result.assignments || []).length
  return <div className="tmUp">
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>✓ The rota is ready</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{total} shifts assigned{result.stats?.wall_time ? ` · built in ${result.stats.wall_time}s` : ''}. Fair, covered, keyholder on every open and close.</div>
    </div>
    <div style={panel}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>{team} · weekly rota</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: 160 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
          <thead><tr><th style={{ position: 'sticky', left: 0, background: '#fff' }} />{DAYS.map((d) => <th key={d} style={{ fontSize: 11, fontWeight: 800, padding: '4px 4px 12px', color: '#374151' }}>{d}</th>)}</tr></thead>
          <tbody>
            {staff.map((s) => { const blocks = blocksFor(s); return <tr key={s.id}>
              <td style={{ padding: '4px 4px', verticalAlign: 'middle', position: 'sticky', left: 0, background: '#fff' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}><span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, background: PINK + '18', color: PINK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{initials(s.name)}</span>{s.name || 'Unnamed'}{s.keyholder && <KeyMark size={12} />}</span>
              </td>
              {ALL.map((d) => { const b = blocks.find((x) => dayIdx(x.day) === d)
                return <td key={d} style={{ padding: '4px 4px', verticalAlign: 'middle' }}>
                  {b ? <div style={{ background: PINK + '14', border: `1px solid ${PINK}33`, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                    <div style={{ color: PINK, fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap' }}>{fmt(b.start_time)}–{fmt(b.end_time)}</div>
                    {b.shift_name && <div style={{ color: '#9CA3AF', fontSize: 9.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.shift_name}</div>}
                  </div> : null}
                </td> })}
            </tr> })}
          </tbody>
        </table>
      </div>
    </div>
    {result.compliance?.length > 0 && <div style={{ ...panel, marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Fairness check</div>
      <div style={{ fontSize: 15, fontWeight: 800 }}>Built fair, automatically</div>
      <div style={{ fontSize: 12.5, color: '#6B7280', margin: '3px 0 16px' }}>Every rule, met, on this exact rota:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {result.compliance.map((r) => <RuleRow key={r.key} marker={r.ok ? '✓' : '!'} color={r.ok ? '#16A34A' : '#F59E0B'} label={r.label} detail={r.ok ? '' : r.detail} tip={TIP[r.key]} />)}
      </div>
    </div>}
  </div>
}
