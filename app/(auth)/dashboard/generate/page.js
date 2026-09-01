'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react'
import { useTheme, Card, Field, Input, Select, TimeRange, Switch, Button, Icon, Ic, PageHeader, EASE, THEMES } from '@/app/components/ui/kit'
import { rotaBlock } from '@/lib/rotaColors'
import SetupCoach from '@/app/components/SetupCoach'
import RulesPanel from '@/app/components/RulesPanel'
import { cfgFromLocation, mapStaffForCoverage, readiness, coverageBottlenecks, locationKeyholderGaps, availableHours } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'

// ════════════════════════════════════════════════════════════════════════════
//  ROTA BUILDER (live) - pick week -> Generate (OR-Tools) -> grid -> save/publish.
//  No templates. Reads real Shift Patterns + Staff availability + Location Rules.
//  Apple-esque + theme-aware; scheduling/compliance logic preserved verbatim.
// ════════════════════════════════════════════════════════════════════════════

// Shown when the solver overruns or the hosted scheduler is cold. Deliberately
// light, because it is a "try again" not a "you broke it".
const SLOW_SCHEDULER = "Gosh darn it, the shifts ain't shifting. Come back shortly and we'll get a shift on fixing it up."

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
const TEAM_COLORS = ['#FF1F7D', '#6366F1', '#14B8A6', '#F59E0B', '#0EA5E9', '#8B5CF6', '#EC4899', '#10B981']
const LIGHT = THEMES.light

