'use client'

import { useMemo } from 'react'
import { resolveAnchorTime, getCoverageGaps } from '@/app/lib/utils/shiftUtils'
import { GANTT_START, GANTT_END, GANTT_HOURS } from '@/app/lib/shiftUtils'
import { decimalTimeToLabel } from '@/app/lib/timeUtils'
import { KeyholderBadge } from '@/app/components/ui'

function pct(time) {
  return ((time - GANTT_START) / GANTT_HOURS) * 100
}

export default function CoverageGantt({
  teams,
  shifts,
  dayIndex,
  resolvedHours,
  onClickShift,
}) {
  // Hour markers
  const hourMarkers = useMemo(() => {
    const markers = []
    for (let h = GANTT_START; h <= GANTT_END; h++) {
      markers.push(h)
    }
    return markers
  }, [])

  if (dayIndex == null) return null

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Hour axis */}
      <div style={{ position: 'relative', height: 18, marginBottom: 4 }}>
        {hourMarkers.map(h => (
          <span
            key={h}
            style={{
              position: 'absolute',
              left: `${pct(h)}%`,
              transform: 'translateX(-50%)',
              fontSize: 9,
              color: 'var(--gray-300)',
              fontWeight: 500,
            }}
          >
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>

      {/* Rows per team */}
      {teams.map(team => {
        const teamShifts = shifts.filter(
          s => s.shift_team === team.team_id && s.days && s.days.includes(dayIndex)
        )
        const gaps = getCoverageGaps(shifts, team.team_id, dayIndex, resolvedHours)

        return (
          <div key={team.team_id} style={{ marginBottom: 8 }}>
            {/* Team label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span className="ui-dot" style={{ background: team.color, width: 8, height: 8 }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-600)' }}>
                {team.name}
              </span>
            </div>

            {/* Gantt bar */}
            <div
              style={{
                position: 'relative',
                height: 24,
                background: 'var(--gray-50)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {/* Shift blocks */}
              {teamShifts.map(shift => {
                const resolved = resolveAnchorTime(shift, dayIndex, resolvedHours)
                const start = resolved.start ?? shift.start_time ?? GANTT_START
                const end = resolved.end ?? shift.end_time ?? GANTT_END
                const left = Math.max(0, pct(start))
                const width = Math.max(0, pct(end) - left)

                return (
                  <button
                    key={shift.shift_id}
                    onClick={() => onClickShift(shift.shift_id)}
                    title={`${shift.shift_name}: ${decimalTimeToLabel(start)}-${decimalTimeToLabel(end)}`}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      top: 2,
                      bottom: 2,
                      borderRadius: 4,
                      background: team.color,
                      opacity: 0.7,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 8, color: 'var(--gray-0)', fontWeight: 600 }}>
                      {shift.shift_name}
                    </span>
                  </button>
                )
              })}

              {/* Gap markers */}
              {gaps.map((gap, i) => {
                const left = Math.max(0, pct(gap.start))
                const width = Math.max(0, pct(gap.end) - left)
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      top: 0,
                      bottom: 0,
                      background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, var(--red-50) 3px, var(--red-50) 6px)',
                      borderLeft: '2px solid var(--red-200)',
                      borderRight: '2px solid var(--red-200)',
                      pointerEvents: 'none',
                    }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
