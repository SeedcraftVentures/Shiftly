'use client'

import { useState } from 'react'
import Chip from './Chip'

const VARIANTS = {
  danger: {
    bg: 'var(--red-50)',
    border: 'var(--red-200)',
    badgeBg: 'var(--red-500)',
    text: 'var(--red-600)',
  },
  warning: {
    bg: '#FFF7ED',
    border: '#FED7AA',
    badgeBg: '#F97316',
    text: '#C2410C',
  },
}

/**
 * WarningBar — Dismissable warning bar with count badge, label, chips, and action.
 * @param {object} props
 * @param {number} props.count
 * @param {string} props.label
 * @param {Array<{id: string, label: string, color?: string, onClick?: function}>} [props.items]
 * @param {string} [props.actionLabel]
 * @param {function} [props.onAction]
 * @param {'danger'|'warning'} [props.variant='danger']
 */
export default function WarningBar({
  count,
  label,
  items = [],
  actionLabel,
  onAction,
  variant = 'danger',
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || count === 0) return null

  const v = VARIANTS[variant] || VARIANTS.danger
  const maxVisible = 7
  const visible = items.slice(0, maxVisible)
  const overflow = items.length - maxVisible

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: v.bg,
        border: `1.5px solid ${v.border}`,
        borderRadius: 10,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 22,
          height: 22,
          borderRadius: 6,
          background: v.badgeBg,
          color: 'var(--gray-0)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          padding: '0 6px',
        }}
      >
        {count}
      </span>

      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: v.text }}>
        {label}
      </span>

      {visible.map(item => (
        <button
          key={item.id}
          onClick={item.onClick}
          className="ui-chip ui-chip-button"
          style={{
            '--ui-chip-padding': '4px 10px',
            border: `1.5px solid ${v.border}`,
            background: 'var(--gray-0)',
            color: v.text,
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: item.onClick ? 'pointer' : 'default',
            gap: 5,
          }}
        >
          {item.color && (
            <span
              className="ui-dot"
              style={{ background: item.color, width: 8, height: 8 }}
            />
          )}
          {item.label}
        </button>
      ))}

      {overflow > 0 && (
        <span style={{ fontSize: 'var(--text-xs)', color: v.text, fontWeight: 500 }}>
          +{overflow} more
        </span>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="btn-danger"
            style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}
          >
            {actionLabel}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: v.text,
            fontSize: 'var(--text-sm)',
            padding: '2px 6px',
          }}
        >
          &times;
        </button>
      </div>
    </div>
  )
}
