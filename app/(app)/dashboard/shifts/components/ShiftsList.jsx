'use client'

import { useRef, useEffect, useMemo } from 'react'
import { EmptyState } from '@/app/components/ui'
import { ClipboardIcon } from '@/app/lib/icons'
import ShiftRow from './ShiftRow'

export default function ShiftsList({
  teams,
  shifts,
  filteredShifts,
  openShiftId,
  onToggleShift,
  onUpdateShift,
  onDeleteShift,
  resolvedHours,
  scrollToId,
}) {
  const scrollRef = useRef(null)

  // Group shifts by team
  const groupedShifts = useMemo(() => {
    const groups = []
    teams.forEach(team => {
      const teamShifts = filteredShifts.filter(s => s.shift_team === team.team_id)
      if (teamShifts.length > 0) {
        groups.push({ team, shifts: teamShifts })
      }
    })
    return groups
  }, [teams, filteredShifts])

  // Scroll to a specific shift
  useEffect(() => {
    if (!scrollToId || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-shift-id="${scrollToId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scrollToId])

  if (filteredShifts.length === 0) {
    return (
      <EmptyState
        icon={ClipboardIcon}
        title="No shift patterns yet"
        subtitle="Add a shift pattern to get started with scheduling."
      />
    )
  }

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxHeight: '55vh',
        overflowY: 'auto',
        paddingRight: 4,
      }}
    >
      {groupedShifts.map(({ team, shifts: teamShifts }) => (
        <div key={team.team_id}>
          {/* Team header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              className="ui-dot"
              style={{ background: team.color, width: 10, height: 10 }}
            />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
              {team.name}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
              {teamShifts.length} {teamShifts.length === 1 ? 'pattern' : 'patterns'}
            </span>
          </div>

          {/* Shift rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamShifts.map(shift => (
              <div key={shift.shift_id} data-shift-id={shift.shift_id}>
                <ShiftRow
                  shift={shift}
                  team={team}
                  isOpen={openShiftId === shift.shift_id}
                  onToggle={onToggleShift}
                  onUpdate={onUpdateShift}
                  onDelete={onDeleteShift}
                  resolvedHours={resolvedHours}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
