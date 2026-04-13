'use client'

export default function Section({ title, description, children, style }) {
  return (
    <div style={{ marginBottom: 32, ...style }}>
      {title && (
        <h2
          className="heading-section"
          style={{ color: 'var(--gray-800)', marginBottom: description ? 4 : 16 }}
        >
          {title}
        </h2>
      )}
      {description && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 16px' }}>
          {description}
        </p>
      )}
      {children}
    </div>
  )
}