'use client'

import { useState } from 'react'
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
// open every day 9–5 so the demo never silently drops a shift on a "closed" day
const BUSINESS = { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [9, 17] }
const CFG = { business: BUSINESS, openDays: ALL, open: 9, close: 17, glance: [9, 17], slider: [7, 19] }
const uid = (() => { let n = 0; return () => `id${++n}` })()
const allDay = () => Object.fromEntries(ALL.map((d) => [d, true]))

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

// ════════════════════════════════════════════════════════════════════════════
export default function TryMe() {
  const [started, setStarted] = useState(false)
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
  const addShiftRaw = (over) => { const s = { id: uid(), team_id: 'demo', pin: 'open', name: 'Open', start: 9, end: 17, days: [...WEEKDAYS], staff: 1, keyholder: false, ...over }; setShifts((p) => [...p, s]); setSelShift(s.id); setShiftSave('clean') }
  const patchShift = (id, p) => { setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setShiftSave('dirty') }
  const removeShift = (id) => { setShifts((prev) => prev.filter((s) => s.id !== id)); setSelShift(null) }
  const saveShift = () => { setShiftSave('saved'); setTimeout(() => setShiftSave((x) => (x === 'saved' ? 'clean' : x)), 1200) }
  const applyGap = (sug) => {
    const name = sug.kind === 'open' ? 'Open' : sug.kind === 'close' ? 'Close' : 'Custom'
    if (sug.kind === 'mid') return addShiftRaw({ pin: 'none', name, start: sug.from, end: sug.to, days: [sug.day] })
    const start = sug.kind === 'open' ? CFG.open : Math.max(CFG.open, CFG.close - 8)
    const end = sug.kind === 'open' ? Math.min(CFG.close, CFG.open + 8) : CFG.close
    addShiftRaw({ pin: sug.kind, name, start, end, days: [...sug.days] })
  }

  // ── staff ──
  const addStaffRaw = () => { const s = { id: uid(), team_id: 'demo', name: '', role: '', contracted: 0, max: 40, wage: 11.44, pay_basis: 'hourly', annual_salary: 0, annualised_hours: 0, keyholder: false, avail: allDay() }; setStaff((p) => [...p, s]); setSelStaff(s.id); setStaffSave('clean') }
  const patchStaff = (id, p) => { setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s))); setStaffSave('dirty') }
  const removeStaff = (id) => { setStaff((prev) => prev.filter((s) => s.id !== id)); setSelStaff(null) }
  const saveStaff = () => { setStaffSave('saved'); setTimeout(() => setStaffSave((x) => (x === 'saved' ? 'clean' : x)), 1200) }

  const generate = async () => {
    setTab('rota'); setGenerating(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/try-me/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business: BUSINESS, shifts, staff }) })
      const data = await res.json()
      if (!res.ok || data.error) setError(data.error || 'Could not build a rota.')
      else setResult(data)
    } catch { setError('Network error — try again.') } finally { setGenerating(false) }
  }
  const canGenerate = shifts.length > 0 && shifts.every((s) => s.days.length) && staff.length > 0

  const shiftObj = shifts.find((s) => s.id === selShift)
  const staffObj = staff.find((s) => s.id === selStaff)

  if (!started) return <Intro onStart={() => setStarted(true)} />

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
      {tab === 'shifts' && <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ ...panel, position: 'sticky', top: 16 }}>
          <ShiftInspector key={selShift || 'none'} shift={shiftObj} patch={(p) => patchShift(selShift, p)} onDelete={() => removeShift(selShift)} saveState={shiftSave} onSave={saveShift} accent={PINK} cfg={CFG} />
        </div>
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Your shifts <span style={{ color: '#9CA3AF', fontWeight: 600 }}>· {shifts.length}</span></span>
            <button onClick={() => addShiftRaw({})} style={addBtn}>+ Add shift</button>
          </div>
          {shifts.length > 0 && <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 10 }}>Click a shift to edit it. The grid is your week — fill any gaps below.</div>}
          {shifts.length === 0
            ? <Empty>No shifts yet. Add the patterns your team works each week.</Empty>
            : <>
              <TeamRotaGrid groups={[{ name: 'Your team', color: PINK, shifts }]} cfg={CFG} selectedId={selShift} onSelect={setSelShift} />
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #ECECEF', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Week at a glance · <span style={{ color: coveragePct(shifts, CFG) === 100 ? '#16A34A' : PINK }}>{coveragePct(shifts, CFG)}%</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ALL.map((d) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: '#6B7280' }}>{DAYS[d]}</span>
                      <DayTimeline dayIndex={d} shifts={shifts} color={PINK} cfg={CFG} />
                    </div>)}
                  </div>
                  <AxisTicks cfg={CFG} />
                </div>
                <div><GapStrip shifts={shifts} onApply={applyGap} accent={PINK} cfg={CFG} /></div>
              </div>
            </>}
        </div>
      </div>}

      {/* ── Team (real builder) ── */}
      {tab === 'team' && <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ ...panel, position: 'sticky', top: 16 }}>
          <StaffInspector key={selStaff || 'none'} s={staffObj} patch={(p) => patchStaff(selStaff, p)} onDelete={() => removeStaff(selStaff)} saveState={staffSave} onSave={saveStaff} accent={PINK} cfg={CFG} />
        </div>
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Your team <span style={{ color: '#9CA3AF', fontWeight: 600 }}>· {staff.length}</span></span>
            <button onClick={addStaffRaw} style={addBtn}>+ Add team member</button>
          </div>
          {staff.length > 0 && <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 12 }}>Click someone to set their hours, keyholder status and availability.</div>}
          {staff.length === 0
            ? <Empty>No team yet. Add people and set when each of them is available.</Empty>
            : <>
              <AvailabilityGrid groups={[{ name: 'Your team', color: PINK, staff }]} cfg={CFG} selectedId={selStaff} onSelect={setSelStaff} />
              <AvailKey accent={PINK} />
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #ECECEF' }}>
                <TeamGlance staff={staff} shifts={shifts} teamName="Your team" teamId="demo" accent={PINK} cfg={CFG} wide />
              </div>
            </>}
        </div>
      </div>}

      {/* ── Rota ── */}
      {tab === 'rota' && <div>
        {!result && !generating && !error && <div className="no-print" style={{ ...panel, textAlign: 'center', padding: '44px 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Ready to see your rota?</div>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '0 auto 20px', maxWidth: 420, lineHeight: 1.5 }}>{canGenerate ? 'Hit generate and Shiftly will build a fair rota that covers your week.' : 'Add at least one shift and one team member first.'}</p>
          <button onClick={generate} disabled={!canGenerate} style={primaryBtn(!canGenerate)}>Generate my rota</button>
        </div>}
        {generating && <div className="no-print" style={{ ...panel, textAlign: 'center', padding: '44px 24px', color: '#6B7280', fontSize: 14 }}>Building your rota… <span style={{ color: '#9CA3AF' }}>(the scheduler may take a few seconds to wake up)</span></div>}
        {error && <div className="no-print" style={{ ...panel, padding: '16px 18px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13.5 }}>{error} <button onClick={generate} style={{ marginLeft: 8, fontFamily: 'inherit', fontWeight: 700, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button></div>}
        {result && <Result result={result} staff={staff} onDownload={() => (unlocked ? window.print() : setGateOpen(true))} unlocked={unlocked} />}
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

function Result({ result, staff, onDownload, unlocked }) {
  const rows = staff.map((s) => ({ s, blocks: (result.assignments || []).filter((a) => String(a.staff_id) === String(s.id) || a.staff_name === s.name) }))
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
            {rows.map(({ s, blocks }) => <tr key={s.id}>
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
            </tr>)}
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
