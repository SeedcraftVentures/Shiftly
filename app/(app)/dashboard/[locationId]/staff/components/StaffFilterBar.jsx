'use client'

export default function StaffFilterBar({
  teams, staff, filterTeamId, totalContractedHours,
  onFilterChange, onAddStaff,
}) {
  return (
    <div style={{ padding: '10px 0', background: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>

      <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginRight: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, color: '#111827' }}>{staff.length}</span>
        <span style={{ color: '#6B7280' }}> member{staff.length !== 1 ? 's' : ''}</span>
        <span style={{ color: '#D1D5DB', margin: '0 8px' }}>·</span>
        <span style={{ fontWeight: 700, color: '#FF1F7D' }}>{totalContractedHours}h</span>
        <span style={{ color: '#6B7280' }}> contracted</span>
      </div>

      <div style={{ width: 1, height: 18, background: '#E5E7EB', flexShrink: 0 }} />

      <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.8, flexShrink: 0 }}>
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
          ({staff.length})
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
              ({staff.filter(s => s.team_id === team.id).length})
            </span>
          </button>
        )
      })}

      <button
        onClick={onAddStaff}
        style={{
          marginLeft: 'auto', padding: '7px 18px', borderRadius: 8, border: 'none',
          background: '#FF1F7D', color: '#fff', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        + Add Staff
      </button>
    </div>
  )
}