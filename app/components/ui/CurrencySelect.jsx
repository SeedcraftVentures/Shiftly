'use client'

import { CURRENCIES } from '@/app/lib/constants'

export default function CurrencySelect({ value, onChange, style }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '11px 14px',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        border: '1.5px solid var(--gray-200)',
        borderRadius: 8,
        color: 'var(--gray-900)',
        background: 'var(--gray-0)',
        outline: 'none',
        cursor: 'pointer',
        minWidth: 100,
        ...style,
      }}
    >
      {CURRENCIES.map(c => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  )
}
