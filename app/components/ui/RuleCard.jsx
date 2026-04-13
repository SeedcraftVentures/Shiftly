'use client'

import { useState } from 'react'

export default function RuleCard({
  title,
  description,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  valueSuffix,
}) {
  const [focused, setFocused] = useState(false)
  const showNumeric = onValueChange !== undefined

  return (
    <div
      style={{
        padding: 16,
        border: '1.5px solid var(--gray-100)',
        borderRadius: 12,
        background: 'var(--gray-0)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 120,
      }}
    >
      {/* Header: title + toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--gray-900)',
              marginBottom: 4,
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-400)',
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          )}
        </div>

        <button
          onClick={() => onEnabledChange(!enabled)}
          role="switch"
          aria-checked={enabled}
          style={{
            position: 'relative',
            width: 36,
            height: 20,
            borderRadius: 10,
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
              left: enabled ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'var(--gray-0)',
              transition: 'left .15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          />
        </button>
      </div>

      {/* Numeric input row (if provided) */}
      {showNumeric && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 'auto',
          }}
        >
          <input
            type="number"
            value={value ?? ''}
            onChange={e => {
              const n = e.target.value === '' ? '' : Number(e.target.value)
              onValueChange(n)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={!enabled}
            style={{
              width: 64,
              padding: '6px 10px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              border: `1.5px solid ${focused ? 'var(--pink-500)' : 'var(--gray-200)'}`,
              borderRadius: 6,
              color: !enabled ? 'var(--gray-300)' : 'var(--gray-900)',
              background: !enabled ? 'var(--gray-50)' : 'var(--gray-0)',
              outline: 'none',
              textAlign: 'center',
              opacity: !enabled ? 0.6 : 1,
              transition: 'border-color .15s',
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
    </div>
  )
}