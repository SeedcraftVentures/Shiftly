'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

// ════════════════════════════════════════════════════════════════════════════
//  /try-me — free, no-sign-in rota builder (lead magnet).
//  Build shifts → add your team + availability → generate one rota free.
//  Download as PDF gated behind a waitlist email. All state is in-browser.
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const FONT = "'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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

// ── primitives ──────────────────────────────────────────────────────────────
function Switch({ on, onClick, size = 1 }) {
  const w = 42 * size, h = 24 * size
  return <button type="button" onClick={onClick} style={{ position: 'relative', width: w, height: h, borderRadius: 99, border: 'none', background: on ? PINK : '#E5E7EB', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}><span style={{ position: 'absolute', top: 3 * size, left: on ? w - h + 3 * size : 3 * size, width: h - 6 * size, height: h - 6 * size, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /></button>
}
function TimeRange({ start, end, onChange, domain = [6, 23] }) {
  const trackRef = useRef(null), drag = useRef(null)
  const [dS, dE] = domain, span = dE - dS
  const pct = (v) => ((v - dS) / span) * 100
  useEffect(() => {
    function move(e) {
      if (!drag.current || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const t = Math.round((dS + r * span) * 2) / 2
      if (drag.current === 'start') onChange(Math.min(t, end - 0.5), end)
      else onChange(start, Math.max(t, start + 0.5))
    }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [start, end, onChange, dS, span])
  const handle = (which, v) => <div onPointerDown={() => (drag.current = which)} style={{ position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: 99, background: '#fff', border: `2px solid ${PINK}`, boxShadow: '0 1px 4px rgba(0,0,0,.18)', cursor: 'grab', touchAction: 'none', zIndex: 2 }} />
  return <div ref={trackRef} style={{ position: 'relative', height: 20, userSelect: 'none' }}>
    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', background: '#EFEFF2', borderRadius: 99 }} />
    <div style={{ position: 'absolute', top: '50%', left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%`, height: 6, transform: 'translateY(-50%)', background: `linear-gradient(90deg, ${PINK}99, ${PINK})`, borderRadius: 99 }} />
    {handle('start', start)}{handle('end', end)}
  </div>
}
function DayPicker({ days, onChange }) {
  const toggle = (d) => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b))
  return <div style={{ display: 'flex', gap: 5 }}>
    {ALL.map((d) => { const on = days.includes(d); return <button key={d} type="button" onClick={() => toggle(d)} style={{ flex: 1, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '8px 0', borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? PINK : '#E5E7EB'}`, background: on ? PINK : '#fff', color: on ? '#fff' : '#9CA3AF', transition: 'all .12s' }}>{DAYS[d]}</button> })}
  </div>
}
const inp = { width: '100%', boxSizing: 'border-box', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: '#111827', padding: '10px 12px', borderRadius: 9, border: '1px solid #E5E7EB', outline: 'none' }
function KeyMark({ size = 13, color = PINK }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}><title>Keyholder</title><circle cx="8" cy="15" r="5" /><path d="M11.6 11.4 21 2" /><path d="M16.5 6.5 19.5 9.5" /></svg>
}

const panel = { background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, padding: 22, boxShadow: '0 3px 10px rgba(17,24,39,.06), 0 1px 2px rgba(17,24,39,.04)' }
const primaryBtn = (disabled) => ({ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: disabled ? '#F9A8D0' : PINK, border: 'none', borderRadius: 10, padding: '12px 26px', cursor: disabled ? 'default' : 'pointer' })
const ghostBtn = { fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#6B7280', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 20px', cursor: 'pointer' }
const Label = ({ children }) => <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>

// ════════════════════════════════════════════════════════════════════════════
export default function TryMe() {
  const [step, setStep] = useState(1)
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [gateOpen, setGateOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  // opening hours derived from the shifts (any day a shift runs is "open")
  const business = useMemo(() => {
    const b = {}
    for (const d of ALL) {
      const onDay = shifts.filter((s) => s.days.includes(d))
      b[d] = onDay.length ? [Math.min(...onDay.map((s) => s.start)), Math.max(...onDay.map((s) => s.end))] : null
    }
    return b
  }, [shifts])

  const addShift = () => { const s = { id: uid(), name: '', start: 9, end: 17, days: [...WEEKDAYS], staff: 1, keyholder: false }; setShifts((p) => [...p, s]) }
  const patchShift = (id, p) => setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const removeShift = (id) => setShifts((prev) => prev.filter((s) => s.id !== id))
  const addStaff = () => { const a = { id: uid(), name: '', contracted: 0, keyholder: false, avail: Object.fromEntries(ALL.map((d) => [d, true])) }; setStaff((p) => [...p, a]) }
  const patchStaff = (id, p) => setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const removeStaff = (id) => setStaff((prev) => prev.filter((s) => s.id !== id))
  const toggleAvail = (id, d) => setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, avail: { ...s.avail, [d]: !s.avail?.[d] } } : s)))

  const generate = async () => {
    setGenerating(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/try-me/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business, shifts, staff }) })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Could not build a rota.'); }
      else setResult(data)
    } catch { setError('Network error — try again.') } finally { setGenerating(false) }
  }

  const openDays = ALL.filter((d) => business[d])
  const canGenerate = shifts.length > 0 && shifts.every((s) => s.days.length) && staff.length > 0

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827' }}>
    <style>{`@media print { body * { visibility: hidden !important } #printable, #printable * { visibility: visible !important } #printable { position: absolute; left: 0; top: 0; width: 100% } .no-print { display: none !important } }`}</style>

    {/* header */}
    <div style={{ borderBottom: '1px solid #ECECEF', background: '#fff' }} className="no-print">
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Shiftly</span>
          <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>free rota builder</span>
        </div>
        <Stepper step={step} />
      </div>
    </div>

    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 24px 60px' }}>
      {step === 1 && <Intro onStart={() => setStep(2)} />}

      {step === 2 && <div className="no-print">
        <H title="Add your shifts" sub="The shift patterns you run each week — name them, set the hours, pick the days." />
        <div style={{ ...panel, marginBottom: 16 }}>
          {shifts.length === 0 && <Empty>No shifts yet. Add the patterns your team works.</Empty>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {shifts.map((s, i) => <ShiftRow key={s.id} s={s} i={i} patch={(p) => patchShift(s.id, p)} remove={() => removeShift(s.id)} />)}
          </div>
          <button onClick={addShift} style={{ ...ghostBtn, marginTop: shifts.length ? 16 : 0, width: '100%', color: PINK, borderColor: '#F3C6DA' }}>+ Add a shift</button>
        </div>
        <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Next: your team" nextDisabled={shifts.length === 0 || shifts.some((s) => !s.days.length)} />
      </div>}

      {step === 3 && <div className="no-print">
        <H title="Add your team" sub="Add people and click the grid to set who’s available each day. Mark keyholders who can open & close." />
        <div style={{ ...panel, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: staff.length ? 18 : 0 }}>
            {staff.map((s) => <StaffRow key={s.id} s={s} patch={(p) => patchStaff(s.id, p)} remove={() => removeStaff(s.id)} />)}
          </div>
          <button onClick={addStaff} style={{ ...ghostBtn, width: '100%', color: PINK, borderColor: '#F3C6DA' }}>+ Add a team member</button>
          {staff.length > 0 && <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #ECECEF' }}>
            <Label>Availability · click a cell to toggle</Label>
            <AvailGrid staff={staff} openDays={openDays} onToggle={toggleAvail} />
          </div>}
        </div>
        <Nav onBack={() => setStep(2)} onNext={generate} nextLabel={generating ? 'Building…' : 'Generate my rota'} nextDisabled={!canGenerate || generating} />
        {error && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13 }}>{error}</div>}
        {result && <Result result={result} staff={staff} openDays={openDays} onDownload={() => (unlocked ? window.print() : setGateOpen(true))} unlocked={unlocked} />}
      </div>}
    </div>

    {gateOpen && <WaitlistModal onClose={() => setGateOpen(false)} onDone={() => { setUnlocked(true); setGateOpen(false); setTimeout(() => window.print(), 300) }} />}
  </div>
}

