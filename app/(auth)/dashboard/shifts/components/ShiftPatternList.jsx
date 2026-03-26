'use client'

import { useRef, useEffect } from 'react'
// import ShiftRow from './ShiftRow'

export default function ShiftPatternList({
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
        background: 'var(--gray-0)',
        borderRadius: 14,
        border: '1px solid var(--gray-200)',
        ...flexColumnStyle,
        overflow: 'hidden',
        maxHeight: '50vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--gray-100)',
          ...flexCenterStyle,
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          className="font-cal"
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--gray-900)',
          }}
        >
          Shift Patterns
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 9px',
            borderRadius: 99,
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
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    background: team.color,
                  }}
                />
                <span
                  className="font-cal"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: team.color,
                  }}
                >
                  {team.team_name}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
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
                    {/* <ShiftRow
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
                    /> */}
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
                fontSize: '1.875rem',
                marginBottom: 8,
              }}
            >
              📋
            </div>
            <div
              className="font-cal"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              No shifts yet
            </div>
            <div
              style={{
                fontSize: '0.75rem',
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