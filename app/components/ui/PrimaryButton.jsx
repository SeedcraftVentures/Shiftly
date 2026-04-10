'use client'

import Spinner from './Spinner'

export default function PrimaryButton({ children, onClick, disabled, loading, style, className = '' }) {
  const isDisabled = disabled || loading

  return (
    <button
      className={`ui-inline-action ${className}`}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        padding: '10px 24px',
        fontSize: 'var(--text-sm)',
        fontWeight: 700,
        border: 'none',
        background: isDisabled ? 'var(--gray-100)' : 'var(--pink-500)',
        color: isDisabled ? 'var(--gray-400)' : 'var(--gray-0)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all .12s',
        ...style,
      }}
    >
      {loading ? <Spinner size={14} /> : children}
    </button>
  )
}