const fmt = (hhmm) => {
  if (!hhmm) return ''
  let [h, m] = hhmm.split(':').map(Number)
  h = ((h % 24) + 24) % 24 // 24:00 / 00:00 both = midnight, not 12pm
  const ap = h < 12 ? 'am' : 'pm'; let hh = h % 12; if (hh === 0) hh = 12
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`
}
function nextMonday() {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0=Mon
  d.setDate(d.getDate() + (7 - dow))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const prettyDate = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return s } }
function initials(name) { return (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() }

// ── grid helpers ────────────────────────────────────────────────────────────────
const toHHMM = (d) => { const h = Math.floor(d), m = Math.round((d - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
function dateForDay(weekStart, weekNum, dayIdx) { const x = new Date(weekStart + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + (weekNum - 1) * 7 + dayIdx); return x }

// ── week picker (custom, on-brand) ──────────────────────────────────────────
const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parseYMD = (s) => { const [y, m, dd] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, dd || 1) }
function MonthNav({ dir, onClick }) {
  const { T } = useTheme()
  return (
    <button type="button" onClick={onClick} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.muted }}>
      <Icon path={dir < 0 ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} size={15} stroke={2} />
    </button>
  )
}
function WeekPicker({ value, onChange }) {
  const { T } = useTheme()
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
      <button type="button" onClick={() => setOpen((o) => !o)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, padding: '11px 13px', borderRadius: T.r.sm, border: `1px solid ${open || hover ? T.pink : T.border}`, background: T.card, cursor: 'pointer', boxShadow: open ? T.ring(T.pink) : 'none', transition: 'border-color .15s, box-shadow .15s', minHeight: 44 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon path={Ic.calendar} size={16} stroke={1.6} color={open || hover ? T.pink : T.faint} />
          {selMon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <Icon path="M19 9l-7 7-7-7" size={15} stroke={2} color={open || hover ? T.pink : T.faint} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 60, top: 'calc(100% + 6px)', left: 0, width: 304, background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: T.shadowHover, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <MonthNav dir={-1} onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} />
              <MonthNav dir={1} onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: T.faint, padding: '2px 0' }}>{d}</div>)}
          </div>
          {weeks.map((row, wi) => {
            const isSel = ymd(row[0]) === selKey
            return (
              <div key={wi} onClick={() => pick(row[0])} onMouseEnter={() => setHoverRow(wi)} onMouseLeave={() => setHoverRow(-1)}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, borderRadius: 9, cursor: 'pointer', background: isSel ? T.pink : (hoverRow === wi ? T.pink + '12' : 'transparent'), transition: 'background .1s' }}>
                {row.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth()
                  const isToday = day.getTime() === today.getTime()
                  return (
                    <div key={day.getTime()} style={{ position: 'relative', textAlign: 'center', fontSize: 12.5, fontWeight: isToday ? 800 : 600, padding: '7px 0', color: isSel ? '#fff' : (inMonth ? T.ink : T.faint) }}>
                      {day.getDate()}
                      {isToday && !isSel && <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: T.pink }} />}
                    </div>
                  )
                })}
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.hair}` }}>
            <button type="button" onClick={() => { const m = mondayOf(new Date()); onChange(ymd(m)); setViewMonth(new Date(m.getFullYear(), m.getMonth(), 1)); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, fontSize: 12.5, fontWeight: 700, color: T.muted, padding: 0 }}>This week</button>
            <button type="button" onClick={() => { onChange(nextMonday()); setOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, fontSize: 12.5, fontWeight: 700, color: T.pink, padding: 0 }}>Next week</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddCell({ onAdd }) {
  const { T } = useTheme()
  const [hover, setHover] = useState(false)
  return <button onClick={onAdd} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title="Add a shift" style={{ width: '100%', minHeight: 44, borderRadius: 10, cursor: 'pointer', border: `1.5px dashed ${hover ? T.pink + '99' : 'transparent'}`, background: hover ? T.pink + '10' : 'transparent', color: hover ? T.pink : T.border, fontSize: 18, fontWeight: 700, transition: 'all .12s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
}

// Right-hand inspector to create OR edit a one-off shift for one person on one day.
function ShiftInspector({ staff, day, existing, accent, onClose, onSave, onRemove }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const editing = !!existing
  const dec = (t) => { const [h, m] = String(t || '9:0').split(':').map(Number); return (h || 0) + (m || 0) / 60 }
  const [name, setName] = useState(existing && existing.shift_name !== 'Custom shift' ? existing.shift_name : '')
  const [range, setRange] = useState(existing ? [dec(existing.start_time), dec(existing.end_time)] : [9, 17])
  const [keyholder, setKeyholder] = useState(existing ? !!existing.keyholder_required : false)
  const dur = Math.round((range[1] - range[0]) * 100) / 100
  return <>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 55 }} />
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 372, maxWidth: '92vw', background: T.cardSolid, zIndex: 56, boxShadow: '-14px 0 44px rgba(0,0,0,.28)', padding: 24, fontFamily: T.font, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderLeft: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>{editing ? 'Edit shift' : 'Add a shift'}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: T.faint, padding: 0 }}>×</button>
      </div>
      <p style={{ fontSize: 13, color: T.muted, margin: '5px 0 22px' }}>For <b style={{ color: T.ink }}>{staff.name}</b> · {DAY_FULL[day]}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Field label="Shift name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom shift" accent={accent} /></Field>
        <Field label="Hours"><TimeRange start={range[0]} end={range[1]} onChange={(s, e) => setRange([s, e])} domain={[5, 24]} accent={accent} /></Field>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>Keyholder shift</div><div style={{ fontSize: 12, color: T.faint }}>Needs someone who can open and close</div></div>
          <Switch on={keyholder} onChange={setKeyholder} accent={accent} />
        </div>
      </div>

      <div style={{ flex: 1 }} />
      {editing && <button onClick={() => { onRemove(existing._id); onClose() }} style={{ fontFamily: T.font, fontSize: 12.5, fontWeight: 600, color: T.red, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginTop: 16, textAlign: 'left' }}>Remove this shift</button>}
      <Button accent={accent} full disabled={dur <= 0} onClick={() => onSave({ custom: true, id: null, name: name.trim() || 'Custom shift', start: range[0], end: range[1], keyholder })} style={{ marginTop: editing ? 6 : 24 }}>
        {dur <= 0 ? 'End must be after start' : editing ? 'Save changes' : `Add ${dur}h shift`}
      </Button>
    </div>
  </>
}

