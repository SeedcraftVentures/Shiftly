'use client'

import { DAYS_SHORT } from '@/app/lib/constants/days'
import { resolveAnchorTime } from '@/app/lib/utils/shiftUtils'
import { decimalTimeToLabel } from '@/app/lib/utils/timeUtils'
import { KeyholderBadge } from '@/app/components/ui'

export default function ShiftDayCard({
  dayIndex,
  shifts,
  teams,
  hasGap,
  isSelected,
  onSelect,
  onClickShift,
  resolvedHours,
}) {
  const dayShifts = shifts.filter(s => s.days && s.days.includes(dayIndex))
  const totalStaff = dayShifts.reduce((sum, s) => sum + (s.num_staff_needed || 1), 0)

  return (
    <div
      onClick={() => onSelect(dayIndex)}
      style={{
        flex: 1,
        minWidth: 100,
        padding: 10,
        borderRadius: 10,
        border: isSelected
          ? '2px solid var(--pink-500)'
          : hasGap
            ? '2px solid var(--red-200)'
            : '1.5px solid var(--gray-100)',
        background: 'var(--gray-0)',
        cursor: 'pointer',
        transition: 'border-color .12s',
      }}
    >
      {/* Day header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-700)' }}>
          {DAYS_SHORT[dayIndex]}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
          {dayShifts.length} / {totalStaff}
        </span>
      </div>

      {/* Shift chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {dayShifts.map(shift => {
          const team = teams.find(t => t.team_id === shift.shift_team)
          const resolved = resolveAnchorTime(shift, dayIndex, resolvedHours)
          return (
            <button
              key={shift.shift_id}
              onClick={e => { e.stopPropagation(); onClickShift(shift.shift_id) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 6px',
                borderRadius: 5,
                border: 'none',
                background: team?.colorLight || 'var(--gray-50)',
                color: team?.color || 'var(--gray-500)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {decimalTimeToLabel(resolved.start ?? shift.start_time)}-{decimalTimeToLabel(resolved.end ?? shift.end_time)}
              </span>
              {shift.is_keyholder && <KeyholderBadge variant="light" />}
            </button>
          )
        })}
      </div>

      {/* Gap indicator */}
      {hasGap && (
        <div style={{
          marginTop: 4,
          padding: '2px 5px',
          borderRadius: 4,
          background: 'var(--red-50)',
          color: 'var(--red-500)',
          fontSize: 9,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          GAP
        </div>
      )}
    </div>
  )
}
