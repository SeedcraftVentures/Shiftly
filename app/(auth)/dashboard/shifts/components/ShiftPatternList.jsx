'use client'

import { useRef, useEffect } from 'react'
import ShiftRow from './ShiftRow'

const FONT_HEADING = "'Cal Sans', 'Cal Sans Text', 'Plus Jakarta Sans', sans-serif"

export default function ShiftPatternList({
  teams, shifts, filteredShifts, openShiftId,
  onToggleShift, onUpdateShift, onDeleteShift,
  fixedLocks, onSetFixedLock, shiftLengths,
  openTime, closeTime, scrollToId,
}) {
  const rowRefs = useRef({})

  useEffect(() => {
    if (!scrollToId) return
    const el = rowRefs.current[scrollToId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [scrollToId])

  const groupedByTeam = {}
  teams.forEach(t => { groupedByTeam[t.id] = [] })
  filteredShifts.forEach(s => {
    if (groupedByTeam[s.team_id]) groupedByTeam[s.team_id].push(s)
  })

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '50vh',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#111827',
          fontFamily: FONT_HEADING,
        }}>
          Shift Patterns
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 9px',
          borderRadius: 99, background: '#FFF0F5', color: '#FF1F7D',
        }}>
          {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px' }}>
        {teams.map(team => {
          const ts = groupedByTeam[team.id]
          if (!ts || ts.length === 0) return null
          return (
            <div key={team.id} style={{ marginBottom: 18 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                marginBottom: 8, padding: '0 2px',
              }}>
                <div style={{ width: 11, height: 11, borderRadius: 3, background: team.color }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: team.color, fontFamily: FONT_HEADING }}>
                  {team.team_name}
                </span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {ts.length} shift{ts.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: team.color + '20', marginLeft: 4 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {ts.map(shift => (
                  <div key={shift.id} ref={el => { rowRefs.current[shift.id] = el }}>
                    <ShiftRow
                      shift={shift}
                      teams={teams}
                      teamColor={team.color}
                      isOpen={openShiftId === shift.id}
                      onToggle={() => onToggleShift(shift.id)}
                      onUpdate={onUpdateShift}
                      onDelete={onDeleteShift}
                      fixedLock={fixedLocks[shift.id] || 'start'}
                      onSetFixedLock={onSetFixedLock}
                      shiftLengths={shiftLengths}
                      openTime={openTime}
                      closeTime={closeTime}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredShifts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, fontFamily: FONT_HEADING }}>No shifts yet</div>
            <div style={{ fontSize: 12 }}>Click + Add Shift to create your first shift pattern</div>
          </div>
        )}
      </div>
    </div>
  )
}