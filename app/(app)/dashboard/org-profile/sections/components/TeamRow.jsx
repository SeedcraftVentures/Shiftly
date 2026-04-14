'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui'
import { ChevronDownIcon, TrashIcon, PencilSquareIcon } from '@/app/lib/icons'
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
  const [editing, setEditing] = useState(false)
  const isDeleting = deleteConfirm === team.team_id

  const startEditing = () => {
    setEditing(true)
    if (!isExpanded) onToggleExpand()
  }

  const stopEditing = () => {
    setEditing(false)
    if (name.trim() && name.trim() !== team.name) onRename(name.trim())
  }

  return (
    <div
      style={{
        border: '1.5px solid var(--gray-200)',
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        background: 'var(--gray-0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            background: team.color,
            flexShrink: 0,
          }}
        />

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => editing && stopEditing()}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              setName(team.name)
              setEditing(false)
            }
          }}
          readOnly={!editing}
          style={{
            flex: 1,
            padding: editing ? '8px 12px' : '8px 0',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            border: `1.5px solid ${editing ? 'var(--shiftly-pink)' : 'transparent'}`,
            borderRadius: 8,
            outline: 'none',
            color: 'var(--gray-900)',
            background: editing ? 'var(--gray-0)' : 'transparent',
            cursor: editing ? 'text' : 'default',
            transition: 'all .15s',
            maxWidth: editing ? 320 : 'none',
            minWidth: 0,
          }}
        />

        {/* Edit pencil */}
        <button
          onClick={editing ? stopEditing : startEditing}
          aria-label={editing ? 'Done editing' : 'Edit team'}
          style={{
            padding: 8,
            background: editing ? 'var(--shiftly-pink-light)' : 'transparent',
            border: 'none',
            color: editing ? 'var(--shiftly-pink)' : 'var(--gray-400)',
            cursor: 'pointer',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PencilSquareIcon size={16} />
        </button>

        {/* Expand/collapse hours */}
        <button
          onClick={onToggleExpand}
          aria-label={isExpanded ? 'Collapse hours' : 'Edit hours'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--gray-600)',
            background: 'var(--gray-0)',
            border: '1.5px solid var(--gray-200)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Hours
          <ChevronDownIcon size={12} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>

        {/* Delete */}
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
              padding: 8,
              background: 'transparent',
              border: 'none',
              color: 'var(--gray-400)',
              cursor: 'pointer',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrashIcon size={16} />
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