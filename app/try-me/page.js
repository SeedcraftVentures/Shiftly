'use client'

import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import { Inspector as ShiftInspector, TeamRotaGrid, GapStrip, DayTimeline, AxisTicks, coveragePct } from '../(auth)/dashboard/shifts/page'
import { Inspector as StaffInspector, AvailabilityGrid, AvailKey, TeamGlance } from '../(auth)/dashboard/staff/page'

// ════════════════════════════════════════════════════════════════════════════
//  /try-me — free, no-sign-in rota builder (lead magnet).
//  Uses the REAL app builders (Shifts inspector+grid+gaps, Staff availability
//  visualizer) on in-browser state. Generate one rota free; PDF gated by a
//  waitlist email. Nothing is saved server-side except the email.
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const FONT = "'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4]
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
function KeyMark({ size = 13, color = PINK }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}><title>Keyholder</title><circle cx="8" cy="15" r="5" /><path d="M11.6 11.4 21 2" /><path d="M16.5 6.5 19.5 9.5" /></svg>
}
const Label = ({ children }) => <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 9 }}>{children}</div>
function DayPicker({ days, onChange }) {
  const toggle = (d) => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b))
  return <div style={{ display: 'flex', gap: 6 }}>
    {ALL.map((d) => { const on = days.includes(d); return <button key={d} type="button" onClick={() => toggle(d)} style={{ flex: 1, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, padding: '10px 0', borderRadius: 9, cursor: 'pointer', border: `1px solid ${on ? PINK : '#E5E7EB'}`, background: on ? PINK : '#fff', color: on ? '#fff' : '#9CA3AF', transition: 'all .12s' }}>{DAYS[d]}</button> })}
  </div>
}
function TimeRange({ start, end, onChange, domain = [0, 24] }) {
  const trackRef = useRef(null), drag = useRef(null)
  const [dS, dE] = domain, span = dE - dS
  const pct = (v) => ((v - dS) / span) * 100
  useEffect(() => {
    function move(e) {
      if (!drag.current || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const t = Math.round((dS + r * span) * 2) / 2
      if (drag.current === 'start') onChange(Math.min(t, end - 1), end)
      else onChange(start, Math.max(t, start + 1))
    }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [start, end, onChange, dS, span])
  const handle = (which, v) => <div onPointerDown={() => (drag.current = which)} style={{ position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: 99, background: '#fff', border: `2px solid ${PINK}`, boxShadow: '0 1px 4px rgba(0,0,0,.18)', cursor: 'grab', touchAction: 'none', zIndex: 2 }} />
  return <div ref={trackRef} style={{ position: 'relative', height: 22, userSelect: 'none' }}>
    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', background: '#EFEFF2', borderRadius: 99 }} />
    <div style={{ position: 'absolute', top: '50%', left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%`, height: 6, transform: 'translateY(-50%)', background: `linear-gradient(90deg, ${PINK}99, ${PINK})`, borderRadius: 99 }} />
    {handle('start', start)}{handle('end', end)}
  </div>
}

const TEAM_COLORS = ['#FF1F7D', '#6366F1', '#14B8A6', '#F59E0B', '#0EA5E9', '#8B5CF6']
const TEAM_PRESETS = ['Front of House', 'Bar', 'Kitchen', 'Management', 'Shop floor', 'Supervisors', 'Baristas', 'Cleaning']
function TeamSelect({ teams, value, onChange }) {
  if (teams.length <= 1) return null
  return <div style={{ marginBottom: 16 }}>
    <Label>Team</Label>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {teams.map((t) => { const on = t.id === value; return <button key={t.id} type="button" onClick={() => onChange(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? t.color : '#E5E7EB'}`, background: on ? t.color + '14' : '#fff', color: on ? t.color : '#9CA3AF' }}><span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />{t.name}</button> })}
    </div>
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
export default function TryMe() {
  const [phase, setPhase] = useState('intro') // intro · hours · build
  const [openDaysSel, setOpenDaysSel] = useState([0, 1, 2, 3, 4, 5])
  const [hours, setHours] = useState([9, 17])
  const [teams, setTeams] = useState([{ id: uid(), name: 'Front of House', color: TEAM_COLORS[0] }])
  const teamColor = (id) => teams.find((t) => t.id === id)?.color || PINK
  const teamName = (id) => teams.find((t) => t.id === id)?.name || 'Team'
  const business = useMemo(() => Object.fromEntries(ALL.map((d) => [d, openDaysSel.includes(d) ? [hours[0], hours[1]] : null])), [openDaysSel, hours])
  const cfg = useMemo(() => {
    const openDays = ALL.filter((d) => business[d])
    const opens = openDays.map((d) => business[d][0]), closes = openDays.map((d) => business[d][1])
    const open = opens.length ? Math.min(...opens) : 9, close = closes.length ? Math.max(...closes) : 17
    return { business, openDays, open, close, glance: [Math.floor(open), Math.ceil(close)], slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
  }, [business])
  const [tab, setTab] = useState('shifts')
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [selShift, setSelShift] = useState(null)
  const [selStaff, setSelStaff] = useState(null)
  const [shiftSave, setShiftSave] = useState('clean')
  const [staffSave, setStaffSave] = useState('clean')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [gateOpen, setGateOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  // ── shifts ──
  const addShiftRaw = (over = {}) => { const team_id = over.team_id || shifts.find((s) => s.id === selShift)?.team_id || teams[0]?.id; const s = { id: uid(), team_id, pin: 'open', name: 'Open', start: cfg.open, end: Math.min(cfg.close, cfg.open + 8), days: WEEKDAYS.filter((d) => cfg.openDays.includes(d)), staff: 1, keyholder: false, ...over }; setShifts((p) => [...p, s]); setSelShift(s.id); setShiftSave('clean') }
  const patchShift = (id, p) => { setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setShiftSave('dirty') }
  const removeShift = (id) => { setShifts((prev) => prev.filter((s) => s.id !== id)); setSelShift(null) }
  const saveShift = () => { setShiftSave('saved'); setTimeout(() => setShiftSave((x) => (x === 'saved' ? 'clean' : x)), 1200) }
  const applyGapFor = (team_id, sug) => {
    const name = sug.kind === 'open' ? 'Open' : sug.kind === 'close' ? 'Close' : 'Custom'
    if (sug.kind === 'mid') return addShiftRaw({ team_id, pin: 'none', name, start: sug.from, end: sug.to, days: [sug.day] })
    const start = sug.kind === 'open' ? cfg.open : Math.max(cfg.open, cfg.close - 8)
    const end = sug.kind === 'open' ? Math.min(cfg.close, cfg.open + 8) : cfg.close
    addShiftRaw({ team_id, pin: sug.kind, name, start, end, days: [...sug.days] })
  }

  // ── staff ──
  const addStaffRaw = () => { const team_id = staff.find((s) => s.id === selStaff)?.team_id || teams[0]?.id; const s = { id: uid(), team_id, name: '', role: '', contracted: 0, max: 40, wage: 11.44, pay_basis: 'hourly', annual_salary: 0, annualised_hours: 0, keyholder: false, avail: Object.fromEntries(cfg.openDays.map((d) => [d, true])) }; setStaff((p) => [...p, s]); setSelStaff(s.id); setStaffSave('clean') }
  const patchStaff = (id, p) => { setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setStaffSave('dirty') }
  const removeStaff = (id) => { setStaff((prev) => prev.filter((s) => s.id !== id)); setSelStaff(null) }
  const saveStaff = () => { setStaffSave('saved'); setTimeout(() => setStaffSave((x) => (x === 'saved' ? 'clean' : x)), 1200) }

  const generate = async () => {
    setTab('rota'); setGenerating(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/try-me/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business, shifts, staff }) })
      const data = await res.json()
      if (!res.ok || data.error) setError(data.error || 'Could not build a rota.')
      else setResult(data)
    } catch { setError('Network error — try again.') } finally { setGenerating(false) }
  }
  const canGenerate = shifts.length > 0 && shifts.every((s) => s.days.length) && staff.length > 0

  const shiftObj = shifts.find((s) => s.id === selShift)
  const staffObj = staff.find((s) => s.id === selStaff)

  if (phase === 'intro') return <Intro onStart={() => setPhase('hours')} />
  if (phase === 'hours') return <HoursStep openDaysSel={openDaysSel} setOpenDaysSel={setOpenDaysSel} hours={hours} setHours={setHours} teams={teams} setTeams={setTeams} onBack={() => setPhase('intro')} onContinue={() => setPhase('build')} />

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827' }}>
    <style>{`@media print { body * { visibility: hidden !important } #printable, #printable * { visibility: visible !important } #printable { position: absolute; left: 0; top: 0; width: 100% } .no-print { display: none !important } }`}</style>

    <div style={{ borderBottom: '1px solid #ECECEF', background: '#fff' }} className="no-print">
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Shiftly</span>
          <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>free rota builder</span>
        </div>
        <div style={{ display: 'inline-flex', background: '#F1F1F4', borderRadius: 11, padding: 4, gap: 2 }}>
          {[['shifts', `Shifts${shifts.length ? ` · ${shifts.length}` : ''}`], ['team', `Team${staff.length ? ` · ${staff.length}` : ''}`], ['rota', 'Rota']].map(([k, lbl]) => <button key={k} onClick={() => setTab(k)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', color: tab === k ? '#111827' : '#9CA3AF', background: tab === k ? '#fff' : 'transparent', boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>{lbl}</button>)}
        </div>
        <button onClick={generate} disabled={!canGenerate || generating} style={primaryBtn(!canGenerate || generating)}>{generating ? 'Building…' : 'Generate rota →'}</button>
      </div>
    </div>

    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 24px 60px' }}>
      {/* ── Shifts (real builder) ── */}
      {tab === 'shifts' && (() => {
        const fTeam = shiftObj?.team_id || teams[0]?.id
        const fShifts = shifts.filter((s) => s.team_id === fTeam)
        const acc = teamColor(shiftObj?.team_id)
        return <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'start' }}>
          <div style={{ ...panel, position: 'sticky', top: 16 }}>
            {shiftObj && <TeamSelect teams={teams} value={shiftObj.team_id} onChange={(team_id) => patchShift(selShift, { team_id })} />}
            <ShiftInspector key={selShift || 'none'} shift={shiftObj} patch={(p) => patchShift(selShift, p)} onDelete={() => removeShift(selShift)} saveState={shiftSave} onSave={saveShift} accent={acc} cfg={cfg} />
          </div>
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Your shifts <span style={{ color: '#9CA3AF', fontWeight: 600 }}>· {shifts.length}</span></span>
              <button onClick={() => addShiftRaw({})} style={addBtn}>+ Add shift</button>
            </div>
            {shifts.length > 0 && <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 10 }}>Click a shift to edit it{teams.length > 1 ? ' (and pick its team)' : ''}. Fill any gaps below.</div>}
            {shifts.length === 0
              ? <Empty>No shifts yet. Add the patterns your team works each week.</Empty>
              : <>
                <TeamRotaGrid groups={teams.map((t) => ({ name: t.name, color: t.color, shifts: shifts.filter((s) => s.team_id === t.id) }))} cfg={cfg} selectedId={selShift} onSelect={setSelShift} />
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #ECECEF', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{teams.length > 1 ? `${teamName(fTeam)} · ` : ''}Week at a glance · <span style={{ color: coveragePct(fShifts, cfg) === 100 ? '#16A34A' : acc }}>{coveragePct(fShifts, cfg)}%</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: cfg.business[d] ? '#6B7280' : '#C4C4CC' }}>{DAYS[d]}</span>
                        <DayTimeline dayIndex={d} shifts={fShifts} color={acc} cfg={cfg} />
                      </div>)}
                    </div>
                    <AxisTicks cfg={cfg} />
                  </div>
                  <div><GapStrip shifts={fShifts} onApply={(sug) => applyGapFor(fTeam, sug)} accent={acc} cfg={cfg} /></div>
                </div>
              </>}
          </div>
        </div>
      })()}

      {/* ── Team (real builder) ── */}
      {tab === 'team' && (() => {
        const fTeam = staffObj?.team_id || teams[0]?.id
        const acc = teamColor(staffObj?.team_id)
        return <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }}>
          <div style={{ ...panel, position: 'sticky', top: 16 }}>
            {staffObj && <TeamSelect teams={teams} value={staffObj.team_id} onChange={(team_id) => patchStaff(selStaff, { team_id })} />}
            <StaffInspector key={selStaff || 'none'} s={staffObj} patch={(p) => patchStaff(selStaff, p)} onDelete={() => removeStaff(selStaff)} saveState={staffSave} onSave={saveStaff} accent={acc} cfg={cfg} />
          </div>
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Your team <span style={{ color: '#9CA3AF', fontWeight: 600 }}>· {staff.length}</span></span>
              <button onClick={addStaffRaw} style={addBtn}>+ Add team member</button>
            </div>
            {staff.length > 0 && <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 12 }}>Click someone to set their hours, keyholder status{teams.length > 1 ? ', team' : ''} and availability.</div>}
            {staff.length === 0
              ? <Empty>No team yet. Add people and set when each of them is available.</Empty>
              : <>
                <AvailabilityGrid groups={teams.map((t) => ({ name: t.name, color: t.color, staff: staff.filter((s) => s.team_id === t.id) }))} cfg={cfg} selectedId={selStaff} onSelect={setSelStaff} />
                <AvailKey accent={acc} />
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #ECECEF' }}>
                  <TeamGlance staff={staff.filter((s) => s.team_id === fTeam)} shifts={shifts.filter((s) => s.team_id === fTeam)} teamName={teamName(fTeam)} teamId={fTeam} accent={acc} cfg={cfg} wide />
                </div>
              </>}
          </div>
        </div>
      })()}

      {/* ── Rota ── */}
      {tab === 'rota' && <div>
        {!result && !generating && !error && <div className="no-print" style={{ ...panel, textAlign: 'center', padding: '44px 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Ready to see your rota?</div>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '0 auto 20px', maxWidth: 420, lineHeight: 1.5 }}>{canGenerate ? 'Hit generate and Shiftly will build a fair rota that covers your week.' : 'Add at least one shift and one team member first.'}</p>
          <button onClick={generate} disabled={!canGenerate} style={primaryBtn(!canGenerate)}>Generate my rota</button>
        </div>}
        {generating && <div className="no-print" style={{ ...panel, textAlign: 'center', padding: '44px 24px', color: '#6B7280', fontSize: 14 }}>Building your rota… <span style={{ color: '#9CA3AF' }}>(the scheduler may take a few seconds to wake up)</span></div>}
        {error && <div className="no-print" style={{ ...panel, padding: '16px 18px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13.5 }}>{error} <button onClick={generate} style={{ marginLeft: 8, fontFamily: 'inherit', fontWeight: 700, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button></div>}
        {result && <Result result={result} staff={staff} teams={teams} onDownload={() => (unlocked ? window.print() : setGateOpen(true))} unlocked={unlocked} />}
      </div>}
    </div>

    {gateOpen && <WaitlistModal onClose={() => setGateOpen(false)} onDone={() => { setUnlocked(true); setGateOpen(false); setTimeout(() => window.print(), 300) }} />}
  </div>
}

// ── pieces ───────────────────────────────────────────────────────────────────
const Empty = ({ children }) => <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13.5, padding: '46px 0' }}>{children}</div>

function Intro({ onStart }) {
  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#111827' }}>
    <div style={{ ...panel, textAlign: 'center', padding: '48px 30px', maxWidth: 560 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: PINK, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Try it free · no sign-up</div>
      <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.6, margin: '0 0 12px', lineHeight: 1.1 }}>Build a staff rota in two minutes.</h1>
      <p style={{ fontSize: 15.5, color: '#6B7280', maxWidth: 460, margin: '0 auto 26px', lineHeight: 1.55 }}>This is the real Shiftly builder — add your shifts, add your team and their availability, and generate a fair rota that actually covers your week. No account needed.</p>
      <button onClick={onStart} style={{ ...primaryBtn(false), fontSize: 15, padding: '14px 32px' }}>Start building →</button>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginTop: 30, flexWrap: 'wrap', fontSize: 12.5, color: '#9CA3AF', fontWeight: 600 }}>
        <span>① Add shifts</span><span>② Add your team</span><span>③ Generate &amp; download</span>
      </div>
    </div>
  </div>
}

