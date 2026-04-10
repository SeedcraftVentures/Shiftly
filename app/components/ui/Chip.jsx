'use client'

export default function Chip({ children, color, colorLight, onRemove, style }) {
  return (
    <div
      className="ui-chip"
      style={{
        '--ui-chip-padding': '6px 12px',
        gap: 6,
        background: colorLight || 'var(--gray-50)',
        border: `2px solid ${color || 'var(--gray-200)'}`,
        color: color || 'var(--gray-700)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            padding: 0,
            marginLeft: 2,
            fontSize: 'var(--text-sm)',
          }}
        >
          &times;
        </button>
      )}
    </div>
  )
}
