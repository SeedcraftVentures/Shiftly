'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckIcon } from '@/app/lib/icons'
import CopyToPopover from './CopyToPopover'

const TRACK_START = 0
const TRACK_END = 24
const TRACK_SPAN = TRACK_END - TRACK_START

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

function timeStringToDecimal(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(n => parseInt(n, 10))
  return h + (m || 0) / 60
}

function pct(decimal) {
  return `${((decimal - TRACK_START) / TRACK_SPAN) * 100}%`
}

// ── Inline time editor ─────────────────────────────────────────────────────

function InlineTimeEditor({ value, onChange, onClose, color }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <select
      ref={ref}
      value={value}
      onChange={e => {
        onChange(e.target.value)
        onClose()
      }}
      onBlur={onClose}
      autoFocus
      style={{
        padding: '4px 6px',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        border: '1.5px solid var(--shiftly-pink)',
        borderRadius: 6,
        color,
        background: 'var(--gray-0)',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {TIME_OPTIONS.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}

// ── Time label (click to edit) ─────────────────────────────────────────────

function TimeLabel({ value, onChange, color, editing, onEditStart, onEditEnd, disabled }) {
  if (editing) {
    return <InlineTimeEditor value={value} onChange={onChange} onClose={onEditEnd} color={color} />
  }
  return (
    <button
      onClick={disabled ? undefined : onEditStart}
      disabled={disabled}
      style={{
        padding: '2px 6px',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        color,
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {value}
    </button>
  )
}

// ── Bar ────────────────────────────────────────────────────────────────────

function HoursBar({
  label,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  fillColor,
  textColor,
  editingField,
  onEditStart,
  onEditEnd,
  disabled,
  dimmed,
}) {
  const startDec = timeStringToDecimal(startTime)
  const endDec = timeStringToDecimal(endTime)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: dimmed ? 0.45 : 1 }}>
      <div
        style={{
          width: 68,
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--gray-400)',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          flexShrink: 0,
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          height: 26,
          background: 'var(--gray-50)',
          borderRadius: 6,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: pct(startDec),
            width: `${((endDec - startDec) / TRACK_SPAN) * 100}%`,
            background: fillColor,
            borderRadius: 6,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: 130,
          flexShrink: 0,
          justifyContent: 'flex-end',
        }}
      >
        <TimeLabel
          value={startTime}
          onChange={onStartChange}
          color={textColor}
          editing={editingField === 'start'}
          onEditStart={() => onEditStart('start')}
          onEditEnd={onEditEnd}
          disabled={disabled}
        />
        <span style={{ color: 'var(--gray-300)', fontSize: 'var(--text-xs)' }}>→</span>
        <TimeLabel
          value={endTime}
          onChange={onEndChange}
          color={textColor}
          editing={editingField === 'end'}
          onEditStart={() => onEditStart('end')}
          onEditEnd={onEditEnd}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string} props.day - Day name (e.g. "Monday")
 * @param {object} props.data - { open, opening, closing, first_shift, last_shift }
 * @param {function} props.onChange - Called with updated data
 * @param {function} [props.onCopyTo] - Called with copy target (only in location mode)
 * @param {'location'|'team'} [props.mode='location'] - Display mode
 * @param {boolean} [props.inherited] - (team mode) Is this day inheriting from location?
 * @param {object} [props.inheritedFrom] - (team mode) Location hours to show when inherited
 * @param {function} [props.onToggleInherit] - (team mode) Called to toggle inherit/override
 */
export default function DayHoursGantt({
  day,
  data,
  onChange,
  onCopyTo,
  mode = 'location',
  inherited = false,
  inheritedFrom = null,
  onToggleInherit,
}) {
  const [editing, setEditing] = useState(null)
  const isTeamMode = mode === 'team'

  // In team mode when inherited, show the location's staff hours but dimmed and read-only
  const displayData = isTeamMode && inherited && inheritedFrom ? inheritedFrom : data

  const update = (field, value) => onChange({ ...data, [field]: value })
  const isEditing = (bar, field) => editing === `${bar}-${field}`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        border: '1.5px solid var(--gray-100)',
        borderRadius: 10,
        marginBottom: 8,
        background: 'var(--gray-0)',
      }}
    >
      {/* Open checkbox — only in location mode */}
      {!isTeamMode && (
        <button
          onClick={() => update('open', !data.open)}
          aria-label={data.open ? 'Mark closed' : 'Mark open'}
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            border: '1.5px solid',
            borderColor: data.open ? 'var(--shiftly-pink)' : 'var(--gray-200)',
            background: data.open ? 'var(--shiftly-pink)' : 'var(--gray-0)',
            color: 'var(--gray-0)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all .1s',
          }}
        >
          {data.open && <CheckIcon size={11} />}
        </button>
      )}

      {/* Day label */}
      <span
        style={{
          width: 36,
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: data.open || isTeamMode ? 'var(--gray-900)' : 'var(--gray-400)',
          flexShrink: 0,
        }}
      >
        {day.slice(0, 3)}
      </span>

      {(isTeamMode || data.open) ? (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Public bar — location mode only */}
            {!isTeamMode && (
              <HoursBar
                label="Public"
                startTime={displayData.opening}
                endTime={displayData.closing}
                onStartChange={v => update('opening', v)}
                onEndChange={v => update('closing', v)}
                fillColor="var(--shiftly-pink-light)"
                textColor="var(--shiftly-pink)"
                editingField={isEditing('public', 'start') ? 'start' : isEditing('public', 'end') ? 'end' : null}
                onEditStart={field => setEditing(`public-${field}`)}
                onEditEnd={() => setEditing(null)}
              />
            )}

            {/* Staff bar — both modes */}
            <HoursBar
              label={isTeamMode ? 'Team' : 'Staff'}
              startTime={displayData.first_shift}
              endTime={displayData.last_shift}
              onStartChange={v => update('first_shift', v)}
              onEndChange={v => update('last_shift', v)}
              fillColor="var(--team-purple)"
              textColor="var(--team-purple)"
              editingField={isEditing('staff', 'start') ? 'start' : isEditing('staff', 'end') ? 'end' : null}
              onEditStart={field => setEditing(`staff-${field}`)}
              onEditEnd={() => setEditing(null)}
              disabled={isTeamMode && inherited}
              dimmed={isTeamMode && inherited}
            />
          </div>

          {/* Right-side action */}
          {isTeamMode ? (
            <button
              onClick={onToggleInherit}
              style={{
                padding: '6px 10px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: inherited ? 'var(--gray-500)' : 'var(--shiftly-pink)',
                background: inherited ? 'var(--gray-50)' : 'var(--shiftly-pink-light)',
                border: `1.5px solid ${inherited ? 'var(--gray-200)' : 'var(--shiftly-pink-light)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {inherited ? 'Override' : 'Reset'}
            </button>
          ) : (
            onCopyTo && <CopyToPopover sourceDay={day} onCopy={onCopyTo} />
          )}
        </>
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-400)',
            fontStyle: 'italic',
          }}
        >
          Closed
        </span>
      )}
    </div>
  )
}