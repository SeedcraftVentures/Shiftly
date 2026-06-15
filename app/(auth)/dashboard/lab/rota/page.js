'use client'

import { useState, useRef, Fragment } from 'react'
import RotaScheduleGrid from '@/app/components/rota/RotaScheduleGrid'

// ════════════════════════════════════════════════════════════════════════════
//  ROTA GRID — UX SANDBOX (mock data). Compare grid designs before porting one
//  onto the live Rota Builder. Variant 1 is the literal old component.
// ════════════════════════════════════════════════════════════════════════════

const FONT = "'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TEAMS = [
  { id: 'foh', name: 'Front of House', color: '#FF1F7D' },
  { id: 'kit', name: 'Kitchen', color: '#6366F1' },
  { id: 'mgmt', name: 'Management', color: '#14B8A6' },
]
const STAFF = [
  { id: 'a1', name: 'Alex Rivera', team_id: 'foh', color: '#FF1F7D', tw: 'bg-pink-500' },
  { id: 'a2', name: 'Sam Lee', team_id: 'foh', color: '#EC4899', tw: 'bg-rose-500' },
  { id: 'a3', name: 'Jordan Kim', team_id: 'foh', color: '#DB2777', tw: 'bg-fuchsia-500' },
  { id: 'a4', name: 'Chris Doyle', team_id: 'kit', color: '#6366F1', tw: 'bg-indigo-500' },
  { id: 'a5', name: 'Pat Owens', team_id: 'kit', color: '#818CF8', tw: 'bg-violet-500' },
  { id: 'a6', name: 'Robin Shah', team_id: 'mgmt', color: '#14B8A6', tw: 'bg-teal-500' },
]
const TEAM_TW = [
  { line: 'bg-pink-200', bg: 'bg-pink-100', text: 'text-pink-700' },
  { line: 'bg-indigo-200', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { line: 'bg-teal-200', bg: 'bg-teal-100', text: 'text-teal-700' },
]
// {staff_id, day(0=Mon), shift_name, start, end}
const INITIAL = [
  { staff_id: 'a1', day: 0, shift_name: 'Opener', start: '09:00', end: '13:00' },
  { staff_id: 'a1', day: 1, shift_name: 'Opener', start: '09:00', end: '13:00' },
  { staff_id: 'a1', day: 2, shift_name: 'Opener', start: '09:00', end: '13:00' },
  { staff_id: 'a2', day: 0, shift_name: 'Closer', start: '13:00', end: '17:00' },
  { staff_id: 'a2', day: 1, shift_name: 'Closer', start: '13:00', end: '17:00' },
  { staff_id: 'a3', day: 3, shift_name: 'Opener', start: '09:00', end: '13:00' },
  { staff_id: 'a3', day: 4, shift_name: 'Closer', start: '13:00', end: '17:00' },
  { staff_id: 'a4', day: 0, shift_name: 'Prep', start: '09:00', end: '14:00' },
  { staff_id: 'a4', day: 1, shift_name: 'Prep', start: '09:00', end: '14:00' },
  { staff_id: 'a4', day: 2, shift_name: 'Prep', start: '09:00', end: '14:00' },
  { staff_id: 'a5', day: 0, shift_name: 'Service', start: '12:00', end: '17:00' },
  { staff_id: 'a5', day: 3, shift_name: 'Service', start: '12:00', end: '17:00' },
  { staff_id: 'a6', day: 0, shift_name: 'Duty Manager', start: '09:00', end: '17:00' },
  { staff_id: 'a6', day: 1, shift_name: 'Duty Manager', start: '09:00', end: '17:00' },
  { staff_id: 'a6', day: 2, shift_name: 'Duty Manager', start: '09:00', end: '17:00' },
].map((a, i) => ({ ...a, _id: i }))

const fmt = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); const ap = h < 12 ? 'am' : 'pm'; let hh = h % 12; if (hh === 0) hh = 12; return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}` }
const staffById = (id) => STAFF.find((s) => s.id === id)
const teamOf = (id) => TEAMS.find((t) => t.id === staffById(id)?.team_id)

// ── Variant 1: the literal old component ─────────────────────────────────────────
function VariantClassic({ assignments }) {
  const uniqueStaff = STAFF.filter((s) => assignments.some((a) => a.staff_id === s.id)).map((s) => s.name)
  const byName = Object.fromEntries(STAFF.map((s) => [s.name, s]))
  return <RotaScheduleGrid
    rota={{ teams: TEAMS }}
    weekCount={1}
    startDate={'2026-06-15'}
    uniqueStaff={uniqueStaff}
    getStaffTeam={(name) => TEAMS.find((t) => t.id === byName[name]?.team_id)?.name}
    getTeamColor={(i) => TEAM_TW[i % TEAM_TW.length]}
    getStaffColor={(name) => byName[name]?.tw || 'bg-gray-400'}
    getStaffShiftsForDay={(name, day, week) => {
      const id = byName[name]?.id
      const di = DAY_FULL.indexOf(day)
      return assignments.filter((a) => a.staff_id === id && a.day === di).map((a) => ({ shift_name: a.shift_name, time: `${fmt(a.start)}-${fmt(a.end)}` }))
    }}
    getDateForDay={(wi, day) => { const d = new Date('2026-06-15T00:00:00Z'); d.setUTCDate(d.getUTCDate() + wi * 7 + DAY_FULL.indexOf(day)); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}
    getShortDay={(day) => DAYS[DAY_FULL.indexOf(day)]}
    handleShiftClick={() => {}}
    handleEmptyCellClick={() => {}}
  />
}

// ── shared staff×days grid (drag-reassign + remove), colour by team or staff ──────
const TH = { fontSize: 11, fontWeight: 700, color: '#6B7280', padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #ECECEF' }
const TH_STAFF = { ...TH, textAlign: 'left', position: 'sticky', left: 0, background: '#fff', minWidth: 150 }
const TD = { padding: 4, verticalAlign: 'top', borderBottom: '1px solid #F4F4F6', minWidth: 92 }
const TD_STAFF = { padding: 4, verticalAlign: 'top', borderBottom: '1px solid #F4F4F6', position: 'sticky', left: 0, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#111827' }
function DragGrid({ assignments, setAssignments, colorBy }) {
  const dragRef = useRef(null)
  const reassign = (id, staffId) => setAssignments((p) => p.map((a) => (a._id === id ? { ...a, staff_id: staffId } : a)))
  const remove = (id) => setAssignments((p) => p.filter((a) => a._id !== id))
  const colorFor = (s) => (colorBy === 'staff' ? s.color : teamOf(s.id)?.color)
  return TEAMS.map((team) => {
    const rows = STAFF.filter((s) => s.team_id === team.id)
    return <div key={team.id} style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 18, marginBottom: 16, overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: team.color }} /><span style={{ fontSize: 14, fontWeight: 800 }}>{team.name}</span></div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead><tr><th style={TH_STAFF}>Staff</th>{DAYS.map((d) => <th key={d} style={TH}>{d}</th>)}</tr></thead>
        <tbody>
          {rows.map((s) => {
            const blockColor = colorFor(s)
            return <tr key={s.id}>
              <td style={TD_STAFF}><span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: blockColor, flexShrink: 0 }} />{s.name}</span></td>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const blocks = assignments.filter((a) => a.staff_id === s.id && a.day === d)
                return <td key={d} onDragOver={(e) => e.preventDefault()} onDrop={() => { const dr = dragRef.current; if (dr && dr.day === d && dr.staffId !== s.id) reassign(dr._id, s.id) }} style={TD}>
                  <div style={{ minHeight: 42, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {blocks.map((a) => <div key={a._id} draggable onDragStart={() => { dragRef.current = { _id: a._id, day: d, staffId: s.id } }} onDragEnd={() => { dragRef.current = null }} style={{ position: 'relative', background: blockColor, borderRadius: 7, padding: '5px 17px 5px 8px', cursor: 'grab', boxShadow: '0 1px 2px rgba(0,0,0,.12)' }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 10.5, lineHeight: 1.25 }}>{a.shift_name}</div>
                      <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 9 }}>{fmt(a.start)}–{fmt(a.end)}</div>
                      <button onClick={() => remove(a._id)} style={{ position: 'absolute', top: 1, right: 3, color: 'rgba(255,255,255,.85)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                    </div>)}
                  </div>
                </td>
              })}
            </tr>
          })}
        </tbody>
      </table>
    </div>
  })
}

// ── Variant 4: REFINED — classic structure, new soft design language ─────────────
const RTH = { fontSize: 11, fontWeight: 700, color: '#6B7280', padding: '6px 6px 10px', textAlign: 'center' }
const RTH_STAFF = { ...RTH, textAlign: 'left', position: 'sticky', left: 0, background: '#fff', minWidth: 156 }
const RTD = { padding: '4px 4px', verticalAlign: 'top', minWidth: 96 }
const RTD_STAFF = { padding: '4px 4px', verticalAlign: 'top', position: 'sticky', left: 0, background: '#fff' }
function AddCell({ onClick }) {
  const [h, setH] = useState(false)
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ width: '100%', minHeight: 44, borderRadius: 10, cursor: 'pointer', border: `1.5px dashed ${h ? '#FBCFE8' : 'transparent'}`, background: h ? '#FFF5F9' : 'transparent', color: h ? '#FF1F7D' : '#E2E2E6', fontSize: 18, fontWeight: 700, transition: 'all .12s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
}
function RefinedGrid({ assignments, setAssignments }) {
  const dragRef = useRef(null)
  const reassign = (id, staffId) => setAssignments((p) => p.map((a) => (a._id === id ? { ...a, staff_id: staffId } : a)))
  const remove = (id) => setAssignments((p) => p.filter((a) => a._id !== id))
  const add = (staffId, day) => setAssignments((p) => { const nid = p.reduce((m, a) => Math.max(m, a._id), -1) + 1; return [...p, { _id: nid, staff_id: staffId, day, shift_name: 'New shift', start: '09:00', end: '13:00' }] })
  const ws = new Date('2026-06-15T00:00:00Z')
  const dlabel = (d) => { const x = new Date(ws); x.setUTCDate(x.getUTCDate() + d); return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  const cellFor = (s, d) => {
    const blocks = assignments.filter((a) => a.staff_id === s.id && a.day === d)
    return <td key={d} onDragOver={(e) => e.preventDefault()} onDrop={() => { const dr = dragRef.current; if (dr && dr.day === d && dr.staffId !== s.id) reassign(dr._id, s.id) }} style={RTD}>
      {blocks.length > 0
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {blocks.map((a) => <div key={a._id} draggable onDragStart={() => { dragRef.current = { _id: a._id, day: d, staffId: s.id } }} onDragEnd={() => { dragRef.current = null }} style={{ position: 'relative', background: s.color, borderRadius: 10, padding: '7px 18px 7px 10px', cursor: 'grab', boxShadow: `0 2px 6px ${s.color}33` }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 11, lineHeight: 1.25 }}>{a.shift_name}</div>
              <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 9.5 }}>{fmt(a.start)}–{fmt(a.end)}</div>
              <button onClick={() => remove(a._id)} style={{ position: 'absolute', top: 3, right: 5, color: 'rgba(255,255,255,.9)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </div>)}
          </div>
        : <AddCell onClick={() => add(s.id, d)} />}
    </td>
  }
  return <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: 17, fontWeight: 800 }}>Week 1</span>
      <span style={{ fontSize: 12.5, color: '#9CA3AF' }}>{dlabel(0)} – {dlabel(6)}</span>
    </div>
    {/* one table for the whole rota → every column lines up across teams */}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800, tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: 160 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
        <thead><tr><th style={RTH_STAFF}></th>{DAYS.map((d, i) => <th key={d} style={RTH}><div style={{ fontWeight: 800, color: '#374151' }}>{d}</div><div style={{ fontSize: 9.5, fontWeight: 500, color: '#C4C4CC', marginTop: 1 }}>{dlabel(i)}</div></th>)}</tr></thead>
        <tbody>
          {TEAMS.map((team, ti) => {
            const rows = STAFF.filter((s) => s.team_id === team.id)
            if (rows.length === 0) return null
            return <Fragment key={team.id}>
              <tr><td colSpan={8} style={{ padding: ti > 0 ? '22px 0 8px' : '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: team.color }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: team.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{team.name}</span>
                  <div style={{ flex: 1, height: 1, background: '#F0F0F2' }} />
                </div>
              </td></tr>
              {rows.map((s) => <tr key={s.id}>
                <td style={RTD_STAFF}><span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#111827' }}><span style={{ width: 9, height: 9, borderRadius: 99, background: s.color, flexShrink: 0 }} />{s.name}</span></td>
                {[0, 1, 2, 3, 4, 5, 6].map((d) => cellFor(s, d))}
              </tr>)}
            </Fragment>
          })}
        </tbody>
      </table>
    </div>
  </div>
}

export default function RotaGridSandbox() {
  const [variant, setVariant] = useState('refined')
  const [assignments, setAssignments] = useState(INITIAL)

  const variants = [['refined', 'Refined (recommended)'], ['classic', 'Classic (old component)'], ['team', 'Team colours + drag'], ['staff', 'Staff colours + drag']]
  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827' }}>
    <div style={{ padding: '12px 28px', background: '#fff', borderBottom: '1px solid #ECECEF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: '#9CA3AF' }}>Rota grid · UX sandbox · mock data</span>
      <div style={{ display: 'flex', background: '#F1F1F4', borderRadius: 9, padding: 3 }}>
        {variants.map(([k, lbl]) => <button key={k} onClick={() => setVariant(k)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', background: variant === k ? '#fff' : 'transparent', color: variant === k ? '#111827' : '#9CA3AF', boxShadow: variant === k ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>{lbl}</button>)}
      </div>
    </div>
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px' }}>
      {variant === 'refined' ? <RefinedGrid assignments={assignments} setAssignments={setAssignments} />
        : variant === 'classic' ? <VariantClassic assignments={assignments} />
          : <DragGrid assignments={assignments} setAssignments={setAssignments} colorBy={variant} />}
      {variant !== 'classic' && <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 8 }}>Drag a shift onto another person to reassign · × to remove{variant === 'refined' ? ' · + on an empty cell to add' : ''}.</div>}
    </div>
  </div>
}
