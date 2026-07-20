'use client'

import { useMemo } from 'react'
import {
  DAYS,
  getDayAvailability,
  getAvailabilityColor,
  getAvailableCountForDay,
  formatInitials,
} from '../utils/staffHelpers'

const GANTT_START = 7
const GANTT_END = 23
const GANTT_HOURS = GANTT_END - GANTT_START
const CELL_H = 32

function decimalToLabel(d) {
  if (d === null || d === undefined) return '--:--'
  const h = Math.floor(d)
  const m = Math.round((d - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function Avatar({ name, color, size = 22 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0,
      background: color + '22', color, border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {formatInitials(name)}
    </div>
  )
}

function nextAvailability(current) {
  if (!current || current === 'unavailable') return 'available'
  if (current === 'available') return 'preferred'
  if (current === 'preferred') return 'unavailable'
  return 'available'
}

function toggleGrid(currentGrid, dayIdx) {
  const grid = currentGrid ? { ...currentGrid } : {}
  const key = DAYS[dayIdx]
  const val = grid[key]
  const current = !val ? null
    : typeof val === 'object' ? (val.available === true ? 'available' : 'unavailable')
    : val
  grid[key] = nextAvailability(current)
  return grid
}

function toggleAllDays(currentGrid) {
  const grid = currentGrid ? { ...currentGrid } : {}
  const allAvail = DAYS.every(d => {
    const val = grid[d]
    if (!val) return false
    if (typeof val === 'object') return val.available === true
    return val === 'available' || val === 'preferred'
  })
  const newStatus = allAvail ? 'unavailable' : 'available'
  DAYS.forEach(d => { grid[d] = newStatus })
  return grid
}

// ── Availability Cell ─────────────────────────────────────────────────────────

function AvailCell({ status, isLocked, isSelected, onClick }) {
  const colors = getAvailabilityColor(status)
  return (
    <div
      onClick={isLocked ? undefined : onClick}
      title={isLocked ? 'Locked by rule' : undefined}
      style={{
        flex: 1, minWidth: 0, height: CELL_H, borderRadius: 7,
        background: colors.bg, border: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'all .1s',
        outline: isSelected ? '2px solid #FF1F7D' : 'none', outlineOffset: 1,
      }}
    >
      {status === 'available' && <span style={{ fontSize: 13, color: colors.color }}>✓</span>}
      {status === 'unavailable' && <span style={{ fontSize: 13, color: colors.color }}>✕</span>}
      {status === 'partial' && <span style={{ fontSize: 13, color: colors.color }}>~</span>}
      {status === 'preferred' && (
        <>
          <span style={{ fontSize: 12, color: colors.color }}>✓</span>
          <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 8, color: '#CA8A04' }}>★</span>
        </>
      )}
      {!status && <span style={{ fontSize: 11, color: '#D1D5DB' }}>–</span>}
      {isLocked && (
        <svg style={{ position: 'absolute', bottom: 2, right: 3, opacity: 0.4 }} width="8" height="9" viewBox="0 0 14 16" fill="#6B7280">
          <path d="M12 7h-1V5a4 4 0 00-8 0v2H2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2zM5 5a2 2 0 014 0v2H5V5zm2 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      )}
    </div>
  )
}

// ── Shift Detail Gantt. SS#6 style ──────────────────────────────────────────

function ShiftDetailGantt({ selectedDay, selectedStaffId, staff, shifts, teams, onSelectDay }) {
  const selectedMember = staff.find(s => s.id === selectedStaffId)
  const hourMarkers = Array.from({ length: GANTT_HOURS + 1 }, (_, i) => GANTT_START + i)

  // Get member availability for the selected day
  const getMemberAvail = () => {
    if (!selectedMember) return null
    const grid = selectedMember.availability_grid
    if (!grid) return null
    const key = DAYS[selectedDay]
    const val = grid[key]
    if (!val) return null
    if (typeof val === 'object') return val.available === true ? 'available' : 'unavailable'
    return val
  }
  const memberAvail = getMemberAvail()

  // Availability bar styles. SS#6: clean color fill, no team color
  const availBar = {
    available: { bg: '#DCFCE7', border: '#BBF7D0', color: '#16A34A', label: '✓ Available' },
    preferred: { bg: '#DCFCE7', border: '#BBF7D0', color: '#16A34A', label: '✓ Available ★' },
    unavailable: { bg: '#FEE2E2', border: '#FECACA', color: '#EF4444', label: '✕ Unavailable' },
    partial: { bg: '#FEF9C3', border: '#FEF08A', color: '#CA8A04', label: '~ Partial' },
  }

  // All teams' shifts for selected day, grouped by team
  const teamShiftRows = useMemo(() =>
    teams.map(t => ({
      team: t,
      shifts: shifts.filter(s => s.team_id === t.id && s.days.includes(selectedDay)).sort((a, b) => a.start - b.start),
    })).filter(r => r.shifts.length > 0)
  , [shifts, teams, selectedDay])

  const memberTeam = selectedMember ? teams.find(t => t.id === selectedMember.team_id) : null
  const memberTeamColor = memberTeam?.color || '#9CA3AF'

  return (
    <div style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6', padding: '12px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Shift Detail</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>– {DAYS[selectedDay]}</span>
          {selectedMember ? (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
              background: memberTeamColor + '18', color: memberTeamColor,
            }}>
              {selectedMember.name}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
              ← select a staff member to inspect their shift availability
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {DAYS.map((d, di) => (
            <button key={d} onClick={() => onSelectDay(di)} style={{
              width: 26, height: 22, borderRadius: 6, border: 'none',
              background: di === selectedDay ? '#FF1F7D' : 'transparent',
              color: di === selectedDay ? '#fff' : '#9CA3AF',
              fontSize: 9, fontWeight: 600, cursor: 'pointer',
            }}>{d.slice(0, 2)}</button>
          ))}
        </div>
      </div>

      {/* Hour axis */}
      <div style={{ marginLeft: 120, position: 'relative', height: 14, marginBottom: 4 }}>
        {hourMarkers.filter((_, i) => i % 2 === 0).map(h => (
          <div key={h} style={{
            position: 'absolute',
            left: `${((h - GANTT_START) / GANTT_HOURS) * 100}%`,
            fontSize: 8, color: '#9CA3AF', transform: 'translateX(-50%)', fontWeight: 500,
          }}>{String(h).padStart(2, '0')}</div>
        ))}
      </div>

      {/* Shift rows. SS#6 style */}
      {teamShiftRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
          No shifts on {DAYS[selectedDay]}
        </div>
      ) : (
        teamShiftRows.map(({ team, shifts: teamShifts }) => (
          <div key={team.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 3, height: 12, borderRadius: 2, background: team.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: team.color }}>{team.team_name}</span>
            </div>
            {teamShifts.map(shift => {
              const left = ((Math.max(shift.start, GANTT_START) - GANTT_START) / GANTT_HOURS) * 100
              const width = ((Math.min(shift.end, GANTT_END) - Math.max(shift.start, GANTT_START)) / GANTT_HOURS) * 100
              const ab = memberAvail ? availBar[memberAvail] : null

              return (
                <div key={shift.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  {/* Shift label, team colour text, like SS#6 */}
                  <div style={{ width: 116, flexShrink: 0, paddingRight: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: team.color }}>{shift.name}</div>
                    <div style={{ fontSize: 9, color: '#9CA3AF' }}>
                      {decimalToLabel(shift.start)}–{decimalToLabel(shift.end)}
                    </div>
                  </div>
                  {/* Gantt track */}
                  <div style={{
                    flex: 1, position: 'relative', height: 26,
                    background: '#fff', borderRadius: 5, border: '1px solid #F3F4F6', overflow: 'hidden',
                  }}>
                    {hourMarkers.map(h => (
                      <div key={h} style={{
                        position: 'absolute', left: `${((h - GANTT_START) / GANTT_HOURS) * 100}%`,
                        top: 0, bottom: 0, width: 1, background: '#F3F4F6',
                      }} />
                    ))}
                    {/* Availability bar, fills full shift width in availability color (SS#6 style) */}
                    <div style={{
                      position: 'absolute',
                      left: `${left}%`, width: `${width}%`,
                      top: 2, bottom: 2, borderRadius: 4,
                      background: ab ? ab.bg : '#F3F4F6',
                      border: ab ? `1px solid ${ab.border}` : '1px solid #E5E7EB',
                      display: 'flex', alignItems: 'center',
                      paddingLeft: 8,
                      fontSize: 9, fontWeight: 600,
                      color: ab ? ab.color : '#9CA3AF',
                      overflow: 'hidden',
                    }}>
                      {ab ? ab.label : selectedMember ? '– No data' : shift.name}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
        {[
          { label: 'Available', bg: '#DCFCE7', border: '#BBF7D0', color: '#16A34A', icon: '✓' },
          { label: 'Unavailable', bg: '#FEE2E2', border: '#FECACA', color: '#EF4444', icon: '✕' },
          { label: 'Partial', bg: '#FEF9C3', border: '#FEF08A', color: '#CA8A04', icon: '~' },
          { label: 'Preferred', bg: '#DCFCE7', border: '#BBF7D0', color: '#CA8A04', icon: '★' },
          { label: 'No data', bg: '#F9FAFB', border: '#E5E7EB', color: '#9CA3AF', icon: '–' },
          { label: 'Locked by rule', bg: '#F9FAFB', border: '#E5E7EB', color: '#9CA3AF', icon: '🔒' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#374151' }}>
            <div style={{
              width: 17, height: 17, borderRadius: 4,
              background: item.bg, border: `1px solid ${item.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: item.color, fontWeight: 700,
            }}>{item.icon}</div>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AvailabilityGrid ──────────────────────────────────────────────────────────

export default function AvailabilityGrid({
  teams, staff, filteredStaff, shifts,
  selectedDay, selectedStaffId, warnings,
  onSelectDay, onSelectStaff, onUpdateAvailability,
}) {
  const handleCellClick = (member, dayIdx) => {
    const rules = member.availability_rules || []
    const isLocked = rules.some(r => {
      if (r.tendency !== 'always' && r.tendency !== 'never') return false
      return r.days === 'all' || (r.days === 'weekdays' && dayIdx < 5) || (r.days === 'weekends' && dayIdx >= 5)
    })
    if (isLocked) return
    onUpdateAvailability(member.id, toggleGrid(member.availability_grid, dayIdx))
  }

  const handleToggleAll = (member) => {
    onUpdateAvailability(member.id, toggleAllDays(member.availability_grid))
  }

  // Column layout constants
  const TOGGLE_W = 22
  const STAFF_W = 134
  const GAP = 4
  const HEADER_OFFSET = TOGGLE_W + GAP + STAFF_W + GAP

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: "'Cal Sans', 'Cal Sans Text', 'Plus Jakarta Sans', sans-serif" }}>Availability</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#FFF0F5', color: '#FF1F7D' }}>
          {filteredStaff.length} staff
        </span>
        {warnings.length > 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#FEF2F2', color: '#EF4444' }}>
            {warnings.length} issue{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 640 }}>

            {/* Column headers row */}
            <div style={{ display: 'flex', marginBottom: 5, gap: GAP }}>
              {/* Toggle all column header */}
              <div style={{
                width: TOGGLE_W, flexShrink: 0, textAlign: 'center',
                fontSize: 8, fontWeight: 600, color: '#9CA3AF',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
              }}>↕</div>

              {/* Staff name column header (blank, just spacing) */}
              <div style={{ width: STAFF_W, flexShrink: 0 }} />

              {/* Day headers */}
              {DAYS.map((day, di) => {
                const availCount = getAvailableCountForDay(filteredStaff, di)
                const total = filteredStaff.length
                const sel = di === selectedDay
                return (
                  <div
                    key={day}
                    onClick={() => onSelectDay(di)}
                    style={{
                      flex: 1, minWidth: 0, cursor: 'pointer',
                      padding: '5px 4px', borderRadius: 8,
                      border: sel ? '2px solid #FF1F7D' : '1px solid #E5E7EB',
                      background: sel ? '#FFF0F5' : '#F9FAFB',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: sel ? '#FF1F7D' : '#111827' }}>{day}</div>
                    <div style={{
                      fontSize: 9, fontWeight: 600,
                      color: availCount === total ? '#16A34A' : availCount === 0 ? '#EF4444' : '#F97316',
                    }}>{availCount}/{total}</div>
                  </div>
                )
              })}
            </div>

            {/* Staff rows grouped by team */}
            {teams.map(team => {
              const teamStaff = filteredStaff.filter(s => s.team_id === team.id)
              if (!teamStaff.length) return null
              return (
                <div key={team.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, paddingLeft: TOGGLE_W + GAP }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: team.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: team.color }}>{team.team_name}</span>
                  </div>

                  {teamStaff.map(member => {
                    const isSelectedStaff = member.id === selectedStaffId
                    return (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 3, gap: GAP }}>
                        {/* Toggle all button */}
                        <button
                          onClick={() => handleToggleAll(member)}
                          title="Toggle all days"
                          style={{
                            width: TOGGLE_W, height: CELL_H, borderRadius: 7, flexShrink: 0,
                            border: '1px solid #E5E7EB', background: '#F9FAFB',
                            cursor: 'pointer', fontSize: 11, color: '#9CA3AF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .1s',
                          }}
                        >↕</button>

                        {/* Staff label */}
                        <div
                          onClick={() => onSelectStaff(member.id)}
                          style={{
                            width: STAFF_W, flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '4px 6px', borderRadius: 7, cursor: 'pointer', height: CELL_H,
                            background: isSelectedStaff ? team.color + '12' : 'transparent',
                            border: isSelectedStaff ? `1px solid ${team.color}33` : '1px solid transparent',
                            boxSizing: 'border-box',
                          }}
                        >
                          <Avatar name={member.name} color={team.color} size={20} />
                          <span style={{
                            fontSize: 11, fontWeight: isSelectedStaff ? 700 : 500,
                            color: isSelectedStaff ? team.color : '#374151',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {member.name}
                          </span>
                        </div>

                        {/* Day cells */}
                        {DAYS.map((_, di) => {
                          const status = getDayAvailability(member, di)
                          const rules = member.availability_rules || []
                          const isLocked = rules.some(r => {
                            if (r.tendency !== 'always' && r.tendency !== 'never') return false
                            return r.days === 'all' || (r.days === 'weekdays' && di < 5) || (r.days === 'weekends' && di >= 5)
                          })
                          return (
                            <AvailCell
                              key={di}
                              status={status}
                              isLocked={isLocked}
                              isSelected={di === selectedDay && isSelectedStaff}
                              onClick={() => handleCellClick(member, di)}
                            />
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {filteredStaff.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: '#9CA3AF' }}>No staff to display</div>
            )}
          </div>
        </div>

        {/* Shift Detail Gantt, always shown */}
        <div style={{ marginTop: 14 }}>
          <ShiftDetailGantt
            selectedDay={selectedDay}
            selectedStaffId={selectedStaffId}
            staff={staff}
            shifts={shifts}
            teams={teams}
            onSelectDay={onSelectDay}
          />
        </div>
      </div>
    </div>
  )
}