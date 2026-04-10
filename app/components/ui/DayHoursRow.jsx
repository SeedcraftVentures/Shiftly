'use client'

import { TIME_OPTIONS } from '@/app/lib/timeUtils'
import { CheckIcon } from '@/app/lib/icons'
import CopyToPopover from './CopyToPopover'

function TimeSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        height: 34,
        padding: '0 8px',
        borderRadius: 8,
        border: `1px solid ${disabled ? 'var(--gray-100)' : 'var(--gray-200)'}`,
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: disabled ? 'var(--gray-300)' : 'var(--gray-900)',
        background: disabled ? 'var(--gray-50)' : 'var(--gray-0)',
        outline: 'none',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer',
        minWidth: 80,
      }}
    >
      {TIME_OPTIONS.map(t => (
        <option key={t.value} value={t.label}>{t.label}</option>
      ))}
    </select>
  )
}

export default function DayHoursRow({ day, data, onChange, onCopyTo }) {
  const columnCenterStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  }

  const hoursSelectStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'column',
  }

  const labelStyle = {
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: 0.4,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 10,
        marginBottom: 5,
        background: data.open ? 'var(--gray-0)' : 'var(--gray-50)',
        border: `1px solid ${data.open ? 'var(--gray-200)' : 'var(--gray-100)'}`,
        opacity: data.open ? 1 : 0.6,
      }}
    >
      {/* Day toggle */}
      <button
        onClick={() => onChange({ ...data, open: !data.open })}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          background: data.open ? 'var(--pink-500)' : 'var(--gray-200)',
          color: 'var(--gray-0)',
          cursor: 'pointer',
          transition: 'all .1s',
        }}
      >
        {data.open && <CheckIcon size={11} />}
      </button>

      {/* Day label */}
      <span
        style={{
          width: 36,
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: data.open ? 'var(--gray-900)' : 'var(--gray-400)',
          flexShrink: 0,
        }}
      >
        {day.slice(0, 3)}
      </span>

      {data.open ? (
        <>
          {/* Open / Close */}
          <div style={hoursSelectStyle}>
            <div style={columnCenterStyle}>
              <span style={{ ...labelStyle, color: 'var(--gray-400)' }}>OPEN FOR PUBLIC</span>
              <TimeSelect value={data.opening} onChange={v => onChange({ ...data, opening: v })} />
            </div>
            <span style={{ color: 'var(--gray-300)', fontSize: 'var(--text-xs)' }}>&darr;</span>
            <div style={columnCenterStyle}>
              <span style={{ ...labelStyle, color: 'var(--gray-400)' }}>CLOSED FOR PUBLIC</span>
              <TimeSelect value={data.closing} onChange={v => onChange({ ...data, closing: v })} />
            </div>
          </div>

          {/* First shift / Last shift */}
          <div style={hoursSelectStyle}>
            <div style={columnCenterStyle}>
              <span style={{ ...labelStyle, color: 'var(--team-purple)' }}>FIRST SHIFT START</span>
              <TimeSelect value={data.first_shift} onChange={v => onChange({ ...data, first_shift: v })} />
            </div>
            <span style={{ color: 'var(--gray-300)', fontSize: 'var(--text-xs)' }}>&darr;</span>
            <div style={columnCenterStyle}>
              <span style={{ ...labelStyle, color: 'var(--team-purple)' }}>LAST SHIFT END</span>
              <TimeSelect value={data.last_shift} onChange={v => onChange({ ...data, last_shift: v })} />
            </div>
          </div>

          {/* Copy to */}
          <CopyToPopover sourceDay={day} onCopy={onCopyTo} />
        </>
      ) : (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontStyle: 'italic', flex: 1 }}>
          Closed
        </span>
      )}
    </div>
  )
}
