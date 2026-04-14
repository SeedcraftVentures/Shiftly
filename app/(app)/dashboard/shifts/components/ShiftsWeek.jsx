'use client'

import { useMemo } from 'react'
import { getCoverageGaps } from '@/app/lib/utils/shiftUtils'
import { DAYS_SHORT } from '@/app/lib/constants/days'
import ShiftDayCard from './ShiftDayCard'
import CoverageGantt from './CoverageGantt'

export default function ShiftsWeek({
  teams,
  allShifts,
  filteredShifts,
  selectedDay,
  openShiftId,
  warnings,
  onSelectDay,
  onClickShift,
  resolvedHours,
}) {
  // Compute which days have gaps (for any team)
  const daysWithGaps = useMemo(() => {
    const result = new Set()
    teams.forEach(team => {
      for (let d = 0; d < 7; d++) {
        const gaps = getCoverageGaps(allShifts, team.team_id, d, resolvedHours)
        if (gaps.length > 0) result.add(d)
      }
    })
    return result
  }, [teams, allShifts, resolvedHours])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section header */}
      <h3 className="heading-subsection" style={{ color: 'var(--gray-700)', margin: 0 }}>
        Week at a Glance
      </h3>

      {/* Day cards grid */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DAYS_SHORT.map((_, idx) => (
          <ShiftDayCard
            key={idx}
            dayIndex={idx}
            shifts={filteredShifts}
            teams={teams}
            hasGap={daysWithGaps.has(idx)}
            isSelected={selectedDay === idx}
            onSelect={onSelectDay}
            onClickShift={onClickShift}
            resolvedHours={resolvedHours}
          />
        ))}
      </div>

      {/* Coverage gantt for selected day */}
      {selectedDay != null && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: '1.5px solid var(--gray-100)',
            background: 'var(--gray-0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
              {DAYS_SHORT[selectedDay]} Coverage
            </span>
            {/* Day selector pills */}
            <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
              {DAYS_SHORT.map((d, i) => (
                <button
                  key={i}
                  onClick={() => onSelectDay(i)}
                  style={{
                    width: 28,
                    height: 24,
                    borderRadius: 6,
                    border: selectedDay === i ? '2px solid var(--shiftly-pink)' : '1px solid var(--gray-200)',
                    background: selectedDay === i ? 'var(--shiftly-pink-light)' : 'var(--gray-0)',
                    color: selectedDay === i ? 'var(--shiftly-pink)' : 'var(--gray-400)',
                    fontSize: 9,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </div>

          <CoverageGantt
            teams={teams}
            shifts={allShifts}
            dayIndex={selectedDay}
            resolvedHours={resolvedHours}
            onClickShift={onClickShift}
          />
        </div>
      )}
    </div>
  )
}
