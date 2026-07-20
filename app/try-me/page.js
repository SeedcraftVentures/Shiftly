'use client'

import { useState, useMemo, useEffect } from 'react'
import { HeatGlow, SHIFTLY_PALETTE } from '../components/HeatGlow'
import { Switch } from '../components/ui/kit'
import { Inspector as ShiftInspector, TeamRotaGrid } from '../(auth)/dashboard/shifts/page'
import { Inspector as StaffInspector, AvailabilityGrid, AvailKey } from '../(auth)/dashboard/staff/page'

// ════════════════════════════════════════════════════════════════════════════
//  /try-me - guided, no-sign-in demo (lead magnet).
//  Pick an establishment → a coachmark tour walks you through the REAL builder,
//  one control at a time (click to advance), with a spotlight + caption pointing
//  at each thing. Shifts → Team (live availability demo) → Rules → Rota → waitlist.
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const FONT = "'Cal Sans Text', 'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const ALL = [0, 1, 2, 3, 4, 5, 6]
const uid = (() => { let n = 0; return () => `id${++n}` })()
const NOOP = () => {}

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

const panel = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 20, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px -12px rgba(0,0,0,.12)' }
const primaryBtn = (disabled) => ({ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: disabled ? '#F9A8D0' : PINK, border: 'none', borderRadius: 999, padding: '11px 22px', cursor: disabled ? 'default' : 'pointer', boxShadow: disabled ? 'none' : `0 4px 14px ${PINK}33` })
const ghostBtn = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#86868B', background: '#fff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 999, padding: '10px 16px', cursor: 'pointer' }
const TM_ANIM = `@keyframes tmUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes tmPulse{0%,100%{box-shadow:0 0 0 0 ${PINK}55}50%{box-shadow:0 0 0 7px ${PINK}00}}@keyframes tmHalo{0%,100%{box-shadow:0 0 0 0 ${PINK}66}50%{box-shadow:0 0 0 9px ${PINK}00}}@keyframes tmFall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}.tmUp{animation:tmUp .35s ease both}`

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
    <span style={{ color: '#3A3A3C', lineHeight: 1.4 }}><b style={{ color: '#1D1D1F', borderBottom: tip ? '1px dotted #C4C4CC' : 'none' }}>{label}</b>{detail ? <span style={{ color: '#92660B' }}> · {detail}</span> : ''}</span>
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
    {show && <span style={{ position: 'absolute', bottom: 'calc(100% + 9px)', left: '50%', transform: 'translateX(-50%)', background: '#1D1D1F', color: '#fff', fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, padding: '7px 10px', borderRadius: 8, width: 'max-content', maxWidth: 220, textAlign: 'center', zIndex: 60, boxShadow: '0 6px 18px rgba(0,0,0,.22)', pointerEvents: 'none' }}>{text}<span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '5px 5px 0', borderStyle: 'solid', borderColor: '#1D1D1F transparent transparent' }} /></span>}
  </span>
}

// ── establishment scenarios (single team each) ───────────────────────────────
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

