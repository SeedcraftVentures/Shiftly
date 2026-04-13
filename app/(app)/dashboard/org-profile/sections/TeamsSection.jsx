'use client'

import { useState } from 'react'
import { Section } from '@/app/components/ui'
import Button from '@/app/components/Button'
import { assignTeamColor } from '@/app/lib/constants'
import TeamRow from './components/TeamRow'

function assignTeamColors(teams) {
  return teams.map((t, i) => ({ ...t, ...assignTeamColor(i) }))
}

export default function TeamsSection({ teams, teamHours, locationHours, onReload }) {
  const [newTeamName, setNewTeamName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [expandedTeam, setExpandedTeam] = useState(null)
  const teamsWithColor = assignTeamColors(teams)

  const addTeam = async () => {
    if (!newTeamName.trim()) return
    try {
      await fetch('/api/org-profile/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      })
      setNewTeamName('')
      await onReload()
    } catch (err) {
      console.error('Failed to add team:', err)
    }
  }

  const renameTeam = async (teamId, name) => {
    if (!name.trim()) return
    try {
      await fetch(`/api/org-profile/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      await onReload()
    } catch (err) {
      console.error('Failed to rename team:', err)
    }
  }

  const deleteTeam = async (teamId) => {
    try {
      await fetch(`/api/org-profile/teams/${teamId}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      await onReload()
    } catch (err) {
      console.error('Failed to delete team:', err)
    }
  }

  const saveTeamHours = async (teamId, day, startOverride, endOverride) => {
    try {
      await fetch(`/api/org-profile/teams/${teamId}/hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          start_time_override: startOverride,
          end_time_override: endOverride,
        }),
      })
      await onReload()
    } catch (err) {
      console.error('Failed to save team hours:', err)
    }
  }

  return (
    <Section title="Teams" description="Teams within this location">
      {teamsWithColor.map(team => (
        <TeamRow
          key={team.team_id}
          team={team}
          teamHours={teamHours.filter(h => h.team_id === team.team_id)}
          locationHours={locationHours}
          isExpanded={expandedTeam === team.team_id}
          onToggleExpand={() => setExpandedTeam(prev => prev === team.team_id ? null : team.team_id)}
          onRename={name => renameTeam(team.team_id, name)}
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={() => setDeleteConfirm(team.team_id)}
          onDeleteCancel={() => setDeleteConfirm(null)}
          onDelete={() => deleteTeam(team.team_id)}
          onSaveHours={(day, s, e) => saveTeamHours(team.team_id, day, s, e)}
        />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input
          type="text"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTeam()}
          placeholder="+ Add team"
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 'var(--text-sm)',
            border: '1.5px dashed var(--gray-200)',
            borderRadius: 10,
            outline: 'none',
            color: 'var(--gray-700)',
            background: 'var(--gray-0)',
          }}
        />
        {newTeamName.trim() && (
          <Button variant="primary" size="sm" onClick={addTeam}>Add</Button>
        )}
      </div>
    </Section>
  )
}