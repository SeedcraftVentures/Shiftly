'use client'

// Public, auth-free demo of the rota builder's manual-edit experience, used to
// record the animated feature clips (and handy as a live "try it" surface). It
// reuses the REAL builder grid + edit panel so the clip is honest, but runs on
// seeded, made-up staff with purely local state — no API, nothing persisted.
import { useState, useRef } from 'react'
import { RefinedRotaGrid, ShiftInspector } from '@/app/(auth)/dashboard/generate/page'
import { WEEK_START, TEAMS, TEAM_BY_ID, STAFF, SHIFTS, SEED, toHHMM, NEXT_ID } from '../demoData'

let _nid = NEXT_ID + 50

export default function DemoBuilder() {
  const [assignments, setAssignments] = useState(SEED)
  const [editCell, setEditCell] = useState(null)
  const dragRef = useRef(null)

  const onMove = (id, staffId, day) => setAssignments((a) => a.map((x) => (x._id === id ? { ...x, staff_id: staffId, day } : x)))
  const onRemove = (id) => setAssignments((a) => a.filter((x) => x._id !== id))
  const onEditRequest = (s, d, a) => setEditCell({ staff: s, day: d, existing: a })
  const onAddRequest = (s, d) => setEditCell({ staff: s, day: d, existing: null })
  const onSave = (sh) => {
    setAssignments((a) => (editCell.existing
      ? a.map((x) => (x._id === editCell.existing._id ? { ...x, shift_id: null, custom: true, shift_name: sh.name, start_time: toHHMM(sh.start), end_time: toHHMM(sh.end), keyholder_required: sh.keyholder } : x))
      : [...a, { _id: _nid++, week: 1, team_id: editCell.staff.team_id, team_name: TEAM_BY_ID[editCell.staff.team_id]?.name || '', staff_id: editCell.staff.id, shift_id: null, custom: true, shift_name: sh.name, day: editCell.day, work_date: '', start_time: toHHMM(sh.start), end_time: toHHMM(sh.end), keyholder_required: sh.keyholder }]))
    setEditCell(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F6F7F9', padding: '40px 32px', fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <RefinedRotaGrid
          large
          gridTeams={TEAMS}
          staff={STAFF}
          shifts={SHIFTS}
          assignments={assignments}
          weekStart={WEEK_START}
          weekNum={1}
          onMove={onMove}
          onRemove={onRemove}
          onAddRequest={onAddRequest}
          onEditRequest={onEditRequest}
          dragRef={dragRef}
        />
      </div>
      {editCell && (
        <ShiftInspector
          staff={editCell.staff}
          day={editCell.day}
          existing={editCell.existing}
          onClose={() => setEditCell(null)}
          onRemove={onRemove}
          onSave={onSave}
        />
      )}
    </div>
  )
}
