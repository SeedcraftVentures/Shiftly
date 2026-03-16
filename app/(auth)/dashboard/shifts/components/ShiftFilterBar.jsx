'use client'

export default function ShiftFilterBar({ teams, shifts, filterTeamId, onFilterChange, onAddShift }) {
  return (
    <div style={{ padding: '10px 24px', background: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.8, marginRight: 2, flexShrink: 0 }}>
        FILTER
      </span>

      <button
        onClick={() => onFilterChange('all')}
        style={{
          padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          border: filterTeamId === 'all' ? '2px solid #FF1F7D' : '1px solid #E5E7EB',
          background: filterTeamId === 'all' ? '#FFF0F5' : '#fff',
          color: filterTeamId === 'all' ? '#FF1F7D' : '#6B7280',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        All Teams{' '}
        <span style={{ fontWeight: 400, color: filterTeamId === 'all' ? '#FF1F7D' : '#9CA3AF' }}>
          ({shifts.length})
        </span>
      </button>

      {teams.map(team => {
        const on = filterTeamId === String(team.id)
        return (
          <button
            key={team.id}
            onClick={() => onFilterChange(String(team.id))}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: on ? `2px solid ${team.color}` : '1px solid #E5E7EB',
              background: on ? team.colorLight : '#fff',
              color: on ? team.color : '#6B7280',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: 99, background: team.color, flexShrink: 0 }} />
            {team.team_name}{' '}
            <span style={{ fontWeight: 400, color: on ? team.color : '#9CA3AF' }}>
              ({shifts.filter(s => s.team_id === team.id).length})
            </span>
          </button>
        )
      })}

      <button
        onClick={onAddShift}
        style={{
          marginLeft: 'auto', padding: '7px 18px', borderRadius: 8, border: 'none',
          background: '#FF1F7D', color: '#fff', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        + Add Shift
      </button>
    </div>
  )
}