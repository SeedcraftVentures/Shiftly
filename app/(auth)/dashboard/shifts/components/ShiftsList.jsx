'use client'

import { useRef, useEffect } from 'react'
import ShiftRow from './ShiftRow'

export default function ShiftsList({
  teams, shifts, filteredShifts, openShiftId,
  onToggleShift, onUpdateShift, onDeleteShift,
  fixedLocks, onSetFixedLock, shiftLengths,
  openTime, closeTime, scrollToId,
}) {
  const rowRefs = useRef({})

  // Repeated flex patterns
  const flexCenterStyle = {
    display: 'flex',
    alignItems: 'center',
  }

  const flexColumnStyle = {
    display: 'flex',
    flexDirection: 'column',
  }

  const panelStyle = {
    background: 'var(--gray-0)',
    border: '1px solid var(--gray-200)',
    borderRadius: 14,
    overflow: 'hidden',
    ...flexColumnStyle,
  }

  const headerStyle = {
    padding: '12px 18px',
    borderBottom: '1px solid var(--gray-100)',
    ...flexCenterStyle,
    gap: 8,
    flexShrink: 0,
  }

  const countPillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 9px',
    borderRadius: 9999,
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
  }

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
    <div
      style={{
        ...panelStyle,
        maxHeight: '50vh',
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <span
          className="font-cal"
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: 'var(--gray-900)',
          }}
        >
          Shift Patterns
        </span>
        <span
          style={{
            ...countPillStyle,
            background: 'var(--pink-100)',
            color: 'var(--pink-500)',
          }}
        >
          {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 18px',
        }}
      >
        {teams.map(team => {
          const ts = groupedByTeam[team.id]
          if (!ts || ts.length === 0) return null
          return (
            <div
              key={team.id}
              style={{
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  ...flexCenterStyle,
                  gap: 7,
                  marginBottom: 8,
                  padding: '0 2px',
                }}
              >
                <div
                  className="ui-square-badge"
                  style={{
                    width: 11,
                    height: 11,
                    background: team.color,
                  }}
                />
                <span
                  className="font-cal"
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: team.color,
                  }}
                >
                  {team.team_name}
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--gray-400)',
                  }}
                >
                  {ts.length} shift{ts.length !== 1 ? 's' : ''}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: team.color + '20',
                    marginLeft: 4,
                  }}
                />
              </div>

              <div
                style={{
                  ...flexColumnStyle,
                  gap: 5,
                }}
              >
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
          <div
            style={{
              textAlign: 'center',
              padding: 48,
              color: 'var(--gray-400)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-3xl)',
                marginBottom: 8,
              }}
            >
              📋
            </div>
            <div
              className="font-cal"
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              No shifts yet
            </div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
              }}
            >
              Click + Add Shift to create your first shift pattern
            </div>
          </div>
        )}
      </div>
    </div>
  )
}