// ── sections ─────────────────────────────────────────────────────────────────
function Stepper({ step }) {
  const steps = ['Start', 'Shifts', 'Team']
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {steps.map((s, i) => { const n = i + 1, on = step >= n; return <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 22, height: 22, borderRadius: 99, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? PINK : '#EFEFF2', color: on ? '#fff' : '#9CA3AF' }}>{n}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: step === n ? '#111827' : '#9CA3AF' }}>{s}</span>
      </div>
      {i < steps.length - 1 && <span style={{ width: 18, height: 1, background: '#E5E7EB' }} />}
    </div> })}
  </div>
}
function H({ title, sub }) {
  return <div style={{ marginBottom: 18 }}>
    <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.3, margin: 0 }}>{title}</h1>
    <p style={{ fontSize: 14, color: '#6B7280', margin: '6px 0 0', lineHeight: 1.5 }}>{sub}</p>
  </div>
}
const Empty = ({ children }) => <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13.5, padding: '32px 0 12px' }}>{children}</div>
function Nav({ onBack, onNext, nextLabel, nextDisabled }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <button onClick={onBack} style={ghostBtn}>Back</button>
    <button onClick={onNext} disabled={nextDisabled} style={primaryBtn(nextDisabled)}>{nextLabel}</button>
  </div>
}
function Intro({ onStart }) {
  return <div style={{ ...panel, textAlign: 'center', padding: '48px 28px' }}>
    <div style={{ fontSize: 12, fontWeight: 800, color: PINK, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Try it free · no sign-up</div>
    <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.6, margin: '0 0 12px', lineHeight: 1.1 }}>Build a staff rota in two minutes.</h1>
    <p style={{ fontSize: 15.5, color: '#6B7280', maxWidth: 520, margin: '0 auto 26px', lineHeight: 1.55 }}>Add your shifts, add your team and their availability, and let Shiftly generate a fair rota that actually covers your week. No account needed.</p>
    <button onClick={onStart} style={{ ...primaryBtn(false), fontSize: 15, padding: '14px 32px' }}>Start building →</button>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 26, marginTop: 30, flexWrap: 'wrap', fontSize: 12.5, color: '#9CA3AF', fontWeight: 600 }}>
      <span>① Add shifts</span><span>② Add your team</span><span>③ Generate &amp; download</span>
    </div>
  </div>
}

