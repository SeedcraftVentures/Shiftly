'use client'

import { useMemo } from 'react'
import { KeyholderIcon } from '@/app/lib/icons'
import { GANTT_START, GANTT_END, GANTT_HOURS, getTeamGaps } from '@/app/lib/shiftUtils'
import { DAYS_SHORT } from '@/app/lib/timeUtils'

const flexRowCenterStyle = {
  display: 'flex',
  alignItems: 'center',
}

const ellipsisTextStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const pillBaseStyle = {
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  borderRadius: 99,
}

const keyBadgeStyle = {
  ...flexRowCenterStyle,
  justifyContent: 'center',
  flexShrink: 0,
  padding: '2px 4px',
  background: 'rgb(from var(--gray-0) r g b / 30%)',
  color: 'var(--gray-0)',
  borderRadius: 4,
  lineHeight: 1,
}

const shiftChipStyle = {
  ...flexRowCenterStyle,
  color: 'var(--gray-0)',
  borderRadius: 4,
  padding: '2px 5px',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  cursor: 'pointer',
  gap: 3,
}

const selectedOutlineStyle = '2px solid var(--gray-900)'

function KeyBadgeLight() {
  return (
    <span style={keyBadgeStyle}>
      <KeyholderIcon className="w-3 h-3" />
    </span>
  )
}

function DayCard({ dayName, dayIndex, dayData, teams, selectedDay, openShiftId, onSelectDay, onClickShift }) {
  const sel = dayIndex === selectedDay

  return (
    <div
      onClick={() => onSelectDay(dayIndex)}
      style={{
        cursor: 'pointer',
        borderRadius: 10,
        position: 'relative',
        border: dayData.hasGap
          ? (sel ? '2px solid var(--red-500)' : '2px dashed rgb(from var(--red-500) r g b / 47%)')
          : (sel ? '2px solid var(--pink-accent)' : '1px solid var(--gray-200)'),
        background: sel
          ? (dayData.hasGap ? 'rgb(from var(--red-50) r g b / 27%)' : 'var(--pink-50)')
          : 'var(--gray-0)',
        padding: 7, transition: 'all .12s',
      }}
    >
      {dayData.hasGap && (
        <div style={{
          ...flexRowCenterStyle,
          justifyContent: 'center',
          position: 'absolute',
          top: -5,
          right: -5,
          width: 14, 
          height: 14, 
          borderRadius: 99,
          background: 'var(--red-500)',
          color: 'var(--gray-0)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
        }}>!</div>
      )}
      <div style={{ textAlign: 'center', marginBottom: 5 }}>
        <div className="font-cal" style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: sel ? (dayData.hasGap ? 'var(--red-500)' : 'var(--pink-accent)') : 'var(--gray-900)',
        }}>{dayName}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
          {dayData.count} shifts / x{dayData.staff}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {teams.flatMap(team =>
          dayData.shifts.filter(s => s.team_id === team.id).sort((a, b) => a.start - b.start).map(s => (
            <div
              key={s.id}
              onClick={e => { e.stopPropagation(); onClickShift(s.id) }}
              style={{
                ...shiftChipStyle,
                background: team.color,
                outline: openShiftId === s.id ? selectedOutlineStyle : 'none',
                outlineOffset: 1,
              }}
            >
              <span style={{ ...ellipsisTextStyle, flex: 1 }}>
                {s.name}
              </span>
              {s.keyholder && <KeyBadgeLight />}
            </div>
          ))
        )}
        {dayData.shifts.length === 0 && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-300)', textAlign: 'center', fontStyle: 'italic' }}>—</div>
        )}
      </div>
    </div>
  )
}

