'use client'

import Chip from './Chip'
import ChipButton from './ChipButton'

/**
 * FilterBar — Generic filter bar with chip-based items.
 * @param {object} props
 * @param {Array<{id: string, label: string, count?: number, color?: string, colorLight?: string}>} props.items
 * @param {string|null} props.activeId — Currently selected item id, or null for "All"
 * @param {function} props.onSelect — Called with item id or null
 * @param {string} [props.allLabel='All Teams'] — Label for the "all" chip
 * @param {number} [props.allCount] — Count shown on the "all" chip
 * @param {React.ReactNode} [props.rightSlot] — Content for the right side (e.g. "+ Add" button)
 */
export default function FilterBar({
  items = [],
  activeId,
  onSelect,
  allLabel = 'All Teams',
  allCount,
  rightSlot,
}) {
  const allSelected = activeId === null || activeId === undefined

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <ChipButton
        selected={allSelected}
        onClick={() => onSelect(null)}
        label={allCount != null ? `${allLabel} (${allCount})` : allLabel}
        color="var(--gray-700)"
        colorLight="var(--gray-100)"
      />

      {items.map(item => (
        <ChipButton
          key={item.id}
          selected={activeId === item.id}
          onClick={() => onSelect(item.id)}
          label={item.count != null ? `${item.label} (${item.count})` : item.label}
          color={item.color || 'var(--gray-700)'}
          colorLight={item.colorLight || 'var(--gray-100)'}
        />
      ))}

      {rightSlot && (
        <div style={{ marginLeft: 'auto' }}>
          {rightSlot}
        </div>
      )}
    </div>
  )
}
