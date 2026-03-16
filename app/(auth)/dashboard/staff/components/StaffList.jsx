'use client'

import { useRef, useEffect } from 'react'
import StaffRow from './StaffRow'

const FONT_HEADING = "'Cal Sans', 'Plus Jakarta Sans', sans-serif"

export default function StaffList({
  teams, staff, filteredStaff, openStaffId,
  onToggleStaff, onUpdateStaff, onDeleteStaff,
  legalLimit, minWage, shiftLengths, scrollToId,
}) {
  const rowRefs = useRef({})

  useEffect(() => {
    if (!scrollToId) return
    const el = rowRefs.current[scrollToId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [scrollToId])

  const groupedByTeam = {}
  teams.forEach(t => { groupedByTeam[t.id] = [] })
  filteredStaff.forEach(s => {
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
          Staff Members
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 9px',
          borderRadius: 99, background: '#FFF0F5', color: '#FF1F7D',
        }}>
          {filteredStaff.length} member{filteredStaff.length !== 1 ? 's' : ''}
        </span>

        {/* Column headers */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', width: 80, textAlign: 'center' }}>
            AVAILABILITY
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', width: 90, textAlign: 'center' }}>
            HOURS/WK
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', width: 110, textAlign: 'center' }}>
            STATUS
          </span>
          <div style={{ width: 36 }} />
        </div>
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
                <span style={{
                  fontSize: 13, fontWeight: 700, color: team.color,
                  fontFamily: FONT_HEADING,
                }}>
                  {team.team_name}
                </span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {ts.length} member{ts.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: team.color + '20', marginLeft: 4 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {ts.map(member => (
                  <div key={member.id} ref={el => { rowRefs.current[member.id] = el }}>
                    <StaffRow
                      member={member}
                      teams={teams}
                      teamColor={team.color}
                      isOpen={openStaffId === member.id}
                      onToggle={() => onToggleStaff(member.id)}
                      onUpdate={onUpdateStaff}
                      onDelete={onDeleteStaff}
                      legalLimit={legalLimit}
                      minWage={minWage}
                      shiftLengths={shiftLengths}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredStaff.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, fontFamily: FONT_HEADING }}>
              No staff yet
            </div>
            <div style={{ fontSize: 12 }}>Click + Add Staff to add your first team member</div>
          </div>
        )}
      </div>
    </div>
  )
}