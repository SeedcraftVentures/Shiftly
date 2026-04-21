'use client'

import { useRef, useEffect } from 'react'
import StaffRow from './StaffRow'

export default function StaffList({
  teams, staff, filteredStaff, openStaffId,
  onToggleStaff, onUpdateStaff, onDeleteStaff, scrollToId,
}) {
  const rowRefs = useRef({})

  useEffect(() => {
    if (!scrollToId) return
    const el = rowRefs.current[scrollToId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [scrollToId])

  const groupedByTeam = {}
  teams.forEach(t => { groupedByTeam[t.team_id] = [] })
  filteredStaff.forEach(s => {
    if (groupedByTeam[s.team_id]) groupedByTeam[s.team_id].push(s)
  })

  return (
    <div style={{
      background: 'var(--gray-0)',
      borderRadius: 14,
      border: '1px solid var(--gray-200)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--gray-100)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--gray-900)' }}>
          Staff Members
        </span>
        <span style={{
          marginLeft: 8, fontSize: 'var(--text-xs)', fontWeight: 600,
          padding: '2px 10px', borderRadius: 99,
          background: 'var(--shiftly-pink-light)', color: 'var(--shiftly-pink)',
        }}>
          {filteredStaff.length} member{filteredStaff.length !== 1 ? 's' : ''}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ width: 80, fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', textAlign: 'center' }}>
            Role
          </span>
          <span style={{ width: 100, fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', textAlign: 'center' }}>
            Hours/wk
          </span>
          <span style={{ width: 110, fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', textAlign: 'center' }}>
            Status
          </span>
          <div style={{ width: 36 }} />
        </div>
      </div>

      {/* Staff grouped by team */}
      <div style={{ padding: '12px 18px' }}>
        {teams.map(team => {
          const teamStaff = groupedByTeam[team.team_id]
          if (!teamStaff || teamStaff.length === 0) return null

          return (
            <div key={team.team_id} style={{ marginBottom: 18 }}>
              {/* Team header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 8,
                padding: '0 2px',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 3,
                  background: team.color,
                }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: team.color }}>
                  {team.name}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                  {teamStaff.length} member{teamStaff.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: team.colorLight, marginLeft: 4 }} />
              </div>

              {/* Staff rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {teamStaff.map(member => (
                  <div key={member.staff_id} ref={el => { rowRefs.current[member.staff_id] = el }}>
                    <StaffRow
                      member={member}
                      teams={teams}
                      teamColor={team.color}
                      teamColorLight={team.colorLight}
                      isOpen={openStaffId === member.staff_id}
                      onToggle={() => onToggleStaff(member.staff_id)}
                      onUpdate={onUpdateStaff}
                      onDelete={onDeleteStaff}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredStaff.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>
              No staff yet
            </div>
            <div style={{ fontSize: 'var(--text-xs)' }}>
              Click + Add Staff to add your first team member
            </div>
          </div>
        )}
      </div>
    </div>
  )
}