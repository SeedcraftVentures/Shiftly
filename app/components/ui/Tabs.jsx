'use client'

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1.5px solid var(--gray-100)',
        marginBottom: 24,
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.value === active
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            style={{
              padding: '12px 18px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: isActive ? 'var(--pink-500)' : 'var(--gray-500)',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--pink-500)' : 'transparent'}`,
              marginBottom: -1.5,
              cursor: 'pointer',
              transition: 'color .15s, border-color .15s',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}