// ── the coachmark tour sequences (one per page) ──────────────────────────────
// each step: { sel, text, wait?, before?, last? }. `sel` is a [data-tour] anchor.
const TOURS = {
  shifts: [
    { sel: '[data-tour="tm-grid"]', text: 'Here are the shifts a typical place runs. Click your opening shift to open it on the left.', wait: 'shift' },
    { sel: '[data-tour="shift-name"]', text: 'Give the shift a name, or keep the auto one.' },
    { sel: '[data-tour="shift-pin"]', text: 'Pin it to your opening time, your closing time, or leave it free.' },
    { sel: '[data-tour="shift-length"]', text: 'Set how long it is: 4, 8 or 12 hours, or go fully custom.' },
    { sel: '[data-tour="shift-days"]', text: 'Choose which days of the week it runs.' },
    { sel: '[data-tour="shift-staff"]', text: 'Say how many people you need on it.' },
    { sel: '[data-tour="shift-keyholder"]', text: 'And flag it if a keyholder has to be on to lock up.' },
    { sel: '[data-tour="tm-next"]', text: 'That’s a shift, sorted. Now let’s assign the team.', last: true },
  ],
  team: [
    { sel: '[data-tour="tm-grid"]', text: 'Each row shows when someone’s free. Click a name to see their details.', wait: 'staff' },
    { sel: '[data-tour="staff-name"]', text: 'Their name…' },
    { sel: '[data-tour="staff-role"]', text: '…and what they do.' },
    { sel: '[data-tour="staff-contracted"]', text: 'The hours they’re contracted to each week.' },
    { sel: '[data-tour="staff-max"]', text: 'And the most they’re happy to work.' },
    { sel: '[data-tour="staff-keyholder"]', text: 'Can they open up and lock up?' },
    { sel: '[data-tour="staff-availability"]', text: 'When they can work. Watch, let’s give a day custom hours…', before: 'availOpen' },
    { sel: '[data-tour="staff-availability"]', text: '…then set it back to all day, so the rota stays nice and simple.', before: 'availClose' },
    { sel: '[data-tour="tm-next"]', text: 'Team’s set. Now the rules that keep every rota fair.', last: true },
  ],
  rules: [
    { sel: '[data-tour="tm-rules"]', text: 'Toggle on the protections you care about. Shiftly enforces every one when it builds.' },
    { sel: '[data-tour="tm-next"]', text: 'Now watch Shiftly turn all of that into a fair week, in seconds.', last: true },
  ],
  done: [
    { sel: '[data-tour="tm-next"]', text: 'That’s your week: fair, covered and compliant. Make it yours →', last: true },
  ],
}

