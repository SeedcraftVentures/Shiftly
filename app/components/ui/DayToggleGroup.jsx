'use client'

import { DAYS_SHORT } from '@/app/lib/constants/days'

/**
 * DayToggleGroup — Day selection row with optional quick-select buttons.
 * @param {object} props
 * @param {number[]} props.days — Array of selected day indices (0=Mon ... 6=Sun)
 * @param {function} props.onChange — Called with updated days array
 * @param {string} [props.color='var(--shiftly-pink)'] — Accent color for selected state
 * @param {boolean} [props.showQuickButtons=true] — Show All/Weekdays/Weekends buttons
 */
export default function DayToggleGroup({
  days = [],
  onChange,
  color = 'var(--shiftly-pink)',
  showQuickButtons = true,
}) {
  const toggleDay = (idx) => {
    if (days.includes(idx)) {
      onChange(days.filter(d => d !== idx))
    } else {
      onChange([...days, idx].sort((a, b) => a - b))
    }
  }

  const setDays = (indices) => onChange(indices)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {showQuickButtons && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'All', value: [0, 1, 2, 3, 4, 5, 6] },
            { label: 'Weekdays', value: [0, 1, 2, 3, 4] },
            { label: 'Weekends', value: [5, 6] },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => setDays(preset.value)}
              style={{
                padding: '3px 10px',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                border: '1px solid var(--gray-200)',
                borderRadius: 6,
                background: 'var(--gray-0)',
                color: 'var(--gray-500)',
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4 }}>
        {DAYS_SHORT.map((label, idx) => {
          const active = days.includes(idx)
          return (
            <button
              key={idx}
              onClick={() => toggleDay(idx)}
              style={{
                width: 38,
                height: 34,
                borderRadius: 8,
                border: active ? `2px solid ${color}` : '1.5px solid var(--gray-200)',
                background: active ? color : 'var(--gray-0)',
                color: active ? 'var(--gray-0)' : 'var(--gray-500)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .12s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
