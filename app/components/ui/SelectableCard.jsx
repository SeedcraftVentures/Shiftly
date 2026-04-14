'use client'

export default function SelectableCard({ selected, onClick, icon, label, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '20px 12px',
        borderRadius: 10,
        cursor: 'pointer',
        border: selected ? '2px solid var(--shiftly-pink)' : '2px solid var(--gray-200)',
        background: selected ? 'var(--shiftly-pink-light)' : 'var(--gray-50)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'all .12s',
        ...style,
      }}
    >
      {icon && (
        <div style={{ color: selected ? 'var(--shiftly-pink)' : 'var(--gray-400)' }}>
          {icon}
        </div>
      )}
      <span
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          color: selected ? 'var(--shiftly-pink)' : 'var(--gray-700)',
        }}
      >
        {label}
      </span>
    </button>
  )
}