// ════════════════════════════════════════════════════════════════════════════
export default function TryMe() {
  const [est, setEst] = useState(null)
  const [teamId, setTeamId] = useState('demo')
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [step, setStep] = useState(0)
  const [tourIdx, setTourIdx] = useState(0)
  const [selShift, setSelShift] = useState(null)
  const [selStaff, setSelStaff] = useState(null)
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
    setEst(e); setStep(0); setTourIdx(0); setResult(null); setError(null); setSelShift(null); setSelStaff(null)
  }
  const patchStaff = (id, p) => setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const setAvailDay = (d, val) => setStaff((prev) => prev.map((s) => (s.id === selStaff ? { ...s, avail: { ...s.avail, [d]: val } } : s)))

  const generate = async () => {
    setGenerating(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/try-me/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business: cfg.business, shifts, staff }) })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Could not build a rota.') }
      else { await new Promise((r) => setTimeout(r, 1100)); setResult(data); setStep(3); setTourIdx(0) } // hold the build a beat longer, feels less instant
    } catch { setError('Network error, try again.') } finally { setGenerating(false) }
  }

  const steps = [
    { tab: 'shifts' },
    { tab: 'team' },
    { tab: 'rules', generate: true },
    { tab: 'rota', done: true },
  ]
  const cur = est ? steps[step] : null
  const tourKey = cur ? (cur.done ? 'done' : cur.tab) : null
  const curTour = tourKey ? TOURS[tourKey] : []
  const tStep = curTour[tourIdx]

  // reset the tour + selection each time we move to a new page
  useEffect(() => { setTourIdx(0); setSelShift(null); setSelStaff(null) }, [step])
  // wait-steps advance when the user clicks a shift / staff in the grid
  useEffect(() => { if (tStep?.wait === 'shift' && selShift) setTourIdx((i) => i + 1) }, [selShift]) // eslint-disable-line
  useEffect(() => { if (tStep?.wait === 'staff' && selStaff) setTourIdx((i) => i + 1) }, [selStaff]) // eslint-disable-line
  // run a step's side-effect (the live Monday availability demo) on entry
  useEffect(() => {
    if (!tStep?.before) return
    const d = cfg.openDays[0]
    if (tStep.before === 'availOpen') {
      const t = setTimeout(() => {
        const btn = document.querySelector('[data-tour="staff-availability"] button[title="Set custom hours for this day"]')
        if (btn) btn.click()
        setTimeout(() => setAvailDay(d, [cfg.open, Math.min(cfg.close, cfg.open + 4)]), 130)
      }, 60)
      return () => clearTimeout(t)
    }
    if (tStep.before === 'availClose') { const t = setTimeout(() => setAvailDay(d, true), 80); return () => clearTimeout(t) }
  }, [step, tourIdx]) // eslint-disable-line

  if (!est) return <Picker onPick={pick} />
  if (finished) return <Finish est={est} onRestart={() => { setEst(null); setFinished(false); setResult(null); setStep(0) }} />

  const shiftObj = shifts.find((s) => s.id === selShift)
  const staffObj = staff.find((s) => s.id === selStaff)
  const groups = [{ name: est.team, color: PINK, shifts }]
  const staffGroups = [{ name: est.team, color: PINK, staff }]

  const pageAdvance = () => { if (cur.generate) generate(); else if (cur.done) setFinished(true); else { setStep(step + 1) } }
  const tourBack = () => { if (tourIdx > 0) setTourIdx(tourIdx - 1); else if (step > 0) setStep(step - 1) }
  const nextLabel = cur.generate ? (generating ? 'Building…' : 'Generate the rota →') : cur.done ? 'Finish →' : 'Next →'
  const tourActive = !!tStep && !generating

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#1D1D1F', paddingBottom: 80 }}>
    <style>{TM_ANIM}</style>
    {/* header / progress */}
    <div style={{ borderBottom: '1px solid #ECECEF', background: '#fff', position: 'relative', zIndex: 80 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Shiftly</span>
          <span style={{ fontSize: 13, color: '#AEAEB2', fontWeight: 600 }}>· {est.team}</span>
        </div>
        <Progress step={step} />
      </div>
    </div>

    {cur.tab === 'rota' && result && <ConfettiBurst />}
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto', padding: '24px 24px 0' }}>
      {cur.tab === 'shifts' && <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ ...panel, position: 'sticky', top: 16 }}><ShiftInspector key={selShift || 'none'} shift={shiftObj} patch={NOOP} onDelete={NOOP} saveState="clean" onSave={NOOP} accent={PINK} cfg={cfg} tips readOnly /></div>
        <div style={panel} data-tour="tm-grid">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Your shifts <span style={{ color: '#AEAEB2', fontWeight: 600 }}>· {shifts.length}</span></span>
            <span style={{ fontSize: 11.5, color: '#AEAEB2', fontWeight: 600 }}>Click a shift to see its details</span>
          </div>
          <TeamRotaGrid groups={groups} cfg={cfg} selectedId={selShift} onSelect={setSelShift} />
        </div>
      </div>}

      {cur.tab === 'team' && <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ ...panel, position: 'sticky', top: 16 }}><StaffInspector key={selStaff || 'none'} s={staffObj} patch={(p) => patchStaff(selStaff, p)} onDelete={NOOP} saveState="clean" onSave={NOOP} accent={PINK} cfg={cfg} hidePay readOnly /></div>
        <div style={panel} data-tour="tm-grid">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Your team <span style={{ color: '#AEAEB2', fontWeight: 600 }}>· {staff.length}</span></span>
            <span style={{ fontSize: 11.5, color: '#AEAEB2', fontWeight: 600 }}>Click a person to see their details</span>
          </div>
          <AvailabilityGrid groups={staffGroups} cfg={cfg} selectedId={selStaff} onSelect={setSelStaff} />
          <AvailKey accent={PINK} />
        </div>
      </div>}

      {cur.tab === 'rules' && (generating
        ? <BuildingPanel />
        : error ? <ErrorPanel error={error} onRetry={generate} /> : <RulesStep />)}

      {cur.tab === 'rota' && <div>
        {result ? <Result result={result} staff={staff} team={est.team} /> : <BuildingPanel />}
      </div>}

      {/* footer nav, the persistent Back / Next the coachmark points at */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '20px 0 8px' }}>
        <button onClick={tourBack} disabled={step === 0 && tourIdx === 0} style={{ ...ghostBtn, opacity: step === 0 && tourIdx === 0 ? 0.45 : 1 }}>‹ Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setEst(null)} style={{ background: 'none', border: 'none', color: '#AEAEB2', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Start over</button>
          <button data-tour="tm-next" onClick={pageAdvance} disabled={generating} style={{ ...primaryBtn(generating), fontSize: 14.5, padding: '12px 22px' }}>{nextLabel}</button>
        </div>
      </div>
    </div>

    {tourActive && <Coachmark step={step} tourIdx={tourIdx} tStep={tStep}
      depKey={`${step}|${tourIdx}|${selShift}|${selStaff}|${!!result}`}
      onPrimary={() => { if (tStep.last) pageAdvance(); else setTourIdx(tourIdx + 1) }}
      onBack={tourBack} canBack={!(step === 0 && tourIdx === 0)}
      primaryLabel={tStep.last ? nextLabel : 'Got it →'} dim={!tStep.last} />}
  </div>
}

// ── coachmark overlay: spotlight a control + caption bubble, click to advance ──
function Coachmark({ tStep, depKey, onPrimary, onBack, canBack, primaryLabel, dim = true }) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    let raf
    const measure = () => { const el = document.querySelector(tStep.sel); setRect(el ? el.getBoundingClientRect() : null) }
    measure()
    const t1 = setTimeout(measure, 80), t2 = setTimeout(measure, 260)
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('scroll', onScroll, true); window.addEventListener('resize', onScroll)
    return () => { clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll) }
  }, [tStep.sel, depKey])
  if (!rect) return null

  const pad = 8
  const box = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1080
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const W = 300
  const rightRoom = vw - rect.right
  const place = rightRoom > W + 40 ? 'right' : rect.left > W + 40 ? 'left' : 'bottom'
  let bubble
  if (place === 'right') bubble = { top: clamp(rect.top, 12, vh - 200), left: rect.right + 22 }
  else if (place === 'left') bubble = { top: clamp(rect.top, 12, vh - 200), left: rect.left - 22 - W }
  else bubble = { top: rect.bottom + 22, left: clamp(rect.left, 12, vw - W - 12) }

  return <div style={{ position: 'fixed', inset: 0, zIndex: 70, pointerEvents: 'none' }}>
    {/* dim everything but the target, skipped on the final "move on" step so the
        whole page is visible and tooltips are easy to read */}
    {dim && <div style={{ position: 'absolute', ...box, borderRadius: 12, boxShadow: '0 0 0 9999px rgba(17,24,39,.5)', transition: 'all .25s' }} />}
    {/* pulsing pink ring on the target */}
    <div style={{ position: 'absolute', ...box, borderRadius: 12, outline: `3px solid ${PINK}`, outlineOffset: 0, animation: 'tmHalo 1.8s ease-in-out infinite', transition: 'all .25s' }} />
    {/* caption bubble */}
    <div className="tmUp" style={{ position: 'absolute', top: bubble.top, left: bubble.left, width: W, maxWidth: '92vw', pointerEvents: 'auto', background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 18px 50px rgba(17,24,39,.30)', border: `1px solid ${PINK}26` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <span style={{ width: 26, height: 26, borderRadius: 99, background: PINK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, animation: 'tmPulse 2.4s ease-in-out infinite' }}>S</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: PINK, letterSpacing: 0.5, textTransform: 'uppercase' }}>Your guide</span>
      </div>
      <div style={{ fontSize: 13.5, color: '#3A3A3C', lineHeight: 1.5, marginBottom: 13 }}>{tStep.text}</div>
      {tStep.wait
        ? <div style={{ fontSize: 12.5, fontWeight: 700, color: PINK, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 15 }}>☝</span> Click the highlighted area to carry on</div>
        : <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canBack && <button onClick={onBack} style={ghostBtn}>Back</button>}
            <button onClick={onPrimary} style={{ ...primaryBtn(false), flex: 1, fontSize: 13.5, padding: '10px 14px' }}>{primaryLabel}</button>
          </div>}
    </div>
  </div>
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ── pieces ───────────────────────────────────────────────────────────────────
function Progress({ step }) {
  const labels = ['Shifts', 'Team', 'Rules', 'Rota']
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {labels.map((l, i) => { const on = step >= i
      return <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 22, height: 22, borderRadius: 99, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? PINK : '#EFEFF2', color: on ? '#fff' : '#AEAEB2' }}>{i + 1}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? '#1D1D1F' : '#AEAEB2' }}>{l}</span>
        </span>
        {i < labels.length - 1 && <span style={{ width: 16, height: 1, background: '#E5E7EB' }} />}
      </div> })}
  </div>
}

