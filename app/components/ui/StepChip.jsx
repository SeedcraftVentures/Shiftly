'use client'

export default function StepChip({ icon, label, active }) {
  return (
    <div
      className="ui-chip"
      style={{
        padding: '4px 10px',
        fontWeight: 600,
        marginBottom: 20,
        background: active ? 'var(--pink-50)' : 'var(--gray-50)',
        border: `1px solid ${active ? 'rgb(from var(--pink-500) r g b / 27%)' : 'var(--gray-200)'}`,
        color: active ? 'var(--pink-500)' : 'var(--gray-400)',
      }}
    >
      {icon}
      {label}
    </div>
  )
}
