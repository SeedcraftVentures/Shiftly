'use client'

const TYPES = [
  { value: 'open', label: 'Open' },
  { value: 'close', label: 'Close' },
  { value: 'fixed', label: 'Fixed' },
]

/**
 * AnchorTypeSelector — Three-button segmented control for shift anchor type.
 * @param {object} props
 * @param {'open'|'close'|'fixed'} props.value
 * @param {function} props.onChange — Called with new anchor type value
 */
export default function AnchorTypeSelector({ value, onChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: 8,
        border: '1.5px solid var(--gray-200)',
        overflow: 'hidden',
      }}
    >
      {TYPES.map((type, i) => {
        const active = value === type.value
        return (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            style={{
              padding: '6px 16px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              border: 'none',
              borderLeft: i > 0 ? '1.5px solid var(--gray-200)' : 'none',
              background: active ? 'var(--shiftly-pink)' : 'var(--gray-0)',
              color: active ? 'var(--gray-0)' : 'var(--gray-500)',
              cursor: 'pointer',
              transition: 'all .12s',
            }}
          >
            {type.label}
          </button>
        )
      })}
    </div>
  )
}