function RulesStep() {
  return <div className="tmUp" style={panel}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>The rules</div>
    <div style={{ fontSize: 16, fontWeight: 800 }}>What keeps every rota fair</div>
    <div style={{ fontSize: 13, color: '#86868B', margin: '3px 0 16px' }}>Switch on the protections you care about. Shiftly enforces every one when it builds.</div>
    <div data-tour="tm-rules" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {RULES.map((r) => <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: `1.5px solid ${PINK}33`, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1D1D1F', marginBottom: 2 }}>{r.label}</div>
          <div style={{ fontSize: 12.5, color: '#86868B', lineHeight: 1.45 }}>{r.tip}</div>
        </div>
        <Switch on onChange={NOOP} accent={PINK} />
      </div>)}
    </div>
  </div>
}

function BuildingPanel() {
  return <div style={{ ...panel, textAlign: 'center', padding: '48px 24px', color: '#86868B', fontSize: 14 }}>
    <div style={{ width: 34, height: 34, margin: '0 auto 14px', border: `4px solid ${PINK}22`, borderTopColor: PINK, borderRadius: 99, animation: 'spin 0.8s linear infinite' }} />
    Building your rota… <span style={{ color: '#AEAEB2' }}>(the scheduler may take a few seconds to wake up)</span>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
}
function ErrorPanel({ error, onRetry }) {
  return <div style={{ ...panel, padding: '16px 18px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13.5 }}>{error} <button onClick={onRetry} style={{ marginLeft: 8, fontFamily: 'inherit', fontWeight: 700, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button></div>
}

// ── result grid, matches the app's rota grid (RefinedRotaGrid) ───────────────
const RTH = { fontSize: 11, fontWeight: 700, color: '#86868B', padding: '6px 6px 10px', textAlign: 'center' }
const RTH_STAFF = { ...RTH, textAlign: 'left', position: 'sticky', left: 0, background: '#fff', minWidth: 150 }
const RTD = { padding: '4px 4px', verticalAlign: 'top' }
const RTD_STAFF = { padding: '4px 4px', verticalAlign: 'top', position: 'sticky', left: 0, background: '#fff' }
function TmRotaGrid({ staff, assignments, team }) {
  const di = (a) => dayIdx(a.day)
  return <div style={{ ...panel, padding: '22px 24px' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 17, fontWeight: 800 }}>Week 1</span>
      <span style={{ fontSize: 12.5, color: '#AEAEB2' }}>{team}</span>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: 150 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
        <thead><tr><th style={RTH_STAFF}></th>{DAYS.map((d) => <th key={d} style={RTH}><div style={{ fontWeight: 800, color: '#3A3A3C' }}>{d}</div></th>)}</tr></thead>
        <tbody>
          <tr><td colSpan={8} style={{ padding: '8px 0' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: PINK }} /><span style={{ fontSize: 12, fontWeight: 800, color: PINK, letterSpacing: 0.4, textTransform: 'uppercase' }}>{team}</span><div style={{ flex: 1, height: 1, background: '#F0F0F2' }} /></div></td></tr>
          {staff.map((s) => { const blocks = assignments.filter((a) => String(a.staff_id) === String(s.id) || a.staff_name === s.name)
            return <tr key={s.id}>
              <td style={RTD_STAFF}><span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#1D1D1F' }}><span style={{ width: 9, height: 9, borderRadius: 99, background: PINK, flexShrink: 0 }} />{s.name}{s.keyholder && <KeyMark size={12} />}</span></td>
              {ALL.map((d) => { const cell = blocks.filter((x) => di(x) === d)
                return <td key={d} style={RTD}>{cell.length > 0
                  ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{cell.map((a, i) => <div key={i} style={{ background: PINK, borderRadius: 10, padding: '7px 10px', boxShadow: `0 2px 6px ${PINK}40` }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 11, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.shift_name || 'Shift'}</div>
                      <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 9.5 }}>{fmt(a.start_time)}-{fmt(a.end_time)}</div>
                    </div>)}</div>
                  : null}</td>
              })}
            </tr> })}
        </tbody>
      </table>
    </div>
  </div>
}

