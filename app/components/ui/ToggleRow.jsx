'use client'

/**
 * ToggleRow — Inline row with label, toggle, and optional numeric input.
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.description]
 * @param {boolean} props.enabled
 * @param {function} props.onEnabledChange — Called with new boolean
 * @param {number} [props.value] — Optional numeric value
 * @param {function} [props.onValueChange] — Called with new number
 * @param {string} [props.valueSuffix] — e.g. "hours", "days"
 * @param {boolean} [props.valueDisabled=false] — Force-disable the numeric input
 */
export default function ToggleRow({
  label,
  description,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  valueSuffix,
  valueDisabled = false,
}) {
  const showNumeric = onValueChange !== undefined

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid var(--gray-100)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-800)',
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-400)',
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>

      {showNumeric && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            value={value ?? ''}
            onChange={e => {
              const n = e.target.value === '' ? '' : Number(e.target.value)
              onValueChange(n)
            }}
            disabled={valueDisabled}
            style={{
              width: 60,
              padding: '5px 8px',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              border: '1.5px solid var(--gray-200)',
              borderRadius: 6,
              color: !enabled ? 'var(--gray-300)' : 'var(--gray-800)',
              background: !enabled ? 'var(--gray-50)' : 'var(--gray-0)',
              outline: 'none',
              textAlign: 'center',
              opacity: !enabled ? 0.6 : 1,
            }}
          />
          {valueSuffix && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-400)',
                fontWeight: 500,
              }}
            >
              {valueSuffix}
            </span>
          )}
        </div>
      )}

      <button
        onClick={() => onEnabledChange(!enabled)}
        role="switch"
        aria-checked={enabled}
        style={{
          position: 'relative',
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          background: enabled ? 'var(--pink-500)' : 'var(--gray-200)',
          cursor: 'pointer',
          transition: 'background .15s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: enabled ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--gray-0)',
            transition: 'left .15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        />
      </button>
    </div>
  )
}
