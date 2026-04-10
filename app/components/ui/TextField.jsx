'use client'

export default function TextField({
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoFocus,
  size = 'lg',
  style,
}) {
  const sizes = {
    sm: { padding: '9px 12px', fontSize: 'var(--text-xs)', fontWeight: 500, borderWidth: '1.5px' },
    md: { padding: '11px 14px', fontSize: 'var(--text-sm)', fontWeight: 500, borderWidth: '1.5px' },
    lg: { padding: '14px 16px', fontSize: 'var(--text-lg)', fontWeight: 600, borderWidth: '2px' },
  }

  const s = sizes[size] || sizes.lg
  const hasValue = value?.trim?.()

  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: '100%',
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        border: `${s.borderWidth} solid ${hasValue ? 'var(--pink-500)' : 'var(--gray-200)'}`,
        borderRadius: 10,
        color: 'var(--gray-900)',
        background: 'var(--gray-0)',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color .15s',
        ...style,
      }}
    />
  )
}
