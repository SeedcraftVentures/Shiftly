'use client'

import { CheckIcon } from '@/app/lib/icons'

export default function ChipButton({ selected, onClick, label, color, colorLight, style }) {
  return (
    <button
      className="ui-chip ui-chip-button"
      onClick={onClick}
      style={{
        '--ui-chip-padding': '8px 16px',
        border: selected ? `2px solid ${color}` : '1.5px solid var(--gray-200)',
        background: selected ? colorLight : 'var(--gray-50)',
        color: selected ? color : 'var(--gray-500)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        gap: 6,
        ...style,
      }}
    >
      {selected && (
        <div
          className="ui-square-badge"
          style={{ background: color, color: 'var(--gray-0)' }}
        >
          <CheckIcon size={9} />
        </div>
      )}
      {label}
    </button>
  )
}
