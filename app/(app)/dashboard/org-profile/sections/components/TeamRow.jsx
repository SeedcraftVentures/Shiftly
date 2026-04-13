'use client'

import { useState } from 'react'
import Button from '@/app/components/Button'
import { ChevronDownIcon, TrashIcon } from '@/app/lib/icons'
import TeamHoursOverride from './TeamHoursOverride'

export default function TeamRow({
  team,
  teamHours,
  locationHours,
  isExpanded,
  onToggleExpand,
  onRename,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete,
  onSaveHours,
}) {
  const [name, setName] = useState(team.name)
  const isDeleting = deleteConfirm === team.team_id

  return (
    <div
      style={{
        border: '1.5px solid var(--gray-100)',
        borderRadius: 10,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 4,
            background: team.color,
            flexShrink: 0,
          }}
        />

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => name.trim() !== team.name && onRename(name)}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            border: '1.5px solid transparent',
            borderRadius: 6,
            outline: 'none',
            color: 'var(--gray-800)',
            background: 'transparent',
          }}
        />

        <button
          onClick={onToggleExpand}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--gray-600)',
            background: 'var(--gray-50)',
            border: '1.5px solid var(--gray-100)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Edit hours
          <ChevronDownIcon size={12} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
        </button>

        {isDeleting ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button variant="danger" size="sm" onClick={onDelete}>Confirm</Button>
            <Button variant="secondary" size="sm" onClick={onDeleteCancel}>Cancel</Button>
          </div>
        ) : (
          <button
            onClick={onDeleteConfirm}
            aria-label="Delete team"
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--gray-400)',
              cursor: 'pointer',
            }}
          >
            <TrashIcon size={14} />
          </button>
        )}
      </div>

      {isExpanded && (
        <TeamHoursOverride
          teamHours={teamHours}
          locationHours={locationHours}
          onSave={onSaveHours}
        />
      )}
    </div>
  )
}