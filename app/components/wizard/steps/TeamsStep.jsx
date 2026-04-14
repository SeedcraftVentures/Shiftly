'use client'

import { assignTeamColor } from '@/app/lib/constants'
import { StepChip, ChipButton, Chip, TextField } from '@/app/components/ui'
import { TeamIcon, PlusIcon } from '@/app/lib/icons'

export default function Step4Teams({ state }) {
  const {
    address,
    selectedTeams,
    presetTeams,
    customTeam,
    setField,
    toggleTeam,
    addCustomTeam,
    removeTeam,
  } = state

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <StepChip icon={<TeamIcon size={13} />} label="Teams" active />

      <h1 className="heading-page">Select your teams</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 6px' }}>
        Each team gets its own shift patterns and scheduling rules.
      </p>

      {/* Preset team chips */}
      {presetTeams.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, marginTop: 16 }}>
          {presetTeams.map((t, i) => {
            const { color, colorLight } = assignTeamColor(i)
            const on = selectedTeams.find(s => s.id === t.id)
            return (
              <ChipButton
                key={t.id}
                selected={!!on}
                onClick={() => toggleTeam(t.id, t.label)}
                label={t.label}
                color={color}
                colorLight={colorLight}
              />
            )
          })}
        </div>
      )}

      {/* Custom team chips */}
      {selectedTeams
        .filter(t => !presetTeams.find(p => p.id === t.id))
        .map((t, i) => {
          const { color, colorLight } = assignTeamColor(presetTeams.length + i)
          return (
            <Chip
              key={t.id}
              color={color}
              colorLight={colorLight}
              onRemove={() => removeTeam(t.id)}
              style={{ marginBottom: 4 }}
            >
              {t.label}
            </Chip>
          )
        })}

      {/* Custom team input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <TextField
          value={customTeam}
          onChange={v => setField('customTeam', v)}
          onKeyDown={e => e.key === 'Enter' && addCustomTeam()}
          placeholder="Add custom team..."
          size="sm"
          style={{ flex: 1 }}
        />
        <button
          className="ui-inline-action ui-inline-action-xs"
          onClick={addCustomTeam}
          disabled={!customTeam.trim()}
          style={{
            height: 38,
            border: 'none',
            background: customTeam.trim() ? 'var(--shiftly-pink)' : 'var(--gray-100)',
            color: customTeam.trim() ? 'var(--gray-0)' : 'var(--gray-400)',
            cursor: customTeam.trim() ? 'pointer' : 'not-allowed',
            gap: 5,
          }}
        >
          <PlusIcon size={11} /> Add
        </button>
      </div>

      {selectedTeams.length > 0 && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 8 }}>
          {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
