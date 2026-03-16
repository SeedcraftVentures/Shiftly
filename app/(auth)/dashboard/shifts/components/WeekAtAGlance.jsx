'use client'

import { useMemo } from 'react'
import { DAYS, GANTT_START, GANTT_END, GANTT_HOURS, decimalToLabel, getTeamGaps } from '../utils/shifthelpers'

const FONT_HEADING = "'Cal Sans', 'Plus Jakarta Sans', sans-serif"

function KeyBadgeLight() {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
      padding: '2px 5px', background: 'rgba(255,255,255,0.3)', color: '#fff',
      borderRadius: 4, lineHeight: 1,
    }}>KEY</span>
  )
}

function DayCard({ day, di, dayData, teams, selectedDay, openShiftId, onSelectDay, onClickShift }) {
  const d = dayData[di]
  const sel = di === selectedDay

  return (
    <div
      onClick={() => onSelectDay(di)}
      style={{
        cursor: 'pointer', borderRadius: 10, position: 'relative',
        border: d.hasGap
          ? (sel ? '2px solid #EF4444' : '2px dashed #EF444477')
          : (sel ? '2px solid #FF1F7D' : '1px solid #E5E7EB'),
        background: sel ? (d.hasGap ? '#FEF2F244' : '#FFF0F5') : '#fff',
        padding: 7, transition: 'all .12s',
      }}
    >
      {d.hasGap && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 14, height: 14, borderRadius: 99,
          background: '#EF4444', color: '#fff',
          fontSize: 8, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}>!</div>
      )}
      <div style={{ textAlign: 'center', marginBottom: 5 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: FONT_HEADING,
          color: sel ? (d.hasGap ? '#EF4444' : '#FF1F7D') : '#111827',
        }}>{day}</div>
        <div style={{ fontSize: 8, color: '#9CA3AF' }}>
          {d.count} shifts / x{d.staff}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {teams.flatMap(team =>
          d.shifts.filter(s => s.team_id === team.id).sort((a, b) => a.start - b.start).map(s => (
            <div
              key={s.id}
              onClick={e => { e.stopPropagation(); onClickShift(s.id) }}
              style={{
                background: team.color, color: '#fff', borderRadius: 4,
                padding: '2px 5px', fontSize: 8, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 3,
                outline: openShiftId === s.id ? '2px solid #111827' : 'none', outlineOffset: 1,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {s.name}
              </span>
              {s.keyholder && <KeyBadgeLight />}
            </div>
          ))
        )}
        {d.shifts.length === 0 && (
          <div style={{ fontSize: 8, color: '#D1D5DB', textAlign: 'center', fontStyle: 'italic' }}>—</div>
        )}
      </div>
    </div>
  )
}