function HoursStep({ openDaysSel, setOpenDaysSel, hours, setHours, teams, setTeams, onBack, onContinue }) {
  const [custom, setCustom] = useState('')
  const addTeam = (name) => { const n = (name || '').trim(); if (!n || teams.length >= 6 || teams.some((t) => t.name.toLowerCase() === n.toLowerCase())) return; setTeams([...teams, { id: uid(), name: n, color: TEAM_COLORS[teams.length % TEAM_COLORS.length] }]); setCustom('') }
  const removeTeam = (id) => { if (teams.length > 1) setTeams(teams.filter((t) => t.id !== id)) }
  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#111827' }}>
    <div style={{ ...panel, padding: '34px 32px', maxWidth: 580, width: '100%' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: PINK, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>First · about your business</div>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, margin: '0 0 8px' }}>When are you open, and who runs it?</h1>
      <p style={{ fontSize: 14.5, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.5 }}>We’ll shape the whole builder around your real week — so what you build is yours, not a generic example.</p>
      <Label>Open days</Label>
      <DayPicker days={openDaysSel} onChange={setOpenDaysSel} />
      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <Label>Opening hours</Label>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{fmt(hours[0])} – {fmt(hours[1])}</span>
        </div>
        <TimeRange start={hours[0]} end={hours[1]} onChange={(s, e) => setHours([s, e])} domain={[0, 24]} />
      </div>
      <div style={{ marginTop: 24 }}>
        <Label>Your teams</Label>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: teams.length ? 10 : 0 }}>
          {teams.map((t) => <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, padding: '6px 10px', borderRadius: 8, background: t.color + '14', color: t.color, border: `1px solid ${t.color}33` }}><span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />{t.name}{teams.length > 1 && <button onClick={() => removeTeam(t.id)} style={{ background: 'none', border: 'none', color: t.color, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>}</span>)}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {TEAM_PRESETS.filter((p) => !teams.some((t) => t.name.toLowerCase() === p.toLowerCase()) && teams.length < 6).map((p) => <button key={p} onClick={() => addTeam(p)} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280' }}>+ {p}</button>)}
        </div>
        {teams.length < 6 && <div style={{ display: 'flex', gap: 8 }}>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTeam(custom)} placeholder="Add your own team…" style={{ flex: 1, boxSizing: 'border-box', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', padding: '9px 12px', borderRadius: 9, border: '1px solid #E5E7EB', outline: 'none' }} />
          <button onClick={() => addTeam(custom)} disabled={!custom.trim()} style={{ ...addBtn, background: custom.trim() ? PINK : '#E5E7EB' }}>Add</button>
        </div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 28 }}>
        <button onClick={onBack} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#6B7280', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 20px', cursor: 'pointer' }}>Back</button>
        <button onClick={onContinue} disabled={!openDaysSel.length || !teams.length} style={{ ...primaryBtn(!openDaysSel.length || !teams.length), fontSize: 15, padding: '13px 28px' }}>Start building →</button>
      </div>
    </div>
  </div>
}
function Result({ result, staff, teams, onDownload, unlocked }) {
  const blocksFor = (s) => (result.assignments || []).filter((a) => String(a.staff_id) === String(s.id) || a.staff_name === s.name)
  const groups = (teams || []).map((t) => ({ t, members: staff.filter((s) => s.team_id === t.id) })).filter((g) => g.members.length)
  const multi = groups.length > 1
  const total = (result.assignments || []).length
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }} className="no-print">
      <div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>✓ Your rota is ready</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{total} shifts assigned across your team{result.stats?.wall_time ? ` · built in ${result.stats.wall_time}s` : ''}.</div>
      </div>
      <button onClick={onDownload} style={primaryBtn(false)}>{unlocked ? '⤓ Download PDF' : '⤓ Download as PDF'}</button>
    </div>
    <div id="printable" style={panel}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Your weekly rota</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: 160 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
          <thead><tr><th style={{ position: 'sticky', left: 0, background: '#fff' }} />{DAYS.map((d) => <th key={d} style={{ fontSize: 11, fontWeight: 800, padding: '4px 4px 12px', color: '#374151' }}>{d}</th>)}</tr></thead>
          <tbody>
            {groups.map(({ t, members }) => <Fragment key={t.id}>
              {multi && <tr><td colSpan={8} style={{ padding: '12px 0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: t.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t.name}</span>
                  <div style={{ flex: 1, height: 1, background: '#F0F0F2' }} />
                </div>
              </td></tr>}
              {members.map((s) => { const blocks = blocksFor(s); return <tr key={s.id}>
                <td style={{ padding: '4px 4px', verticalAlign: 'middle', position: 'sticky', left: 0, background: '#fff' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}><span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, background: t.color + '18', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{initials(s.name)}</span>{s.name || 'Unnamed'}{s.keyholder && <KeyMark size={12} color={t.color} />}</span>
                </td>
                {ALL.map((d) => { const b = blocks.find((x) => dayIdx(x.day) === d)
                  return <td key={d} style={{ padding: '4px 4px', verticalAlign: 'middle' }}>
                    {b ? <div style={{ background: t.color + '14', border: `1px solid ${t.color}33`, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ color: t.color, fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap' }}>{fmt(b.start_time)}–{fmt(b.end_time)}</div>
                      {b.shift_name && <div style={{ color: '#9CA3AF', fontSize: 9.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.shift_name}</div>}
                    </div> : null}
                  </td> })}
              </tr> })}
            </Fragment>)}
          </tbody>
        </table>
      </div>
    </div>
    <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#6B7280' }} className="no-print">This is the real thing — <b style={{ color: '#111827' }}>Shiftly does this for multiple teams</b>, plus payroll, compliance and more.</div>
  </div>
}

function WaitlistModal({ onClose, onDone }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/try-me/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (!res.ok || data.error) { setErr(data.error || 'Try again.'); setBusy(false); return }
      onDone()
    } catch { setErr('Network error — try again.'); setBusy(false) }
  }
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50, fontFamily: FONT }} className="no-print">
    <div onClick={(e) => e.stopPropagation()} style={{ ...panel, maxWidth: 420, width: '100%', padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>Get your rota as a PDF</div>
      <p style={{ fontSize: 13.5, color: '#6B7280', margin: '8px 0 18px', lineHeight: 1.5 }}>Pop in your email to download it — and we’ll save you a spot on the Shiftly waitlist. No spam, ever.</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} type="email" placeholder="you@business.com" autoFocus style={{ width: '100%', boxSizing: 'border-box', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', padding: '12px 14px', borderRadius: 9, border: '1px solid #E5E7EB', outline: 'none' }} />
      {err && <div style={{ fontSize: 12.5, color: '#B91C1C', marginTop: 8 }}>{err}</div>}
      <button onClick={submit} disabled={busy} style={{ ...primaryBtn(busy), width: '100%', marginTop: 14 }}>{busy ? 'Saving…' : 'Download my rota →'}</button>
      <button onClick={onClose} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 6 }}>Maybe later</button>
    </div>
  </div>
}
