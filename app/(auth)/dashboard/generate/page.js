'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react'
import { Field, Input, Select, TimeRange, Switch, Button, T } from '@/app/components/ui/kit'
import { rotaBlock } from '@/lib/rotaColors'

// ════════════════════════════════════════════════════════════════════════════
//  ROTA BUILDER (live) — pick week → Generate (OR-Tools) → grid → save/publish.
//  No templates. Reads real Shift Patterns + Staff availability + Location Rules.
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const AMBER = '#F59E0B'
const FONT = "'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const TEAM_COLORS = ['#FF1F7D', '#6366F1', '#14B8A6', '#F59E0B', '#0EA5E9', '#8B5CF6', '#EC4899', '#10B981']

const fmt = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h < 12 ? 'am' : 'pm'; let hh = h % 12; if (hh === 0) hh = 12
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`
}
function nextMonday() {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0=Mon
  d.setDate(d.getDate() + (7 - dow))
  // local components (NOT toISOString, which shifts a day back in UTC+ timezones → Sunday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const prettyDate = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return s } }

function initials(name) { return (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() }

// ── grid helpers ────────────────────────────────────────────────────────────────
const toHHMM = (d) => { const h = Math.floor(d), m = Math.round((d - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
function dateForDay(weekStart, weekNum, dayIdx) { const x = new Date(weekStart + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + (weekNum - 1) * 7 + dayIdx); return x }

// ── REFINED rota grid — one rota, team sections, per-staff colour, drag/remove/add ──
// ── week picker (custom, on-brand — replaces the native date input) ──────────
const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parseYMD = (s) => { const [y, m, dd] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, dd || 1) }
const MonthNav = ({ dir, onClick }) => (
  <button type="button" onClick={onClick} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280' }}>
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dir < 0 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} /></svg>
  </button>
)
function WeekPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const [hoverRow, setHoverRow] = useState(-1)
  const ref = useRef(null)
  const selMon = mondayOf(parseYMD(value))
  const [viewMonth, setViewMonth] = useState(() => new Date(selMon.getFullYear(), selMon.getMonth(), 1))

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', h); window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('mousedown', h); window.removeEventListener('keydown', esc) }
  }, [open])
  useEffect(() => { if (open) setViewMonth(new Date(selMon.getFullYear(), selMon.getMonth(), 1)) }, [open]) // eslint-disable-line

  const gridStart = mondayOf(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1))
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => { const x = new Date(gridStart); x.setDate(gridStart.getDate() + w * 7 + d); return x }))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const selKey = ymd(selMon)
  const pick = (day) => { onChange(ymd(mondayOf(day))); setOpen(false) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#111827', padding: '10px 12px', borderRadius: 10, border: `1px solid ${open || hover ? PINK : '#E5E7EB'}`, background: '#fff', cursor: 'pointer', boxShadow: open ? `0 0 0 3px ${PINK}33` : 'none', transition: 'border-color .15s, box-shadow .15s' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={open || hover ? PINK : '#9CA3AF'}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {selMon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <svg width="15" height="15" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} fill="none" viewBox="0 0 24 24" stroke={open || hover ? PINK : '#9CA3AF'}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 60, top: 'calc(100% + 6px)', left: 0, width: 304, background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,.12)', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <MonthNav dir={-1} onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} />
              <MonthNav dir={1} onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', padding: '2px 0' }}>{d}</div>)}
          </div>
          {weeks.map((row, wi) => {
            const isSel = ymd(row[0]) === selKey
            return (
              <div key={wi} onClick={() => pick(row[0])} onMouseEnter={() => setHoverRow(wi)} onMouseLeave={() => setHoverRow(-1)}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, borderRadius: 9, cursor: 'pointer', background: isSel ? PINK : (hoverRow === wi ? PINK + '12' : 'transparent'), transition: 'background .1s' }}>
                {row.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth()
                  const isToday = day.getTime() === today.getTime()
                  return (
                    <div key={day.getTime()} style={{ position: 'relative', textAlign: 'center', fontSize: 12.5, fontWeight: isToday ? 800 : 600, padding: '7px 0', color: isSel ? '#fff' : (inMonth ? '#111827' : '#C9C9D0') }}>
                      {day.getDate()}
                      {isToday && !isSel && <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: PINK }} />}
                    </div>
                  )
                })}
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F0F2' }}>
            <button type="button" onClick={() => { const m = mondayOf(new Date()); onChange(ymd(m)); setViewMonth(new Date(m.getFullYear(), m.getMonth(), 1)); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#6B7280', padding: 0 }}>This week</button>
            <button type="button" onClick={() => { onChange(nextMonday()); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: PINK, padding: 0 }}>Next week</button>
          </div>
        </div>
      )}
    </div>
  )
}

const RTH = { fontSize: 11, fontWeight: 700, color: '#6B7280', padding: '6px 6px 10px', textAlign: 'center' }
const RTH_STAFF = { ...RTH, textAlign: 'left', position: 'sticky', left: 0, background: '#fff', minWidth: 160 }
const RTD = { padding: '4px 4px', verticalAlign: 'top' }
const RTD_STAFF = { padding: '4px 4px', verticalAlign: 'top', position: 'sticky', left: 0, background: '#fff' }
function AddCell({ onAdd }) {
  const [hover, setHover] = useState(false)
  return <button onClick={onAdd} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title="Add a shift" style={{ width: '100%', minHeight: 44, borderRadius: 10, cursor: 'pointer', border: `1.5px dashed ${hover ? '#FBCFE8' : 'transparent'}`, background: hover ? '#FFF5F9' : 'transparent', color: hover ? '#FF1F7D' : '#E2E2E6', fontSize: 18, fontWeight: 700, transition: 'all .12s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
}

// Right-hand inspector to create OR edit a one-off shift for one person on one day —
// same fields as the Shifts tab editor (name · hours · keyholder), minus the day picker.
function ShiftInspector({ staff, day, existing, accent = PINK, onClose, onSave, onRemove }) {
  const editing = !!existing
  const dec = (t) => { const [h, m] = String(t || '9:0').split(':').map(Number); return (h || 0) + (m || 0) / 60 }
  const [name, setName] = useState(existing && existing.shift_name !== 'Custom shift' ? existing.shift_name : '')
  const [range, setRange] = useState(existing ? [dec(existing.start_time), dec(existing.end_time)] : [9, 17])
  const [keyholder, setKeyholder] = useState(existing ? !!existing.keyholder_required : false)
  const dur = Math.round((range[1] - range[0]) * 100) / 100
  return <>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.30)', zIndex: 55 }} />
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 372, maxWidth: '92vw', background: '#fff', zIndex: 56, boxShadow: '-14px 0 44px rgba(0,0,0,.16)', padding: 24, fontFamily: FONT, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{editing ? 'Edit shift' : 'Add a shift'}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: '#9CA3AF', padding: 0 }}>×</button>
      </div>
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '4px 0 22px' }}>For <b style={{ color: '#111827' }}>{staff.name}</b> · {DAY_FULL[day]}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Field label="Shift name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom shift" accent={accent} /></Field>
        <Field label="Hours"><TimeRange start={range[0]} end={range[1]} onChange={(s, e) => setRange([s, e])} domain={[5, 24]} accent={accent} /></Field>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Keyholder shift</div><div style={{ fontSize: 11, color: '#9CA3AF' }}>Needs someone who can open & close</div></div>
          <Switch on={keyholder} onChange={setKeyholder} accent={accent} />
        </div>
      </div>

      <div style={{ flex: 1 }} />
      {editing && <button onClick={() => { onRemove(existing._id); onClose() }} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginTop: 16, textAlign: 'left' }}>Remove this shift</button>}
      <Button accent={accent} full disabled={dur <= 0} onClick={() => onSave({ custom: true, id: null, name: name.trim() || 'Custom shift', start: range[0], end: range[1], keyholder })} style={{ marginTop: editing ? 6 : 24 }}>
        {dur <= 0 ? 'End must be after start' : editing ? 'Save changes' : `Add ${dur}h shift`}
      </Button>
    </div>
  </>
}
function RefinedRotaGrid({ gridTeams, staff, shifts, assignments, weekStart, weekNum, onReassign, onRemove, onAddRequest, onEditRequest, dragRef }) {
  const dlabel = (d) => dateForDay(weekStart, weekNum, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const di = (a) => (typeof a.day === 'number' ? a.day : (DAY_INDEX[a.day] ?? 0))
  return <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)', marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 17, fontWeight: 800 }}>Week {weekNum}</span>
      <span style={{ fontSize: 12.5, color: '#9CA3AF' }}>{dlabel(0)} – {dlabel(6)}</span>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800, tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: 160 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
        <thead><tr><th style={RTH_STAFF}></th>{DAYS.map((d, i) => <th key={d} style={RTH}><div style={{ fontWeight: 800, color: '#374151' }}>{d}</div><div style={{ fontSize: 9.5, fontWeight: 500, color: '#C4C4CC', marginTop: 1 }}>{dlabel(i)}</div></th>)}</tr></thead>
        <tbody>
          {gridTeams.map((team, ti) => {
            const rows = staff.filter((s) => s.team_id === team.id)
            if (rows.length === 0) return null
            return <Fragment key={team.id}>
              <tr><td colSpan={8} style={{ padding: ti > 0 ? '22px 0 8px' : '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: team.color }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: team.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{team.name}</span>
                  <div style={{ flex: 1, height: 1, background: '#F0F0F2' }} />
                </div>
              </td></tr>
              {rows.map((s, idx) => {
                const blk = rotaBlock(team.color, idx)
                return <tr key={s.id}>
                  <td style={RTD_STAFF}><span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#111827' }}><span style={{ width: 9, height: 9, borderRadius: 99, background: team.color, flexShrink: 0 }} />{s.name}</span></td>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const blocks = assignments.filter((a) => a.staff_id === s.id && di(a) === d)
                    return <td key={d} onDragOver={(e) => e.preventDefault()} onDrop={() => { const dr = dragRef.current; if (dr && dr.day === d && dr.staffId !== s.id) onReassign(dr._id, s.id) }} style={RTD}>
                      {blocks.length > 0
                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {blocks.map((a) => <div key={a._id} draggable onDragStart={() => { dragRef.current = { _id: a._id, day: d, staffId: s.id } }} onDragEnd={() => { dragRef.current = null }} onClick={() => onEditRequest(s, d, a)} title="Click to edit" style={{ position: 'relative', background: blk.background, borderRadius: 10, padding: '7px 18px 7px 10px', cursor: 'pointer', boxShadow: blk.shadow }}>
                              <div style={{ color: blk.color, fontWeight: 700, fontSize: 11, lineHeight: 1.25 }}>{a.shift_name}</div>
                              <div style={{ color: blk.subColor, fontSize: 9.5 }}>{fmt(a.start_time)}–{fmt(a.end_time)}</div>
                              <button onClick={(e) => { e.stopPropagation(); onRemove(a._id) }} style={{ position: 'absolute', top: 3, right: 5, color: blk.filled ? 'rgba(255,255,255,.9)' : '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                            </div>)}
                          </div>
                        : <AddCell onAdd={() => onAddRequest(s, d)} />}
                    </td>
                  })}
                </tr>
              })}
            </Fragment>
          })}
        </tbody>
      </table>
    </div>
    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>Drag a shift onto another person to reassign · × to remove · + to add. Edits save when you Save / Publish.</div>
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
export default function RotaBuilder() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState('all')
  const [weekStart, setWeekStart] = useState(nextMonday())
  const [weekCount, setWeekCount] = useState(1)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [saveMsg, setSaveMsg] = useState(null)
  const [saved, setSaved] = useState([])
  const [staff, setStaff] = useState([])
  const [shifts, setShifts] = useState([])
  const [rules, setRules] = useState({ min_rest_hours: 11, max_consecutive_days: 5 })
  const [rotaName, setRotaName] = useState('')
  const [editCell, setEditCell] = useState(null) // { staff, day } → opens the add-shift inspector
  const dragRef = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        const [tr, sr, str, shr, rr] = await Promise.all([fetch('/api/teams'), fetch('/api/rotas'), fetch('/api/staff'), fetch('/api/shifts'), fetch('/api/rules')])
        const td = await tr.json(), sd = await sr.json(), std = await str.json(), shd = await shr.json(), rd = await rr.json()
        setTeams((Array.isArray(td) ? td : []).map((t, i) => ({ id: t.id, name: t.name, color: TEAM_COLORS[i % TEAM_COLORS.length] })))
        setSaved(Array.isArray(sd) ? sd : [])
        setStaff((Array.isArray(std) ? std : []).map((s) => ({ id: s.id, name: s.name, team_id: s.team_id, contracted_hours: s.contracted_hours || 0, is_keyholder: !!s.keyholder })))
        setShifts(Array.isArray(shd) ? shd : [])
        if (Array.isArray(rd) && rd[0]?.rules) setRules(rd[0].rules)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    })()
  }, [])

  const teamColor = useCallback((id) => teams.find((t) => t.id === id)?.color || PINK, [teams])
  const staffName = useCallback((id) => staff.find((s) => s.id === id)?.name || 'Unknown', [staff])

  const generate = useCallback(async () => {
    setGenerating(true); setError(null); setResult(null); setSaveMsg(null); setSelectedWeek(1)
    try {
      const res = await fetch('/api/generate-rota', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart, weekCount, team_id: teamId === 'all' ? null : teamId }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate rota.'); return }
      setRotaName(`Week of ${prettyDate(weekStart)}`)
      setResult({ ...data, assignments: (data.assignments || []).map((a, i) => ({ ...a, _id: i })) })
    } catch (e) { setError('Could not reach the scheduler. It may be waking up — try again in a moment.') } finally { setGenerating(false) }
  }, [weekStart, weekCount, teamId])

  const loadSaved = useCallback(async (id) => {
    setError(null); setGenerating(true); setSaveMsg(null)
    try {
      const res = await fetch(`/api/rotas/${id}`)
      const data = await res.json()
      if (!res.ok) { setError('Could not load that rota.'); return }
      setWeekStart(data.week_start); setWeekCount(1); setSelectedWeek(1); setRotaName(data.name || `Week of ${prettyDate(data.week_start)}`)
      setSaveMsg(data.status === 'Published' ? 'published' : null)
      const teamIds = [...new Set((data.assignments || []).map((a) => a.team_id))]
      setResult({ weekStart: data.week_start, weekCount: 1, teams: teamIds.map((tid) => ({ id: tid })), assignments: (data.assignments || []).map((a, i) => ({ ...a, _id: i })), rule_compliance: [], contract_issues: [] })
    } catch { setError('Could not load that rota.') } finally { setGenerating(false) }
  }, [])

  // Deep-link support: /dashboard/generate?rota=ID opens a saved rota; ?start=YYYY-MM-DD presets the week.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const rid = p.get('rota'); const start = p.get('start')
    if (rid) loadSaved(rid)
    else if (start) setWeekStart(start)
  }, [loadSaved])

  const reassign = useCallback((id, staffId) => setResult((r) => ({ ...r, assignments: r.assignments.map((a) => (a._id === id ? { ...a, staff_id: staffId, staff_name: staffName(staffId) } : a)) })), [staffName])
  const removeAssignment = useCallback((id) => setResult((r) => ({ ...r, assignments: r.assignments.filter((a) => a._id !== id) })), [])
  const addAssignment = useCallback((s, day, shift) => setResult((r) => {
    if (!r) return r
    const nid = r.assignments.reduce((m, a) => Math.max(m, a._id ?? 0), -1) + 1
    const work_date = dateForDay(weekStart, selectedWeek, day).toISOString().slice(0, 10)
    const a = { _id: nid, week: selectedWeek, team_id: s.team_id, team_name: '', staff_id: s.id, staff_name: s.name, shift_id: shift.custom ? null : shift.id, custom: !!shift.custom, shift_name: shift.name, day, work_date, start_time: toHHMM(shift.start), end_time: toHHMM(shift.end), keyholder_required: shift.keyholder }
    return { ...r, assignments: [...r.assignments, a] }
  }), [weekStart, selectedWeek])
  // Editing a block sets its custom times (a preset becomes a one-off override).
  const updateAssignment = useCallback((id, sh) => setResult((r) => ({ ...r, assignments: r.assignments.map((a) => (a._id === id ? { ...a, shift_id: null, custom: true, shift_name: sh.name, start_time: toHHMM(sh.start), end_time: toHHMM(sh.end), keyholder_required: sh.keyholder } : a)) })), [])

  const saveRota = useCallback(async (status) => {
    if (!result) return
    setSaveMsg('saving')
    try {
      const res = await fetch('/api/rotas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart, name: rotaName, assignments: result.assignments, status }) })
      if (!res.ok) { setSaveMsg('error'); return }
      setSaveMsg(status === 'Published' ? 'published' : 'draft')
      const sd = await (await fetch('/api/rotas')).json(); setSaved(Array.isArray(sd) ? sd : [])
    } catch { setSaveMsg('error') }
  }, [result, weekStart, rotaName])

  const weekAssignments = useMemo(() => (result?.assignments || []).filter((a) => a.week === selectedWeek), [result, selectedWeek])

  // Contracted-hours flags recomputed LIVE from the current grid, so adding/removing
  // shifts (including custom ones via the inspector) clears or raises a flag immediately.
  const liveContractIssues = useMemo(() => {
    if (!result) return []
    const tMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
    const hrs = {}
    for (const a of result.assignments) {
      let d = tMin(a.end_time) - tMin(a.start_time); if (d <= 0) d += 1440
      hrs[`${a.staff_id}__${a.week}`] = (hrs[`${a.staff_id}__${a.week}`] || 0) + d / 60
    }
    const rotaTeamIds = new Set((result.teams || []).map((t) => t.id))
    const out = []
    for (const s of staff) {
      if (!rotaTeamIds.has(s.team_id)) continue
      const contracted = s.contracted_hours || 0
      if (!contracted) continue
      for (let wk = 1; wk <= weekCount; wk++) {
        const actual = Math.round((hrs[`${s.id}__${wk}`] || 0) * 10) / 10
        if (actual < contracted - 1) out.push({ week: wk, staff_id: s.id, staff_name: s.name, team_name: teams.find((t) => t.id === s.team_id)?.name || '', contracted, actual })
      }
    }
    return out
  }, [result, staff, teams, weekCount])

  // Keyholder compliance recomputed LIVE from the current grid. The server value freezes at
  // generation (and is empty for saved rotas), so editing the grid left it stale — exactly the
  // "the grid shows a keyholder but the banner disagrees" bug. Judged on ACTUAL TIMES: a keyholder
  // present when the first person arrives and the last leaves counts, with no Open/Close pin needed.
  const liveCompliance = useMemo(() => {
    if (!result) return []
    const tMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
    const khSet = new Set(staff.filter((s) => s.is_keyholder).map((s) => s.id))
    const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const dayName = (a) => (typeof a.day === 'number' ? DAY_ORDER[a.day] : a.day)
    const fmtDays = (arr) => [...new Set(arr)].sort((x, y) => DAY_ORDER.indexOf(x) - DAY_ORDER.indexOf(y)).map((d) => String(d).slice(0, 3)).join(', ')
    const byDay = {}
    for (const a of result.assignments) (byDay[`${a.week}__${dayName(a)}`] ||= []).push(a)
    const openMiss = [], closeMiss = []
    for (const [key, list] of Object.entries(byDay)) {
      const day = key.split('__')[1]
      const spans = list.map((a) => { let s = tMin(a.start_time), e = tMin(a.end_time); if (e <= s) e += 1440; return { s, e, kh: khSet.has(a.staff_id) } })
      if (!spans.length) continue
      const openT = Math.min(...spans.map((x) => x.s)), closeT = Math.max(...spans.map((x) => x.e))
      if (!spans.some((x) => x.kh && x.s <= openT + 1)) openMiss.push(day)
      if (!spans.some((x) => x.kh && x.e >= closeT - 1)) closeMiss.push(day)
    }
    const parts = []
    if (openMiss.length) parts.push(`no keyholder at open on ${fmtDays(openMiss)}`)
    if (closeMiss.length) parts.push(`no keyholder at close on ${fmtDays(closeMiss)}`)
    const keyholder = { key: 'keyholder', label: 'Keyholder on open & close', ok: parts.length === 0, detail: parts.join('; ') }

    const nameOf = (id) => staff.find((s) => s.id === id)?.name || 'Someone'
    const dms = (d) => new Date(d + 'T00:00:00Z').getTime()
    const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    const byStaff = {}
    for (const a of result.assignments) (byStaff[a.staff_id] ||= []).push(a)

    // Max consecutive days — across ALL weeks (a run that crosses the week boundary still counts).
    const maxConsec = Number(rules.max_consecutive_days ?? 5)
    const consec = []
    for (const [sid, list] of Object.entries(byStaff)) {
      const dates = [...new Set(list.map((a) => a.work_date))].sort()
      let runStart = dates[0], prev = dates[0], best = null
      const close = (end) => { const len = Math.round((dms(end) - dms(runStart)) / 864e5) + 1; if (len > maxConsec && (!best || len > best.len)) best = { len, start: runStart, end } }
      for (let i = 1; i < dates.length; i++) {
        if (Math.round((dms(dates[i]) - dms(prev)) / 864e5) === 1) { prev = dates[i]; continue }
        close(prev); runStart = dates[i]; prev = dates[i]
      }
      close(prev)
      if (best) consec.push(`${nameOf(sid)} — ${best.len} days in a row (${fmtDate(best.start)} → ${fmtDate(best.end)})`)
    }
    const consecutive = { key: 'max_consecutive_days', label: `Max ${maxConsec} consecutive days`, ok: consec.length === 0, detail: consec.join('; ') }

    // Minimum rest between shifts.
    const minRest = Number(rules.min_rest_hours ?? 11)
    const rest = []
    for (const [sid, list] of Object.entries(byStaff)) {
      const sorted = [...list].sort((a, b) => (dms(a.work_date) + tMin(a.start_time) * 6e4) - (dms(b.work_date) + tMin(b.start_time) * 6e4))
      let worst = null
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = dms(sorted[i - 1].work_date) + tMin(sorted[i - 1].end_time) * 6e4
        const nextStart = dms(sorted[i].work_date) + tMin(sorted[i].start_time) * 6e4
        const gap = (nextStart - prevEnd) / 36e5
        if (gap < minRest - 0.01 && (worst === null || gap < worst)) worst = gap
      }
      if (worst !== null) rest.push(`${nameOf(sid)} (${Math.round(worst)}h gap)`)
    }
    const restRule = { key: 'min_rest_hours', label: `Minimum ${minRest}h rest between shifts`, ok: rest.length === 0, detail: rest.join('; ') }

    return [keyholder, consecutive, restRule]
  }, [result, staff, rules])

  const teamsInResult = useMemo(() => {
    const ids = [...new Set(weekAssignments.map((a) => a.team_id))]
    return ids.map((id) => ({ id, name: teams.find((t) => t.id === id)?.name || weekAssignments.find((a) => a.team_id === id)?.team_name || 'Team', color: teamColor(id) }))
  }, [weekAssignments, teams, teamColor])

  if (loading) return <div style={{ fontFamily: FONT, padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading…</div>

  const inspectorAccent = editCell ? TEAM_COLORS[Math.max(0, teams.findIndex((t) => t.id === editCell.staff.team_id)) % TEAM_COLORS.length] : PINK
  const card = { background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 22, marginBottom: 18, boxShadow: T.shadow.md }
  const inner = { maxWidth: 1040, margin: '0 auto', padding: '0 24px' }

  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827', paddingTop: 20, paddingBottom: 50 }}>
    <div style={inner}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Rota Builder</h1>
      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 22px' }}>Generate a schedule that meets contracted hours and respects availability.</p>

      {/* controls */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Team</div>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="all">All teams</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Week starting (Monday)</div>
            <WeekPicker value={weekStart} onChange={setWeekStart} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Weeks</div>
            <Select value={weekCount} onChange={(e) => setWeekCount(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} week{n > 1 ? 's' : ''}</option>)}
            </Select>
          </div>
          <button onClick={generate} disabled={generating} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: generating ? '#F9A8D0' : PINK, border: 'none', borderRadius: 10, padding: '12px 28px', cursor: generating ? 'default' : 'pointer', boxShadow: generating ? 'none' : T.lift(PINK) }}>{generating ? 'Building…' : 'Build rota'}</button>
        </div>
      </div>

      {error && <div style={{ ...card, background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#B91C1C', marginBottom: 4 }}>Couldn’t generate the rota</div>
        <div style={{ fontSize: 13, color: '#991B1B' }}>{error}</div>
      </div>}

      {result && <>
        {/* save bar */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}><Input value={rotaName} onChange={(e) => setRotaName(e.target.value)} placeholder="Name this rota" style={{ fontSize: 15, fontWeight: 700, padding: '9px 12px' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saveMsg === 'draft' && <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✓ Saved draft</span>}
              {saveMsg === 'published' && <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✓ Published</span>}
              {saveMsg === 'error' && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>Save failed</span>}
              <button onClick={() => saveRota('Draft')} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}>Save draft</button>
              <button onClick={() => saveRota('Published')} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: PINK, border: 'none', borderRadius: 9, padding: '9px 18px', cursor: 'pointer' }}>Publish</button>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 10 }}>
            <b style={{ color: '#111827' }}>{result.assignments.length}</b> shifts · w/c {prettyDate(weekStart)}{weekCount > 1 ? ` · ${weekCount} weeks` : ''}
            {liveContractIssues.length > 0 && <span style={{ color: AMBER, fontWeight: 600 }}> · {liveContractIssues.length} contracted-hours flag{liveContractIssues.length > 1 ? 's' : ''}</span>}
          </div>
        </div>

        {/* week selector */}
        {weekCount > 1 && <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {Array.from({ length: weekCount }, (_, i) => i + 1).map((w) => <button key={w} onClick={() => setSelectedWeek(w)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${selectedWeek === w ? PINK : '#E5E7EB'}`, background: selectedWeek === w ? PINK + '12' : '#fff', color: selectedWeek === w ? PINK : '#6B7280' }}>Week {w}</button>)}
        </div>}

        {liveCompliance.length > 0 && <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Rule compliance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {liveCompliance.map((r, i) => <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 9, fontSize: 13 }}>
              <span style={{ color: r.ok ? '#16A34A' : AMBER, fontWeight: 800, flexShrink: 0 }}>{r.ok ? '✓' : '⚠'}</span>
              <span style={{ color: '#374151' }}><b>{r.label}</b>{r.ok ? '' : <span style={{ color: '#92660B' }}> — {r.detail}</span>}</span>
            </div>)}
          </div>
        </div>}

        {result.skipped?.length > 0 && <div style={{ ...card, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Couldn’t schedule {result.skipped.length} team{result.skipped.length > 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.skipped.map((sk, i) => <div key={i} style={{ fontSize: 12.5, color: '#374151' }}><b>{sk.teamName}</b> — {sk.reason}</div>)}
          </div>
        </div>}

        <RefinedRotaGrid gridTeams={teams.filter((t) => (result.teams || []).some((rt) => rt.id === t.id))} staff={staff} shifts={shifts} assignments={weekAssignments} weekStart={weekStart} weekNum={selectedWeek} onReassign={reassign} onRemove={removeAssignment} onAddRequest={(s, d) => setEditCell({ staff: s, day: d, existing: null })} onEditRequest={(s, d, a) => setEditCell({ staff: s, day: d, existing: a })} dragRef={dragRef} />

        {editCell && <ShiftInspector staff={editCell.staff} day={editCell.day} existing={editCell.existing} accent={inspectorAccent} onClose={() => setEditCell(null)} onRemove={removeAssignment} onSave={(sh) => { if (editCell.existing) updateAssignment(editCell.existing._id, sh); else addAssignment(editCell.staff, editCell.day, sh); setEditCell(null) }} />}

        {liveContractIssues.length > 0 && <div style={{ ...card, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92660B', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Contracted-hours flags</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {liveContractIssues.slice(0, 8).map((c, i) => <div key={i} style={{ fontSize: 12.5, color: '#374151' }}><b>{c.staff_name}</b>{c.team_name ? ` (${c.team_name})` : ''} — {c.actual}h vs {c.contracted}h contracted{weekCount > 1 ? ` · week ${c.week}` : ''}</div>)}
          </div>
        </div>}
      </>}

      {(() => {
        // Only DRAFTS belong here — somewhere to resume an unpublished build.
        // Published rotas live in the Archive, so they don't compete for attention.
        const drafts = saved.filter((r) => r.status !== 'Published')
        if (drafts.length === 0) return null
        return <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Continue a draft</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {drafts.slice(0, 10).map((r) => <button key={r.id} onClick={() => loadSaved(r.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 4px', borderBottom: '1px solid #F4F4F6', background: 'none', border: 'none', borderBottomColor: '#F4F4F6', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.name || `Week of ${prettyDate(r.week_start)}`} <span style={{ color: '#9CA3AF', fontWeight: 500 }}>· w/c {prettyDate(r.week_start)}</span></span>
              <span style={{ fontSize: 12, fontWeight: 700, color: PINK }}>Continue →</span>
            </button>)}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Published rotas live in the Archive.</div>
        </div>
      })()}
    </div>
  </div>
}