function CoverageGantt({ selectedDay, dayData, teams, allShifts, openShiftId, onSelectDay, onClickShift }) {
  const hourMarkers = Array.from({ length: GANTT_HOURS + 1 }, (_, i) => GANTT_START + i)

  return (
    <div style={{
      background: '#F9FAFB', borderRadius: 10,
      border: '1px solid #F3F4F6', padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: FONT_HEADING }}>Coverage</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>– {DAYS[selectedDay]}</span>
          {dayData[selectedDay].hasGap && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '2px 7px',
              borderRadius: 99, background: '#FEF2F2', color: '#EF4444',
            }}>Has gaps</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {DAYS.map((d, di) => {
            const dg = dayData[di].hasGap
            return (
              <button key={d} onClick={() => onSelectDay(di)} style={{
                width: 26, height: 22, borderRadius: 5, border: 'none',
                background: di === selectedDay ? '#FF1F7D' : dg ? '#FEF2F2' : 'transparent',
                color: di === selectedDay ? '#fff' : dg ? '#EF4444' : '#9CA3AF',
                fontSize: 9, fontWeight: 600, cursor: 'pointer',
                outline: dg && di !== selectedDay ? '1px dashed #FECACA' : 'none',
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
            fontSize: 8, color: '#9CA3AF', transform: 'translateX(-50%)', fontWeight: 500,
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
            <div style={{ width: 86, flexShrink: 0, paddingRight: 6, paddingTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: team.color, flexShrink: 0 }} />
              <span style={{
                fontSize: 9, fontWeight: 600, color: team.color,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: FONT_HEADING,
              }}>
                {team.team_name}
              </span>
            </div>
            <div style={{
              flex: 1, position: 'relative', height: rowH,
              background: '#fff', borderRadius: 6, border: '1px solid #F3F4F6', overflow: 'hidden',
            }}>
              {hourMarkers.map(h => (
                <div key={h} style={{
                  position: 'absolute', left: `${((h - GANTT_START) / GANTT_HOURS) * 100}%`,
                  top: 0, bottom: 0, width: 1, background: '#F3F4F6', zIndex: 0,
                }} />
              ))}
              {gaps.map((g, gi) => (
                <div key={gi} style={{
                  position: 'absolute',
                  left: `${((g.s - GANTT_START) / GANTT_HOURS) * 100}%`,
                  width: `${((g.e - g.s) / GANTT_HOURS) * 100}%`,
                  top: 0, bottom: 0, zIndex: 0,
                  background: 'repeating-linear-gradient(45deg, #EF444408, #EF444408 3px, transparent 3px, transparent 7px)',
                  borderLeft: '2px dashed #EF444444', borderRight: '2px dashed #EF444444',
                }} />
              ))}
              {teamDayShifts.map((s, si) => {
                const left = ((Math.max(s.start, GANTT_START) - GANTT_START) / GANTT_HOURS) * 100
                const width = ((Math.min(s.end, GANTT_END) - Math.max(s.start, GANTT_START)) / GANTT_HOURS) * 100
                return (
                  <div key={s.id} onClick={() => onClickShift(s.id)} style={{
                    position: 'absolute',
                    left: `${left}%`, width: `${width}%`,
                    top: 3 + si * 26, height: 22,
                    background: team.color, color: '#fff',
                    borderRadius: 4, display: 'flex', alignItems: 'center',
                    padding: '0 6px', fontSize: 9, fontWeight: 600, gap: 4,
                    cursor: 'pointer', zIndex: 1,
                    outline: openShiftId === s.id ? '2px solid #111827' : 'none', outlineOffset: 1,
                  }}>
                    {s.keyholder && <KeyBadgeLight />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 8 }}>x{s.staff}</span>
                  </div>
                )
              })}
              {teamDayShifts.length === 0 && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 9, color: '#D1D5DB', fontStyle: 'italic',
                }}>No shifts</div>
              )}
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {teams.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#6B7280' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />{t.team_name}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#EF4444' }}>
          <div style={{
            width: 8, height: 8, borderRadius: 2, border: '1px dashed #EF4444',
            background: 'repeating-linear-gradient(45deg,#EF444422,#EF444422 1px,transparent 1px,transparent 3px)',
          }} />Gap
        </div>
      </div>
    </div>
  )
}

export default function WeekAtAGlance({
  teams, allShifts, filteredShifts, selectedDay,
  openShiftId, warnings, onSelectDay, onClickShift,
}) {
  const dayData = useMemo(() =>
    DAYS.map((_, di) => {
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
      background: '#fff', borderRadius: 14,
      border: '1px solid #E5E7EB', overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#111827',
          fontFamily: FONT_HEADING,
        }}>Week at a Glance</span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 9px',
          borderRadius: 99, background: '#FFF0F5', color: '#FF1F7D',
        }}>
          {filteredShifts.length} shifts
        </span>
        {warnings.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 9px',
            borderRadius: 99, background: '#FEF2F2', color: '#EF4444',
          }}>
            {warnings.length} gap{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
          {DAYS.map((day, di) => (
            <DayCard
              key={day} day={day} di={di} dayData={dayData}
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