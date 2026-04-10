'use client'

import { useState } from 'react'
import { DAYS_FULL } from '@/app/lib/constants'

export default function CopyToPopover({ sourceDay, onCopy }) {
  const [open, setOpen] = useState(false)

  const popoverStyle = {
    position: 'absolute',
    right: 0,
    top: 30,
    zIndex: 20,
    background: 'var(--gray-0)',
    border: '1px solid var(--gray-200)',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    minWidth: 120,
  }

  const itemStyle = {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  }

  const handle = (target) => {
    onCopy(target)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          height: 26,
          padding: '0 8px',
          borderRadius: 6,
          border: '1px solid var(--gray-200)',
          background: 'var(--gray-50)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--gray-500)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Copy to
      </button>

      {open && (
        <div style={popoverStyle}>
          <button
            onClick={() => handle('all')}
            style={{ ...itemStyle, color: 'var(--pink-500)', borderBottom: '1px solid var(--gray-100)' }}
          >
            All days
          </button>
          <button
            onClick={() => handle('weekdays')}
            style={{ ...itemStyle, color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-100)' }}
          >
            Weekdays
          </button>
          <button
            onClick={() => handle('weekends')}
            style={{ ...itemStyle, color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-100)' }}
          >
            Weekends
          </button>
          {DAYS_FULL.filter(d => d !== sourceDay).map(d => (
            <button
              key={d}
              onClick={() => handle(d)}
              style={{ ...itemStyle, padding: '7px 12px', color: 'var(--gray-700)' }}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
