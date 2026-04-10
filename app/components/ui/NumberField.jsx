'use client'

export default function NumberField({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 0.01,
  prefix,
  style,
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}>
      {prefix && (
        <span
          style={{
            position: 'absolute',
            left: 14,
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-400)',
            pointerEvents: 'none',
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        style={{
          width: '100%',
          padding: '11px 14px',
          paddingLeft: prefix ? 30 : 14,
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          border: '1.5px solid var(--gray-200)',
          borderRadius: 8,
          color: 'var(--gray-900)',
          background: 'var(--gray-0)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