function Result({ result, staff, team }) {
  const total = (result.assignments || []).length
  return <div className="tmUp">
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>✓ The rota is ready</div>
      <div style={{ fontSize: 13, color: '#86868B', marginTop: 2 }}>{total} shifts assigned{result.stats?.wall_time ? ` · built in ${result.stats.wall_time}s` : ''}. Fair, covered, keyholder on every open and close.</div>
    </div>
    <TmRotaGrid staff={staff} assignments={result.assignments || []} team={team} />
    {result.compliance?.length > 0 && <div style={{ ...panel, marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Fairness check</div>
      <div style={{ fontSize: 15, fontWeight: 800 }}>Built fair, automatically</div>
      <div style={{ fontSize: 12.5, color: '#86868B', margin: '3px 0 16px' }}>Every rule, met, on this exact rota:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {result.compliance.map((r) => <RuleRow key={r.key} marker={r.ok ? '✓' : '!'} color={r.ok ? '#16A34A' : '#F59E0B'} label={r.label} detail={r.ok ? '' : r.detail} tip={TIP[r.key]} />)}
      </div>
    </div>}
  </div>
}

function Confetti() {
  const cols = [PINK, '#6366F1', '#14B8A6', '#F59E0B', '#FFA8C7', '#C20D5C']
  const pieces = Array.from({ length: 70 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 12) * 0.1, dur: 2.8 + (i % 7) * 0.3, c: cols[i % cols.length], w: 6 + (i % 7), rot: (i * 47) % 360 }))
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {pieces.map((p, i) => <span key={i} style={{ position: 'absolute', top: -24, left: `${p.left}%`, width: p.w, height: p.w * 0.55, background: p.c, borderRadius: 2, transform: `rotate(${p.rot}deg)`, animation: `tmFall ${p.dur}s linear ${p.delay}s infinite` }} />)}
  </div>
}
// a single quick burst (plays once), fired behind the cards when the rota lands
function ConfettiBurst() {
  const cols = [PINK, '#6366F1', '#14B8A6', '#F59E0B', '#FFA8C7', '#C20D5C']
  const pieces = Array.from({ length: 96 }, (_, i) => ({ left: (i * 31) % 100, delay: (i % 8) * 0.05, dur: 2.3 + (i % 6) * 0.22, c: cols[i % cols.length], w: 6 + (i % 6), rot: (i * 53) % 360 }))
  return <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    {pieces.map((p, i) => <span key={i} style={{ position: 'absolute', top: -24, left: `${p.left}%`, width: p.w, height: p.w * 0.55, background: p.c, borderRadius: 2, transform: `rotate(${p.rot}deg)`, animation: `tmFall ${p.dur}s linear ${p.delay}s 1 forwards` }} />)}
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
  return <div style={{ fontFamily: FONT, minHeight: '100vh', background: '#FAFAFB', color: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
    <style>{TM_ANIM}</style>
    <Confetti />
    <div className="tmUp" style={{ position: 'relative', zIndex: 1, maxWidth: 460, width: '100%', background: '#fff', color: '#1D1D1F', borderRadius: 22, padding: '40px 34px', textAlign: 'center', border: '1px solid #ECECEF', boxShadow: '0 24px 60px rgba(17,24,39,.14)' }}>
      {sent ? <>
        <div style={{ width: 56, height: 56, borderRadius: 99, background: '#16A34A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, margin: '0 auto 16px' }}>✓</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, margin: '0 0 10px' }}>You’re on the list</h1>
        <p style={{ fontSize: 14.5, color: '#86868B', margin: '0 0 18px', lineHeight: 1.55 }}>We’ll email you the moment Shiftly opens up, and set it up for your {est.short} from day one.</p>
        {featuresLink}
        <button onClick={onRestart} style={{ ...primaryBtn(false), width: '100%', marginTop: 18 }}>Try another type</button>
      </> : <>
        <div style={{ fontSize: 12, fontWeight: 800, color: PINK, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>That’s the whole loop</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 12px', lineHeight: 1.12 }}>Fair shifts, in a couple of clicks.</h1>
        <p style={{ fontSize: 14.5, color: '#86868B', margin: '0 0 22px', lineHeight: 1.55 }}>That’s exactly how Shiftly builds your real rota: fair, covered and compliant. Join the waitlist and we’ll set you up for your {est.short} the moment we go live.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} type="email" placeholder="you@business.com" autoFocus style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', padding: '13px 15px', borderRadius: 11, border: '1px solid #E5E7EB', outline: 'none', textAlign: 'center' }} />
        {err && <div style={{ fontSize: 12.5, color: '#B91C1C', marginTop: 8 }}>{err}</div>}
        <button onClick={submit} disabled={busy} style={{ ...primaryBtn(busy), width: '100%', fontSize: 15, marginTop: 12 }}>{busy ? 'Saving…' : 'Join the waitlist →'}</button>
        {featuresLink}
        <div><button onClick={onRestart} style={{ marginTop: 6, background: 'none', border: 'none', color: '#AEAEB2', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 6 }}>Try another type of place</button></div>
      </>}
    </div>
  </div>
}

function Picker({ onPick }) {
  return <HeatGlow as="div" palette={SHIFTLY_PALETTE} style={{ fontFamily: FONT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div className="tmUp" style={{ maxWidth: 660, width: '100%', background: '#fff', color: '#1D1D1F', borderRadius: 26, padding: '52px 48px', textAlign: 'center', boxShadow: '0 30px 80px rgba(17,24,39,.30)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: PINK, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Try it free · no sign-up</div>
      <h1 style={{ fontFamily: "'Cal Sans', system-ui, sans-serif", fontSize: 44, fontWeight: 600, letterSpacing: -0.5, margin: '0 0 14px', lineHeight: 1.08 }}>See Shiftly build a rota, in ninety seconds.</h1>
      <p style={{ fontSize: 16, color: '#86868B', maxWidth: 480, margin: '0 auto 30px', lineHeight: 1.55 }}>Pick a kind of place and we’ll walk you through building a real week’s rota, the same way you would for your own business.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ESTS.map((e) => <button key={e.id} onClick={() => onPick(e)} style={{ fontFamily: 'inherit', background: '#FAFAFB', borderRadius: 14, textAlign: 'left', cursor: 'pointer', border: '1px solid #ECECEF', padding: 16, transition: 'transform .12s, box-shadow .12s, border-color .12s' }}
          onMouseEnter={(ev) => { ev.currentTarget.style.transform = 'translateY(-3px)'; ev.currentTarget.style.boxShadow = `0 10px 24px ${PINK}22`; ev.currentTarget.style.borderColor = PINK }}
          onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'none'; ev.currentTarget.style.boxShadow = 'none'; ev.currentTarget.style.borderColor = '#ECECEF' }}>
          <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'capitalize', marginBottom: 5 }}>{e.short}</div>
          <div style={{ fontSize: 12, color: '#86868B', lineHeight: 1.4 }}>{e.tag}</div>
          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: PINK }}>Walk me through it →</div>
        </button>)}
      </div>
      <div style={{ marginTop: 22, fontSize: 12.5, color: '#AEAEB2' }}>Takes about 90 seconds · nothing to install · no card</div>
    </div>
  </HeatGlow>
}
