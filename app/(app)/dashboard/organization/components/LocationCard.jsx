'use client'

import { effectiveCurrency } from '@/app/lib/utils/currencyUtils'
import { BuildingIcon } from '@/app/lib/icons'

export default function LocationCard({ location, organization, onClick }) {
  const currency = effectiveCurrency(location, organization)

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 20,
        border: '1.5px solid var(--gray-200)',
        borderRadius: 12,
        background: 'var(--gray-0)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 140,
        transition: 'all .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--shiftly-pink)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 31, 125, 0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--gray-200)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--shiftly-pink-light)',
            color: 'var(--shiftly-pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BuildingIcon className="w-5 h-5" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              color: 'var(--gray-900)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {location.name}
          </h3>
        </div>
      </div>

      {location.address && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {location.address}
        </p>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            padding: '3px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--gray-600)',
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 4,
          }}
        >
          {currency}
        </span>
      </div>
    </button>
  )
}