function ShiftRow({ s, i, patch, remove }) {
  return <div style={{ border: '1px solid #ECECEF', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}><Label>Shift name</Label><input value={s.name} placeholder={`e.g. Opener`} onChange={(e) => patch({ name: e.target.value })} style={inp} /></div>
      <div style={{ width: 120 }}><Label>People needed</Label><input type="number" min={1} value={s.staff} onChange={(e) => patch({ staff: Math.max(1, parseInt(e.target.value) || 1) })} style={inp} /></div>
      <button onClick={remove} style={{ marginTop: 26, fontSize: 12, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
    </div>
    <div>
      <Label>{fmt(s.start)} – {fmt(s.end)} · {Math.round((s.end - s.start) * 10) / 10}h</Label>
      <div style={{ marginTop: 8 }}><TimeRange start={s.start} end={s.end} onChange={(start, end) => patch({ start, end })} /></div>
    </div>
    <div>
      <Label>Runs on</Label>
      <div style={{ marginTop: 8 }}><DayPicker days={s.days} onChange={(days) => patch({ days })} /></div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Switch on={s.keyholder} onClick={() => patch({ keyholder: !s.keyholder })} size={0.82} />
      <span style={{ fontSize: 13, fontWeight: 600, color: s.keyholder ? '#111827' : '#9CA3AF' }}>Needs a keyholder</span>
    </div>
  </div>
}
function StaffRow({ s, patch, remove }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
    <input value={s.name} placeholder="Name" onChange={(e) => patch({ name: e.target.value })} style={{ ...inp, flex: 1, minWidth: 160 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input type="number" min={0} value={s.contracted} onChange={(e) => patch({ contracted: Math.max(0, parseInt(e.target.value) || 0) })} style={{ ...inp, width: 92 }} />
      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>h/wk</span>
    </div>
    <button onClick={() => patch({ keyholder: !s.keyholder })} title="Keyholder" style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '9px 13px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${s.keyholder ? PINK : '#E5E7EB'}`, background: s.keyholder ? PINK + '12' : '#fff', color: s.keyholder ? PINK : '#9CA3AF' }}><KeyMark size={13} color={s.keyholder ? PINK : '#C4C4CC'} />Keyholder</button>
    <button onClick={remove} style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
  </div>
}

function AvailGrid({ staff, openDays, onToggle }) {
  const cell = { padding: '4px 4px', verticalAlign: 'middle' }
  return <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, tableLayout: 'fixed' }}>
      <colgroup><col style={{ width: 150 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
      <thead><tr><th style={{ position: 'sticky', left: 0, background: '#fff' }} />{DAYS.map((d, i) => <th key={d} style={{ fontSize: 11, fontWeight: 700, padding: '4px 0 10px', color: openDays.includes(i) ? '#374151' : '#C4C4CC' }}>{d}</th>)}</tr></thead>
      <tbody>
        {staff.map((s) => <tr key={s.id}>
          <td style={{ ...cell, position: 'sticky', left: 0, background: '#fff' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ width: 24, height: 24, borderRadius: 99, flexShrink: 0, background: PINK + '18', color: PINK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{initials(s.name)}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'New'}</span>
              {s.keyholder && <KeyMark size={12} />}
            </span>
          </td>
          {ALL.map((d) => { const closed = !openDays.includes(d), on = !!s.avail?.[d]
            return <td key={d} style={cell}>
              <button onClick={() => !closed && onToggle(s.id, d)} disabled={closed} style={{ width: '100%', height: 34, borderRadius: 8, cursor: closed ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 10.5, fontWeight: 700, transition: 'all .12s',
                background: closed ? 'repeating-linear-gradient(45deg,#DDDDE3,#DDDDE3 1.5px,transparent 1.5px,transparent 6px)' : on ? PINK : '#fff',
                border: closed ? 'none' : on ? 'none' : '1.5px dashed #D5D7DD', color: on ? '#fff' : '#C4C4CC' }}>{closed ? '' : on ? 'Free' : '+'}</button>
            </td> })}
        </tr>)}
      </tbody>
    </table>
    <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11.5, color: '#6B7280' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 20, height: 13, borderRadius: 4, background: PINK }} /> Available</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 20, height: 13, borderRadius: 4, border: '1.5px dashed #D5D7DD' }} /> Not available</span>
    </div>
  </div>
}

function Result({ result, staff, openDays, onDownload, unlocked }) {
  const rows = staff.map((s) => ({ s, blocks: (result.assignments || []).filter((a) => String(a.staff_id) === String(s.id) || a.staff_name === s.name) }))
  const total = (result.assignments || []).length
  return <div style={{ marginTop: 26 }}>
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
          <colgroup><col style={{ width: 150 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
          <thead><tr><th style={{ position: 'sticky', left: 0, background: '#fff' }} />{DAYS.map((d, i) => <th key={d} style={{ fontSize: 11, fontWeight: 800, padding: '4px 4px 12px', color: openDays.includes(i) ? '#374151' : '#C4C4CC' }}>{d}</th>)}</tr></thead>
          <tbody>
            {rows.map(({ s, blocks }) => <tr key={s.id}>
              <td style={{ padding: '4px 4px', verticalAlign: 'middle', position: 'sticky', left: 0, background: '#fff' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: PINK, flexShrink: 0 }} />{s.name || 'Unnamed'}{s.keyholder && <KeyMark size={12} />}</span>
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
    <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#6B7280' }} className="no-print">Like what you see? <b style={{ color: '#111827' }}>This is a tiny taste</b> of what Shiftly does — multi-team rotas, payroll, compliance and more.</div>
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
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }} className="no-print">
    <div onClick={(e) => e.stopPropagation()} style={{ ...panel, maxWidth: 420, width: '100%', padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>Get your rota as a PDF</div>
      <p style={{ fontSize: 13.5, color: '#6B7280', margin: '8px 0 18px', lineHeight: 1.5 }}>Pop in your email to download it — and we’ll save you a spot on the Shiftly waitlist. No spam, ever.</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} type="email" placeholder="you@business.com" autoFocus style={{ ...inp, fontSize: 15, padding: '12px 14px' }} />
      {err && <div style={{ fontSize: 12.5, color: '#B91C1C', marginTop: 8 }}>{err}</div>}
      <button onClick={submit} disabled={busy} style={{ ...primaryBtn(busy), width: '100%', marginTop: 14 }}>{busy ? 'Saving…' : 'Download my rota →'}</button>
      <button onClick={onClose} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 6 }}>Maybe later</button>
    </div>
  </div>
}
