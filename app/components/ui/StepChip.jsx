'use client'

export default function StepChip({ icon, label, active }) {
  return (
    <div
      className="ui-chip"
      style={{
        padding: '4px 10px',
        fontWeight: 600,
        marginBottom: 20,
        background: active ? 'var(--shiftly-pink-light)' : 'var(--gray-50)',
        border: `1px solid ${active ? 'rgb(from var(--shiftly-pink) r g b / 27%)' : 'var(--gray-200)'}`,
        color: active ? 'var(--shiftly-pink)' : 'var(--gray-400)',
      }}
    >
      {icon}
      {label}
    </div>
  )
}