function CoverageGantt({ selectedDay, dayData, teams, allShifts, openShiftId, onSelectDay, onClickShift }) {
  const hourMarkers = Array.from({ length: GANTT_HOURS + 1 }, (_, i) => GANTT_START + i)

  return (
    <div style={{
      background: 'var(--gray-50)',
      borderRadius: 10,
      border: '1px solid var(--gray-100)',
      padding: '10px 12px',
    }}>
      <div style={{ ...flexRowCenterStyle, justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ ...flexRowCenterStyle, gap: 8 }}>
          <span className="font-cal" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-700)' }}>Coverage</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>– {DAYS_SHORT[selectedDay]}</span>
          {dayData[selectedDay].hasGap && (
            <span style={{
              ...pillBaseStyle,
              padding: '2px 7px',
              background: 'var(--red-50)',
              color: 'var(--red-500)',
            }}>Has gaps</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {DAYS_SHORT.map((d, di) => {
            const dg = dayData[di].hasGap
            return (
              <button key={d} onClick={() => onSelectDay(di)} style={{
                width: 26,
                height: 22,
                borderRadius: 5,
                border: 'none',
                background: di === selectedDay ? 'var(--pink-accent)' : dg ? 'var(--red-50)' : 'transparent',
                color: di === selectedDay ? 'var(--gray-0)' : dg ? 'var(--red-500)' : 'var(--gray-400)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                outline: dg && di !== selectedDay ? '1px dashed var(--red-200)' : 'none',
              }}>{d.slice(0, 2)}</button>
            )
          })}
        </div>
      </div>

      <div style={{ marginLeft: 90, position: 'relative', height: 14, marginBottom: 3 }}>
        {hourMarkers.filter((_, i) => i % 2 === 0).map(h => (
          <div key={h} style={{
            position: 'absolute',
            left: `${((h - GANTT_START) / GANTT_HOURS) * 100}%`,
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-400)',
            transform: 'translateX(-50%)',
            fontWeight: 500,
          }}>
            {String(h).padStart(2, '0')}
          </div>
        ))}
      </div>

      {teams.map(team => {
        const teamDayShifts = allShifts
          .filter(s => s.team_id === team.id && s.days.includes(selectedDay))
          .sort((a, b) => a.start - b.start)
        const gaps = getTeamGaps(allShifts, team.id, selectedDay)
        const rowH = Math.max(teamDayShifts.length, 1) * 26 + 6

        return (
          <div key={team.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 5 }}>
            <div style={{ ...flexRowCenterStyle, width: 86, flexShrink: 0, paddingRight: 6, paddingTop: 5, alignItems: 'center', gap: 4 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: team.color, flexShrink: 0 }} />
              <span className="font-cal" style={{
                ...ellipsisTextStyle,
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: team.color,
              }}>
                {team.team_name}
              </span>
            </div>
            <div style={{
              flex: 1,
              position: 'relative',
              height: rowH,
              background: 'var(--gray-0)',
              borderRadius: 6,
              border: '1px solid var(--gray-100)',
              overflow: 'hidden',
            }}>
              {hourMarkers.map(h => (
                <div key={h} style={{
                  position: 'absolute',
                  left: `${((h - GANTT_START) / GANTT_HOURS) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: 'var(--gray-100)',
                }} />
              ))}
              {gaps.map((g, gi) => (
                <div key={gi} style={{
                  position: 'absolute',
                  left: `${((g.s - GANTT_START) / GANTT_HOURS) * 100}%`,
                  width: `${((g.e - g.s) / GANTT_HOURS) * 100}%`,
                  top: 0,
                  bottom: 0,
                  background: 'repeating-linear-gradient(45deg, rgb(from var(--red-500) r g b / 3%), rgb(from var(--red-500) r g b / 3%) 3px, transparent 3px, transparent 7px)',
                  borderLeft: '2px dashed rgb(from var(--red-500) r g b / 27%)',
                  borderRight: '2px dashed rgb(from var(--red-500) r g b / 27%)',
                }} />
              ))}
              {teamDayShifts.map((s, si) => {
                const left = ((Math.max(s.start, GANTT_START) - GANTT_START) / GANTT_HOURS) * 100
                const width = ((Math.min(s.end, GANTT_END) - Math.max(s.start, GANTT_START)) / GANTT_HOURS) * 100
                return (
                  <div key={s.id} onClick={() => onClickShift(s.id)} style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 3 + si * 26,
                    height: 22,
                    ...shiftChipStyle,
                    background: team.color,
                    padding: '0 6px',
                    outline: openShiftId === s.id ? selectedOutlineStyle : 'none',
                    outlineOffset: 1,
                  }}>
                    {s.keyholder && <KeyBadgeLight />}
                    <span style={ellipsisTextStyle}>{s.name}</span>
                    <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 'var(--text-xs)' }}>x{s.staff}</span>
                  </div>
                )
              })}
              {teamDayShifts.length === 0 && (
                <div style={{
                  ...flexRowCenterStyle,
                  justifyContent: 'center',
                  position: 'absolute',
                  inset: 0,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-300)',
                  fontStyle: 'italic',
                }}>No shifts</div>
              )}
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {teams.map(t => (
          <div key={t.id} style={{ ...flexRowCenterStyle, gap: 4, fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />{t.team_name}
          </div>
        ))}
        <div style={{ ...flexRowCenterStyle, gap: 4, fontSize: 'var(--text-xs)', color: 'var(--red-500)' }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            border: '1px dashed var(--red-500)',
            background: 'repeating-linear-gradient(45deg, rgb(from var(--red-500) r g b / 13%), rgb(from var(--red-500) r g b / 13%) 1px, transparent 1px, transparent 3px)',
          }} />Gap
        </div>
      </div>
    </div>
  )
}

export default function ShiftsWeek({
  teams, allShifts, filteredShifts, selectedDay,
  openShiftId, warnings, onSelectDay, onClickShift,
}) {
  const dayData = useMemo(() =>
    DAYS_SHORT.map((_, di) => {
      const dayShifts = filteredShifts.filter(s => s.days.includes(di))
      const hasGap = teams.some(t => getTeamGaps(allShifts, t.id, di).length > 0)
      return {
        shifts: dayShifts,
        count: dayShifts.length,
        staff: dayShifts.reduce((a, s) => a + s.staff, 0),
        hasGap,
      }
    })
  , [filteredShifts, allShifts, teams])

  return (
    <div style={{
      background: 'var(--gray-0)',
      borderRadius: 14,
      border: '1px solid var(--gray-200)',
      overflow: 'hidden',
    }}>
      <div style={{
        ...flexRowCenterStyle,
        padding: '12px 18px',
        borderBottom: '1px solid var(--gray-100)',
        gap: 8,
      }}>
        <span className="font-cal" style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          color: 'var(--gray-900)',
        }}>Week at a Glance</span>
        <span style={{
          ...pillBaseStyle,
          padding: '2px 9px',
          background: 'var(--pink-50)',
          color: 'var(--pink-accent)',
        }}>
          {filteredShifts.length} shifts
        </span>
        {warnings.length > 0 && (
          <span style={{
            ...pillBaseStyle,
            padding: '2px 9px',
            background: 'var(--red-50)',
            color: 'var(--red-500)',
          }}>
            {warnings.length} gap{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
          {DAYS_SHORT.map((day, di) => (
            <DayCard
              key={day} dayName={day} dayIndex={di} dayData={dayData[di]}
              teams={teams} selectedDay={selectedDay} openShiftId={openShiftId}
              onSelectDay={onSelectDay} onClickShift={onClickShift}
            />
          ))}
        </div>
        <CoverageGantt
          selectedDay={selectedDay} dayData={dayData} teams={teams}
          allShifts={allShifts} openShiftId={openShiftId}
          onSelectDay={onSelectDay} onClickShift={onClickShift}
        />
      </div>
    </div>
  )
}