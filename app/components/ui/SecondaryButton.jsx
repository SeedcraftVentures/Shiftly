'use client'

export default function SecondaryButton({ children, onClick, disabled, style, className = '' }) {
  return (
    <button
      className={`ui-inline-action ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 20px',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        border: '1px solid var(--gray-200)',
        background: 'var(--gray-0)',
        color: 'var(--gray-500)',
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