function RefinedRotaGrid({ gridTeams, staff, shifts, assignments, weekStart, weekNum, onMove, onRemove, onAddRequest, onEditRequest, dragRef, large = false, bare = false, onExpand }) {
  const { T } = useTheme()
  const dark = T.name === 'dark'
  const dlabel = (d) => dateForDay(weekStart, weekNum, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const di = (a) => (typeof a.day === 'number' ? a.day : (DAY_INDEX[a.day] ?? 0))
  // Larger, more readable sizing for the full-screen editor.
  const z = large ? { name: 15, day: 14, date: 11, sh: 14, tm: 12, rm: 17, colw: 200, blockPad: '10px 22px 10px 13px', th: 13 } : { name: 12.5, day: 13, date: 9.5, sh: 11, tm: 9.5, rm: 13, colw: 130, blockPad: '7px 18px 7px 10px', th: 11 }
  const RTH = { fontSize: z.th, fontWeight: 700, color: T.muted, padding: '6px 6px 10px', textAlign: 'center' }
  const RTH_STAFF = { ...RTH, textAlign: 'left', position: 'sticky', left: 0, background: T.cardSolid, minWidth: z.colw }
  const RTD = { padding: large ? '6px 5px' : '4px 4px', verticalAlign: 'top' }
  const RTD_STAFF = { ...RTD, position: 'sticky', left: 0, background: T.cardSolid }
  const grid = (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: z.colw }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
        <thead><tr style={{ background: 'transparent' }}><th style={RTH_STAFF}></th>{DAYS.map((d, i) => <th key={d} style={RTH}><div style={{ fontWeight: 800, color: T.body, fontSize: z.day }}>{d}</div><div style={{ fontSize: z.date, fontWeight: 500, color: T.faint, marginTop: 1 }}>{dlabel(i)}</div></th>)}</tr></thead>
        <tbody>
          {gridTeams.map((team, ti) => {
            const rows = staff.filter((s) => s.team_id === team.id)
            if (rows.length === 0) return null
            // Per-day open/close reference from this team's shift patterns, so each block can
            // be labelled Open / Mid / Close (earliest start opens, latest end closes). The
            // grid is grouped by team, so the team name is redundant inside the box.
            const daysOf = (sh) => (Array.isArray(sh.days) ? sh.days : []).map((x) => (typeof x === 'number' ? x : DAY_INDEX[x]))
            const teamShifts = (shifts || []).filter((sh) => sh.team_id === team.id)
            const dayRef = {}
            for (let d = 0; d < 7; d++) {
              const ds = teamShifts.filter((sh) => daysOf(sh).includes(d))
              if (ds.length) dayRef[d] = { open: Math.min(...ds.map((sh) => Number(sh.start))), close: Math.max(...ds.map((sh) => { const st = Number(sh.start), en = Number(sh.end); return en <= st ? en + 24 : en })) }
            }
            const hh = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) + (m || 0) / 60 }
            const typeOf = (a, d) => {
              const ref = dayRef[d]
              if (!ref) return ''
              const st = hh(a.start_time)
              let en = hh(a.end_time); if (en <= st) en += 24
              const opens = Math.abs(st - ref.open) < 0.02
              const closes = Math.abs(en - ref.close) < 0.02
              if (opens && closes) return 'All day'
              if (opens) return 'Open'
              if (closes) return 'Close'
              return 'Mid'
            }
            return <Fragment key={team.id}>
              <tr style={{ background: 'transparent' }}><td colSpan={8} style={{ padding: ti > 0 ? '22px 0 8px' : '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: team.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{team.name}</span>
                  <div style={{ flex: 1, height: 1, background: T.hair }} />
                </div>
              </td></tr>
              {rows.map((s, idx) => {
                const blk = rotaBlock(team.color, idx)
                const alphas = ['FF', 'C4', '96', '70']
                const blockBg = dark ? team.color + alphas[idx % alphas.length] : blk.background
                const blockFg = dark ? '#fff' : blk.color
                const blockSub = dark ? 'rgba(255,255,255,0.82)' : blk.subColor
                return <tr key={s.id} style={{ background: 'transparent' }}>
                  <td style={RTD_STAFF}><span style={{ fontSize: z.name, fontWeight: 600, color: T.ink }}>{s.name}</span></td>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const blocks = assignments.filter((a) => a.staff_id === s.id && di(a) === d)
                    return <td key={d} onDragOver={(e) => e.preventDefault()} onDrop={() => { const dr = dragRef.current; if (dr && (dr.day !== d || dr.staffId !== s.id)) onMove(dr._id, s.id, d) }} style={RTD}>
                      {blocks.length > 0
                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {blocks.map((a) => <div key={a._id} draggable onDragStart={() => { dragRef.current = { _id: a._id, day: d, staffId: s.id } }} onDragEnd={() => { dragRef.current = null }} onClick={() => onEditRequest(s, d, a)} title="Click to edit" style={{ position: 'relative', background: blockBg, borderRadius: 10, padding: z.blockPad, cursor: 'pointer', boxShadow: dark ? 'none' : blk.shadow }}>
                              <div style={{ color: blockFg, fontWeight: 700, fontSize: z.sh, lineHeight: 1.2 }}>{fmt(a.start_time)}-{fmt(a.end_time)}</div>
                              {typeOf(a, d) && <div style={{ color: blockSub, fontSize: z.tm, fontWeight: 600, marginTop: 1 }}>{typeOf(a, d)}</div>}
                              <button onClick={(e) => { e.stopPropagation(); onRemove(a._id) }} style={{ position: 'absolute', top: 3, right: 5, color: dark ? 'rgba(255,255,255,.85)' : (blk.filled ? 'rgba(255,255,255,.9)' : T.faint), background: 'none', border: 'none', cursor: 'pointer', fontSize: z.rm, lineHeight: 1, padding: 0 }}>×</button>
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
  )
  if (bare) return grid
  return <Card solid pad="22px 24px" style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Week {weekNum}</span>
      <span style={{ fontSize: 12.5, color: T.faint }}>{dlabel(0)} to {dlabel(6)}</span>
      {onExpand && <button onClick={onExpand} title="Expand to edit" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.font, fontSize: 12.5, fontWeight: 600, color: T.muted, background: T.subtle, border: 'none', borderRadius: 999, padding: '7px 13px', cursor: 'pointer' }}><Icon path="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" size={13} stroke={2} />Expand to edit</button>}
    </div>
    {grid}
    <div style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>Drag a shift onto another person to reassign · × to remove · + to add. Edits save when you Save / Publish.</div>
  </Card>
}

// ════════════════════════════════════════════════════════════════════════════
export default function RotaBuilder() {
  const { T } = useTheme()
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
  const [staffRaw, setStaffRaw] = useState([]) // raw /api/staff rows for the feasibility engine
  const [location, setLocation] = useState(null) // for cfgFromLocation (open days + hours)
  const [shifts, setShifts] = useState([])
  const [rules, setRules] = useState({ min_rest_hours: 11, max_consecutive_days: 5 })
  const [rotaName, setRotaName] = useState('')
  const [editCell, setEditCell] = useState(null) // { staff, day } opens the add-shift inspector
  const [showRules, setShowRules] = useState(false)
  const [fullscreen, setFullscreen] = useState(false) // full-screen edit mode for a built rota
  const [busyDays, setBusyDays] = useState([])
  const [setupMode, setSetupMode] = useState(false) // arrived from onboarding (?setup=1): show the coach
  const dragRef = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        const [tr, sr, str, shr, rr, lr] = await Promise.all([fetch('/api/teams'), fetch('/api/rotas'), fetch('/api/staff'), fetch('/api/shifts'), fetch('/api/rules'), fetch('/api/location')])
        const td = await tr.json(), sd = await sr.json(), std = await str.json(), shd = await shr.json(), rd = await rr.json()
        const ld = lr.ok ? await lr.json().catch(() => null) : null
        setTeams((Array.isArray(td) ? td : []).map((t, i) => ({ id: t.id, name: t.name, color: TEAM_COLORS[i % TEAM_COLORS.length] })))
        setSaved(Array.isArray(sd) ? sd : [])
        setStaffRaw(Array.isArray(std) ? std : [])
        setStaff((Array.isArray(std) ? std : []).map((s) => ({ id: s.id, name: s.name, team_id: s.team_id, contracted_hours: s.contracted_hours || 0, is_keyholder: !!s.keyholder })))
        setShifts(Array.isArray(shd) ? shd : [])
        setLocation(ld)
        if (Array.isArray(rd) && rd[0]?.rules) setRules(rd[0].rules)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    })()
  }, [])

  const teamColor = useCallback((id) => teams.find((t) => t.id === id)?.color || T.pink, [teams, T])
  const staffName = useCallback((id) => staff.find((s) => s.id === id)?.name || 'Unknown', [staff])

  const generate = useCallback(async () => {
    setGenerating(true); setError(null); setResult(null); setSaveMsg(null); setSelectedWeek(1)
    // Give up a little AFTER the server's own 60s maxDuration, so when the solver
    // overruns we surface Vercel's error rather than racing it. Without this the
    // button just spins forever and reads as broken.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 70000)
    try {
      const res = await fetch('/api/generate-rota', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart, weekCount, team_id: teamId === 'all' ? null : teamId, busy_days: busyDays }), signal: controller.signal })
      const data = await res.json()
      if (!res.ok) { setError(data.error || SLOW_SCHEDULER); return }
      setRotaName(`Week of ${prettyDate(weekStart)}`)
      setResult({ ...data, assignments: (data.assignments || []).map((a, i) => ({ ...a, _id: i })) })
    } catch (e) {
      setError(e?.name === 'AbortError' ? SLOW_SCHEDULER : 'Could not reach the scheduler. It may be waking up, try again in a moment.')
    } finally { clearTimeout(timer); setGenerating(false) }
  }, [weekStart, weekCount, teamId, busyDays])

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
    if (p.get('setup') === '1') setSetupMode(true)
  }, [loadSaved])

  // Move a shift to another person AND/OR another day (drag-and-drop). Same-day
  // drops just reassign; cross-day drops also update the work_date.
  const moveAssignment = useCallback((id, staffId, day) => setResult((r) => ({ ...r, assignments: r.assignments.map((a) => (a._id === id ? { ...a, staff_id: staffId, staff_name: staffName(staffId), day, work_date: dateForDay(weekStart, selectedWeek, day).toISOString().slice(0, 10) } : a)) })), [staffName, weekStart, selectedWeek])
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

  // Contracted-hours flags recomputed LIVE from the current grid.
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

  // Keyholder / consecutive-days / rest compliance recomputed LIVE from the current grid.
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
    const keyholder = { key: 'keyholder', label: 'Keyholder on open and close', ok: parts.length === 0, detail: parts.join('; ') }

    const nameOf = (id) => staff.find((s) => s.id === id)?.name || 'Someone'
    const dms = (d) => new Date(d + 'T00:00:00Z').getTime()
    const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    const byStaff = {}
    for (const a of result.assignments) (byStaff[a.staff_id] ||= []).push(a)

    // Max consecutive days across ALL weeks (a run that crosses the week boundary still counts).
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
      if (best) consec.push(`${nameOf(sid)}, ${best.len} days in a row (${fmtDate(best.start)} to ${fmtDate(best.end)})`)
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

  // actual hours per person in the selected week (for the right-hand inspector's bars)
  const weekHours = (() => {
    const tMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
    const m = {}
    for (const a of weekAssignments) { let d = tMin(a.end_time) - tMin(a.start_time); if (d <= 0) d += 1440; m[a.staff_id] = (m[a.staff_id] || 0) + d / 60 }
    return m
  })()
  const rotaStaff = result ? staff.filter((s) => (result.teams || []).some((t) => t.id === s.team_id) && s.contracted_hours > 0) : []

  const openDays = useMemo(() => [...new Set((shifts || []).flatMap((s) => (Array.isArray(s.days) ? s.days : []).map((d) => (typeof d === 'number' ? d : DAY_INDEX[d]))))].sort((a, b) => a - b), [shifts])

  // Preflight: structural problems the manager should fix BEFORE building, computed from
  // the same availability-based feasibility engine the dashboard/staff pages use.
  const preflight = useMemo(() => {
    if (!shifts.length || !staffRaw.length) return []
    const cfg = cfgFromLocation(location)
    const mapped = staffRaw.map(mapStaffForCoverage)
    const issues = []
    const kh = locationKeyholderGaps(mapped, shifts, cfg)
    if (kh.noKeyholder) {
      issues.push({ title: 'No keyholder', detail: 'No one is marked as a keyholder, so no one can open or close. Mark at least one person as a keyholder in Staff.' })
    } else {
      const fmt = (arr) => arr.map((d) => DAYS[d]).join(', ')
      if (kh.openMissing?.length) issues.push({ title: 'No keyholder to open', detail: `No keyholder is free to open on ${fmt(kh.openMissing)}. Add a keyholder's availability on ${kh.openMissing.length > 1 ? 'those days' : 'that day'}, or mark someone who works the open as a keyholder.` })
      if (kh.closeMissing?.length) issues.push({ title: 'No keyholder to close', detail: `No keyholder is free to close on ${fmt(kh.closeMissing)}. Add a keyholder's availability on ${kh.closeMissing.length > 1 ? 'those days' : 'that day'}, or mark someone who works the close as a keyholder.` })
    }
    for (const s of mapped) {
      if (!s.contracted) continue
      const avail = availableHours(s, cfg)
      if (avail < s.contracted - 0.5) issues.push({ title: `${s.name} can't reach contract`, detail: `${s.name} is available ${Math.round(avail)}h but contracted ${s.contracted}h. Widen their availability or lower their contracted hours.` })
    }
    for (const t of (teams || [])) {
      const ts = shifts.filter((sh) => sh.team_id === t.id)
      const tp = mapped.filter((s) => s.team_id === t.id)
      if (!ts.length || !tp.length) continue
      const r = readiness(tp, ts, cfg)
      if (!r.coverableAtMax) issues.push({ title: `${t.name} is short on capacity`, detail: `${t.name}'s shifts need about ${Math.round(r.req)}h but the team can supply about ${Math.round(r.maxh)}h at most. Add staff or reduce cover.` })
      for (const b of coverageBottlenecks(tp, ts, cfg)) issues.push({ title: `${b.name} is a bottleneck`, detail: `${b.name} would have to work ${b.essential} days but can only do ${b.maxDays} within their hours. Spread availability across the team or add staff.` })
    }
    return issues
  }, [staffRaw, shifts, location, teams])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  if (loading) return <div style={{ fontFamily: T.font, padding: 60, textAlign: 'center', color: T.faint }}>Loading…</div>

  const dfmt = (wk, d) => dateForDay(weekStart, wk, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const inspectorAccent = editCell ? TEAM_COLORS[Math.max(0, teams.findIndex((t) => t.id === editCell.staff.team_id)) % TEAM_COLORS.length] : T.pink

  const label = { fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 8 }

  // Live compliance + contracted-hours panel, shared by the inline sidebar and the editor.
  const compliancePanel = (
    <>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 3 }}>Live compliance</div>
      <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 16 }}>Updates as you edit. Nothing blocks publish.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {liveCompliance.map((r, i) => <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12 }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, flexShrink: 0, marginTop: 1, background: r.ok ? T.green + '1E' : T.amber + '1E', color: r.ok ? T.green : T.warnInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{r.ok ? '✓' : '!'}</span>
          <span style={{ color: T.body }}>{r.label}{r.ok ? '' : <span style={{ color: T.faint }}>, {r.detail}</span>}</span>
        </div>)}
      </div>
      <div style={{ height: 1, background: T.hair, marginBottom: 16 }} />
      <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 12 }}>Contracted hours</div>
      {rotaStaff.length === 0 ? <div style={{ fontSize: 12, color: T.muted }}>No contracted staff in this rota.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rotaStaff.map((s) => {
          const actual = Math.round((weekHours[s.id] || 0) * 10) / 10
          const met = actual >= s.contracted_hours - 1
          const c = met ? T.green : T.amber
          return <div key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4, gap: 8 }}><span style={{ color: T.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span><span style={{ color: c, fontWeight: 600, flexShrink: 0 }}>{actual} / {s.contracted_hours}</span></div>
            <div style={{ height: 6, borderRadius: 4, background: T.track, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.round((actual / (s.contracted_hours || 1)) * 100))}%`, height: '100%', background: c }} /></div>
          </div>
        })}
      </div>}
    </>
  )

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 1200, margin: '0 auto', padding: '40px 32px 64px' }}>
      <SetupCoach active={setupMode} generating={generating} hasResult={!!result} published={saveMsg === 'published'} onGenerate={generate}
        compliance={liveCompliance} contractIssues={liveContractIssues} relaxed={result?.relaxed_teams} skipped={result?.skipped} />
      <PageHeader title="Rota Builder" subtitle="Generate a schedule that meets contracted hours and respects availability." />

      {/* controls */}
      <Card pad={22} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={label}>Team</div>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="all">All teams</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={label}>Week starting (Monday)</div>
            <WeekPicker value={weekStart} onChange={setWeekStart} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={label}>Weeks</div>
            <Select value={weekCount} onChange={(e) => setWeekCount(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} week{n > 1 ? 's' : ''}</option>)}
            </Select>
          </div>
          <Button onClick={generate} disabled={generating} size="lg">{generating ? 'Building…' : 'Build rota'}</Button>
        </div>
        {openDays.length > 0 && <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.hair}` }}>
          <div style={{ ...label, marginBottom: 8 }}>Busier days this week</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {openDays.map((d) => {
              const on = busyDays.includes(d)
              return <button key={d} onClick={() => setBusyDays((b) => (on ? b.filter((x) => x !== d) : [...b, d]))} style={{ fontFamily: T.font, fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? T.pink : T.subtle, color: on ? '#fff' : T.muted, transition: 'all .12s' }}>{DAYS[d]}</button>
            })}
          </div>
        </div>}
      </Card>

      {/* Preflight: structural blockers to fix before building (reuses the coverage engine) */}
      {preflight.length > 0 && <Card pad={18} style={{ marginBottom: 18, background: T.amber + '12', border: `1px solid ${T.amber}33` }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.warnInk, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 10 }}>Worth fixing before you build</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {preflight.map((it, i) => <div key={i}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{it.title}</div>
            <div style={{ fontSize: 12.5, color: T.body, lineHeight: 1.5 }}>{it.detail}</div>
          </div>)}
        </div>
      </Card>}

      {/* Rules, inline so the whole rota is shaped on one page (autosaves) */}
      <Card pad={0} style={{ marginBottom: 18, overflow: 'hidden' }}>
        <button onClick={() => setShowRules((v) => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '15px 22px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: T.font, textAlign: 'left' }}>
          <Icon path={Ic.rules} size={16} stroke={1.8} color={T.muted} />
          <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>Scheduling rules</span>
          <span style={{ fontSize: 12.5, color: T.faint, fontWeight: 500 }}>applied to every build</span>
          <Icon path={Ic.chevron} size={16} stroke={2.2} color={T.faint} style={{ marginLeft: 'auto', transform: showRules ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        {showRules && <div style={{ padding: '2px 22px 20px' }}>
          <RulesPanel compact />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <Button size="sm" onClick={() => setShowRules(false)}>Save</Button>
          </div>
        </div>}
      </Card>

      {error && <Card pad={18} style={{ marginBottom: 18, background: T.red + '12', border: `1px solid ${T.red}33` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.red, marginBottom: 4 }}>Couldn't generate the rota</div>
        <div style={{ fontSize: 13, color: T.body }}>{error}</div>
      </Card>}

      {result && <>
        {/* save bar */}
        <Card pad={22} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}><Input value={rotaName} onChange={(e) => setRotaName(e.target.value)} placeholder="Name this rota" style={{ fontSize: 15, fontWeight: 700 }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saveMsg === 'draft' && <span style={{ fontSize: 12.5, color: T.green, fontWeight: 600 }}>Saved draft</span>}
              {saveMsg === 'published' && <span style={{ fontSize: 12.5, color: T.green, fontWeight: 600 }}>Published</span>}
              {saveMsg === 'error' && <span style={{ fontSize: 12.5, color: T.red, fontWeight: 600 }}>Save failed</span>}
              <Button variant="secondary" size="sm" onClick={() => saveRota('Draft')}>Save draft</Button>
              <Button size="sm" onClick={() => saveRota('Published')}>Publish</Button>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 10 }}>
            <b style={{ color: T.ink }}>{result.assignments.length}</b> shifts · w/c {prettyDate(weekStart)}{weekCount > 1 ? ` · ${weekCount} weeks` : ''}
            {liveContractIssues.length > 0 && <span style={{ color: T.warnInk, fontWeight: 600 }}> · {liveContractIssues.length} contracted-hours flag{liveContractIssues.length > 1 ? 's' : ''}</span>}
          </div>
        </Card>

        {/* week selector */}
        {weekCount > 1 && <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {Array.from({ length: weekCount }, (_, i) => i + 1).map((w) => <button key={w} onClick={() => setSelectedWeek(w)} style={{ fontFamily: T.font, fontSize: 12.5, fontWeight: 700, padding: '7px 15px', borderRadius: 999, cursor: 'pointer', border: 'none', background: selectedWeek === w ? T.pink : T.subtle, color: selectedWeek === w ? '#fff' : T.muted, transition: `all .2s ${EASE}` }}>Week {w}</button>)}
        </div>}

        {/* solver "shows its working" banner */}
        <Card pad="12px 16px" style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
          <span style={{ width: 22, height: 22, borderRadius: 999, background: T.green + '1E', color: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon path={Ic.check} size={13} stroke={2.6} /></span>
          <span style={{ fontSize: 13, color: T.body }}>Placed <b style={{ color: T.ink }}>{weekAssignments.length} shift{weekAssignments.length === 1 ? '' : 's'}</b> this week, honouring your contracts and rules.</span>
        </Card>

        {result.relaxed_teams?.length > 0 && <Card pad={18} style={{ marginBottom: 14, background: T.amber + '12', border: `1px solid ${T.amber}33` }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.warnInk, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 6 }}>Some rules relaxed to build</div>
          <div style={{ fontSize: 12.5, color: T.body, lineHeight: 1.5 }}><b style={{ color: T.ink }}>{result.relaxed_teams.join(', ')}</b> couldn't be scheduled within every rule, so limits were eased (e.g. allowing up to 7 days in a row) to still produce a rota. Adding availability or staff to {result.relaxed_teams.length > 1 ? 'these teams' : 'this team'} usually removes the need.</div>
        </Card>}

        {result.skipped?.length > 0 && <Card pad={18} style={{ marginBottom: 14, background: T.red + '12', border: `1px solid ${T.red}33` }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.red, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 8 }}>Couldn't schedule {result.skipped.length} team{result.skipped.length > 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.skipped.map((sk, i) => <div key={i} style={{ fontSize: 12.5, color: T.body }}><b style={{ color: T.ink }}>{sk.teamName}</b>, {sk.reason}</div>)}
          </div>
        </Card>}

        {/* Shifts removed because the person had approved time off. These are left as
            gaps on purpose rather than silently reassigned, so they can be covered. */}
        {result.time_off_conflicts?.length > 0 && <Card pad={18} style={{ marginBottom: 14, background: T.amber + '12', border: `1px solid ${T.amber}33` }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.warnInk, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 8 }}>{result.time_off_conflicts.length} shift{result.time_off_conflicts.length > 1 ? 's' : ''} removed for approved time off</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.time_off_conflicts.map((c, i) => (
              <div key={i} style={{ fontSize: 12.5, color: T.body }}>
                <b style={{ color: T.ink }}>{c.staff_name}</b> was rostered {c.shift_name} on {c.day} {c.work_date} but is approved off. Needs cover.
              </div>
            ))}
          </div>
        </Card>}

        {/* grid + live-compliance inspector on the right */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 340 }}>
            <RefinedRotaGrid gridTeams={teams.filter((t) => (result.teams || []).some((rt) => rt.id === t.id))} staff={staff} shifts={shifts} assignments={weekAssignments} weekStart={weekStart} weekNum={selectedWeek} onMove={moveAssignment} onRemove={removeAssignment} onAddRequest={(s, d) => setEditCell({ staff: s, day: d, existing: null })} onEditRequest={(s, d, a) => setEditCell({ staff: s, day: d, existing: a })} dragRef={dragRef} onExpand={() => setFullscreen(true)} />
          </div>
          <Card solid pad={20} style={{ width: 288, flexShrink: 0, position: 'sticky', top: 16 }}>
            {compliancePanel}
          </Card>
        </div>

        {editCell && <ShiftInspector staff={editCell.staff} day={editCell.day} existing={editCell.existing} accent={inspectorAccent} onClose={() => setEditCell(null)} onRemove={removeAssignment} onSave={(sh) => { if (editCell.existing) updateAssignment(editCell.existing._id, sh); else addAssignment(editCell.staff, editCell.day, sh); setEditCell(null) }} />}
      </>}

      {(() => {
        // Only DRAFTS belong here, somewhere to resume an unpublished build. Published rotas
        // live in the Archive, so they don't compete for attention.
        const drafts = saved.filter((r) => r.status !== 'Published')
        if (drafts.length === 0) return null
        return <Card pad={22}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 6 }}>Continue a draft</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {drafts.slice(0, 10).map((r, i) => <button key={r.id} onClick={() => loadSaved(r.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', borderTop: i ? `1px solid ${T.hair}` : 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, textAlign: 'left' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{r.name || `Week of ${prettyDate(r.week_start)}`} <span style={{ color: T.faint, fontWeight: 500 }}>· w/c {prettyDate(r.week_start)}</span></span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.pink }}>Continue →</span>
            </button>)}
          </div>
          <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8 }}>Published rotas live in the Archive.</div>
        </Card>
      })()}

      {/* Full-screen editor: a big, readable canvas to drag the rota into shape, publish from here */}
      {fullscreen && result && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: T.cardSolid, display: 'flex', flexDirection: 'column', fontFamily: T.font }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 22px', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ minWidth: 0, flex: '1 1 260px' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em' }}>{rotaName || 'Edit rota'}</div>
              <div style={{ fontSize: 12.5, color: T.faint, lineHeight: 1.4 }}>Drag a shift onto someone else to reassign, drag it to another day to move it, click to edit, + to add. Make it ideal, then publish.</div>
            </div>
            {weekCount > 1 && <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: weekCount }, (_, i) => i + 1).map((w) => <button key={w} onClick={() => setSelectedWeek(w)} style={{ fontFamily: T.font, fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', border: 'none', background: selectedWeek === w ? T.pink : T.subtle, color: selectedWeek === w ? '#fff' : T.muted }}>Week {w}</button>)}
            </div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              {saveMsg === 'draft' && <span style={{ fontSize: 12.5, color: T.green, fontWeight: 600 }}>Saved draft</span>}
              {saveMsg === 'published' && <span style={{ fontSize: 12.5, color: T.green, fontWeight: 600 }}>Published</span>}
              {saveMsg === 'error' && <span style={{ fontSize: 12.5, color: T.red, fontWeight: 600 }}>Save failed</span>}
              <Button variant="secondary" size="sm" onClick={() => saveRota('Draft')}>Save draft</Button>
              <Button size="sm" onClick={() => saveRota('Published')}>Publish</Button>
              <button onClick={() => setFullscreen(false)} title="Exit full screen (Esc)" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.muted, background: T.subtle, border: 'none', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}><Icon path="M6 18L18 6M6 6l12 12" size={14} stroke={2} />Close</button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 20, padding: 22, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em' }}>Week {selectedWeek}</span>
                <span style={{ fontSize: 13, color: T.faint }}>{dfmt(selectedWeek, 0)} to {dfmt(selectedWeek, 6)}</span>
              </div>
              <RefinedRotaGrid large bare gridTeams={teams.filter((t) => (result.teams || []).some((rt) => rt.id === t.id))} staff={staff} shifts={shifts} assignments={weekAssignments} weekStart={weekStart} weekNum={selectedWeek} onMove={moveAssignment} onRemove={removeAssignment} onAddRequest={(s, d) => setEditCell({ staff: s, day: d, existing: null })} onEditRequest={(s, d, a) => setEditCell({ staff: s, day: d, existing: a })} dragRef={dragRef} />
            </div>
            <Card solid pad={20} style={{ width: 300, flexShrink: 0, position: 'sticky', top: 0 }}>
              {compliancePanel}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
