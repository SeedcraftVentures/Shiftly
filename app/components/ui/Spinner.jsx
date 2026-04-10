'use client'

export default function Spinner({ size = 14, className = '' }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'currentColor',
        animation: 'spin 0.6s linear infinite',
      }}
    />
  )
}
