'use client'

export default function ShiftFilterBar({ teams, shifts, filterTeamId, onFilterChange, onAddShift }) {
  const barStyle = {
    background: 'var(--gray-0)',
    padding: '10px 24px',
    border: '1px solid var(--gray-200)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  }

  const filterLabelStyle = {
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    color: 'var(--gray-400)',
    letterSpacing: 0.8,
    marginRight: 2,
    flexShrink: 0,
  }

  const chipBaseStyle = {
    padding: '5px 12px',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  const allTeamsActive = filterTeamId === 'all'

  return (
    <div style={barStyle}>
      <span style={filterLabelStyle}>
        FILTER
      </span>

      <button
        className="ui-chip ui-chip-button"
        onClick={() => onFilterChange('all')}
        style={{
          ...chipBaseStyle,
          border: allTeamsActive ? '2px solid var(--pink-500)' : '1px solid var(--gray-200)',
          background: allTeamsActive ? 'var(--pink-50)' : 'var(--gray-0)',
          color: allTeamsActive ? 'var(--pink-500)' : 'var(--gray-500)',
        }}
      >
        All Teams{' '}
        <span
          style={{
            fontWeight: 400,
            color: allTeamsActive ? 'var(--pink-500)' : 'var(--gray-400)',
          }}
        >
          ({shifts.length})
        </span>
      </button>

      {teams.map(team => {
        const on = filterTeamId === String(team.id)
        return (
          <button
            className="ui-chip ui-chip-button"
            key={team.id}
            onClick={() => onFilterChange(String(team.id))}
            style={{
              ...chipBaseStyle,
              border: on ? `2px solid ${team.color}` : '1px solid var(--gray-200)',
              background: on ? team.colorLight : 'var(--gray-0)',
              color: on ? team.color : 'var(--gray-500)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <div
              className="ui-dot"
              style={{
                width: 7,
                height: 7,
                background: team.color,
              }}
            />
            {team.team_name}{' '}
            <span
              style={{
                fontWeight: 400,
                color: on ? team.color : 'var(--gray-400)',
              }}
            >
              ({shifts.filter(s => s.team_id === team.id).length})
            </span>
          </button>
        )
      })}

      <button
        className="ui-inline-action ui-inline-action-xs"
        onClick={onAddShift}
        style={{
          marginLeft: 'auto',
          border: 'none',
          background: 'var(--pink-500)',
          color: 'var(--gray-0)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        + Add Shift
      </button>
    </div>
  )
}