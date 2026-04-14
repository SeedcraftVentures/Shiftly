'use client'

import { KeyholderIcon } from '@/app/lib/icons'

/**
 * KeyholderBadge — Badge indicating keyholder status.
 * @param {object} props
 * @param {'default'|'light'} [props.variant='default'] — Visual variant
 * @param {string} [props.color='var(--shiftly-pink)'] — Badge accent color
 */
export default function KeyholderBadge({ variant = 'default', color = 'var(--shiftly-pink)' }) {
  const isLight = variant === 'light'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        letterSpacing: '0.5px',
        background: isLight ? 'rgba(255,255,255,0.15)' : color,
        color: isLight ? 'var(--gray-0)' : 'var(--gray-0)',
        border: isLight ? '1px solid rgba(255,255,255,0.25)' : 'none',
      }}
    >
      <KeyholderIcon className="w-3 h-3" />
      KEY
    </span>
  )
}
