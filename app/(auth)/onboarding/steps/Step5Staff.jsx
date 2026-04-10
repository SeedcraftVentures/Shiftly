'use client'

import { useState } from 'react'
import { assignTeamColor } from '@/app/lib/constants'
import { StepChip } from '@/app/components/ui'
import { TeamIcon, PlusIcon } from '@/app/lib/icons'

function TeamStaffInput({ team, index, names, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const { color, colorLight } = assignTeamColor(index)

  const handleAdd = () => {
    if (!input.trim()) return
    onAdd(team.id, input)
    setInput('')
  }

  return (
    <div
      style={{
        border: `1.5px solid ${color}`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        background: colorLight,
      }}
    >
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color, marginBottom: 8 }}>
        {team.label}
      </div>

      {/* Existing names */}
      {names.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {names.map((name, i) => (
            <span
              key={i}
              className="ui-chip"
              style={{
                '--ui-chip-padding': '4px 10px',
                background: 'var(--gray-0)',
                border: '1px solid var(--gray-200)',
                color: 'var(--gray-700)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                gap: 6,
              }}
            >
              {name}
              <button
                onClick={() => onRemove(team.id, i)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray-400)',
                  padding: 0,
                  fontSize: 'var(--text-sm)',
                }}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Name or comma-separated names..."
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            border: '1px solid var(--gray-200)',
            borderRadius: 6,
            color: 'var(--gray-900)',
            background: 'var(--gray-0)',
            outline: 'none',
          }}
        />
        <button
          className="ui-inline-action ui-inline-action-xs"
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{
            border: 'none',
            background: input.trim() ? color : 'var(--gray-100)',
            color: input.trim() ? 'var(--gray-0)' : 'var(--gray-400)',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            gap: 4,
          }}
        >
          <PlusIcon size={10} /> Add
        </button>
      </div>
    </div>
  )
}

export default function Step5Staff({ state }) {
  const { selectedTeams, staffByTeam, addStaffToTeam, removeStaffFromTeam } = state

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <StepChip icon={<TeamIcon size={13} />} label="Staff" active />

      <h1 className="heading-page">Quick-add your staff</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 16px' }}>
        Add names now or skip and do it later. Paste comma-separated names to add multiple at once.
      </p>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedTeams.map((team, i) => (
          <TeamStaffInput
            key={team.id}
            team={team}
            index={i}
            names={staffByTeam[team.id] || []}
            onAdd={addStaffToTeam}
            onRemove={removeStaffFromTeam}
          />
        ))}
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 8 }}>
        You can always add, edit, and invite staff later from the Staff section.
      </p>
    </div>
  )
}
