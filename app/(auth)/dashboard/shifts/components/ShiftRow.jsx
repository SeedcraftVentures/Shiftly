'use client'

import { useState } from 'react'
import {
  LockClosedIcon,
  LockOpenIcon,
  KeyholderIcon,
  TrashIcon,
} from '@/app/lib/icons'
import {
  TIME_OPTIONS,
  TIME_OPTIONS_END,
  getDayLabel,
  formatHours,
  decimalTimeToLabel as decimalToLabel,
  DAYS_SHORT as DAYS,
} from '@/app/lib/timeUtils'
import {
  DEFAULT_SHIFT_LENGTHS,
  getPaidHours,
  getOnSiteHours,
  applyTimeChange,
} from '@/app/lib/shiftUtils'

// ── Typography scale ─────────────────────────────────────────────────────────
const FONT_BODY = 'Plus Jakarta Sans'

// ── Repeated style variables ──────────────────────────────────────────────────
const INPUT_H = 34
const BORDER_DEFAULT = '1px solid var(--gray-200)'
const BORDER_LIGHT = '1px solid var(--gray-100)'
const BORDER_RADIUS = 8

const flexRowCenter = {
  display: 'flex',
  alignItems: 'center',
}

const flexColCenter = {
  display: 'flex',
  flexDirection: 'column',
}

// ── Universal pill toggle ─────────────────────────────────────────────────────

function PillToggle({ active, onClick, children, activeColor = 'var(--pink-accent)', disabled = false, size = 'md' }) {
  const heights = { sm: 26, md: 32 }
  const pads = { sm: '0 9px', md: '0 13px' }
  const sizes = { sm: 'var(--text-xs)', md: 'var(--text-xs)' }
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        height: heights[size],
        padding: pads[size],
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: active ? 'none' : BORDER_DEFAULT,
        background: active ? activeColor : 'var(--gray-50)',
        color: active ? 'var(--gray-0)' : 'var(--gray-500)',
        fontSize: sizes[size],
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        gap: 5,
        flexShrink: 0,
        fontFamily: FONT_BODY,
      }}
    >
      {children}
    </button>
  )
}

// ── Lock pill ─────────────────────────────────────────────────────────────────

function LockPill({ locked, onClick, color, autoLocked = false }) {
  return (
    <button
      onClick={autoLocked ? undefined : onClick}
      style={{
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: locked ? 'none' : BORDER_DEFAULT,
        background: locked ? color : 'var(--gray-50)',
        color: locked ? 'var(--gray-0)' : 'var(--gray-400)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        cursor: autoLocked ? 'default' : 'pointer',
        gap: 4,
        flexShrink: 0,
        fontFamily: FONT_BODY,
      }}
    >
      {locked ? (
        <LockClosedIcon className="w-2 h-2" strokeWidth={2} />
      ) : (
        <LockOpenIcon className="w-2 h-2" strokeWidth={1.4} />
      )}
      {locked ? 'Locked' : 'Lock'}
    </button>
  )
}

// ── Field components ──────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: 'var(--gray-400)',
        marginBottom: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        minHeight: 18,
      }}
    >
      {children}
    </div>
  )
}

function Sel({ value, options, onChange, disabled }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={e => {
        const raw = e.target.value
        const parsed = parseFloat(raw)
        onChange(isNaN(parsed) ? raw : parsed)
      }}
      style={{
        height: INPUT_H,
        width: '100%',
        padding: '0 10px',
        borderRadius: BORDER_RADIUS,
        border: disabled ? BORDER_LIGHT : BORDER_DEFAULT,
        color: disabled ? 'var(--gray-400)' : 'var(--gray-900)',
        background: disabled ? 'var(--gray-50)' : 'var(--gray-0)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        fontFamily: FONT_BODY,
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    >
      {options.map(o => {
        const v = typeof o === 'object' ? o.value : o
        const l = typeof o === 'object' ? o.label : o
        return (
          <option key={v} value={v}>
            {l}
          </option>
        )
      })}
    </select>
  )
}

function LockedDisplay({ value }) {
  return (
    <div
      style={{
        height: INPUT_H,
        width: '100%',
        padding: '0 10px',
        borderRadius: BORDER_RADIUS,
        background: 'var(--gray-50)',
        border: BORDER_LIGHT,
        color: 'var(--gray-400)',
        display: 'flex',
        alignItems: 'center',
        fontWeight: 500,
        fontSize: 'var(--text-xs)',
        fontFamily: FONT_BODY,
        boxSizing: 'border-box',
      }}
    >
      {value}
    </div>
  )
}

function NumInput({ value, onChange, min = 1, max = 20 }) {
  const buttonStyle = {
    border: BORDER_DEFAULT,
    cursor: 'pointer',
  }
  const displayStyle = {
    borderTop: BORDER_DEFAULT,
    borderBottom: BORDER_DEFAULT,
    fontFamily: FONT_BODY,
  }
  return (
    <div style={{ ...flexRowCenter }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          ...buttonStyle,
          width: 32,
          height: INPUT_H,
          borderTopLeftRadius: BORDER_RADIUS,
          borderBottomLeftRadius: BORDER_RADIUS,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          background: 'var(--gray-0)',
          color: 'var(--gray-700)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
        }}
      >
        −
      </button>
      <div style={{
        ...displayStyle,
        width: 42,
        height: INPUT_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-0)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
      }}>{value}</div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          ...buttonStyle,
          width: 32,
          height: INPUT_H,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: BORDER_RADIUS,
          borderBottomRightRadius: BORDER_RADIUS,
          background: 'var(--gray-0)',
          color: 'var(--gray-700)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
        }}
      >
        +
      </button>
    </div>
  )
}

// ── Segmented toggle — Paid / Unpaid ──────────────────────────────────────────

function SegmentedToggle({ value, options, onChange, disabled, activeColor }) {
  return (
    <div
      style={{
        flexShrink: 0,
        border: BORDER_DEFAULT,
        opacity: disabled ? 0.45 : 1,
        height: INPUT_H,
        borderRadius: BORDER_RADIUS,
        overflow: 'hidden',
        display: 'inline-flex',
      }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => !disabled && onChange(opt.value)}
          style={{
            height: '100%',
            padding: '0 12px',
            border: 'none',
            borderLeft: i > 0 ? BORDER_DEFAULT : 'none',
            background: value === opt.value ? (activeColor || 'var(--pink-accent)') : 'var(--gray-0)',
            color: value === opt.value ? 'var(--gray-0)' : 'var(--gray-500)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: FONT_BODY,
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Day toggles ───────────────────────────────────────────────────────────────

function DayToggles({ days, onChange, color }) {
  const quickButtonStyle = {
    padding: '3px 10px',
    height: 26,
    border: BORDER_DEFAULT,
    background: 'var(--gray-50)',
    color: 'var(--gray-500)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: FONT_BODY,
  }
  const dayButtonStyle = {
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT_BODY,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          ['All', [0, 1, 2, 3, 4, 5, 6]],
          ['Weekdays', [0, 1, 2, 3, 4]],
          ['Weekends', [5, 6]],
        ].map(([label, d]) => (
          <button key={label} onClick={() => onChange(d)} style={{
            ...quickButtonStyle,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {DAYS.map((d, di) => (
          <button
            key={d}
            onClick={() => {
              const newDays = days.includes(di)
                ? days.filter(x => x !== di)
                : [...days, di].sort((a, b) => a - b)
              onChange(newDays)
            }}
            style={{
              ...dayButtonStyle,
              width: 30,
              height: 28,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              background: days.includes(di) ? color : 'var(--gray-100)',
              color: days.includes(di) ? 'var(--gray-0)' : 'var(--gray-400)',
            }}
          >
            {d.slice(0, 2)}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Key badge ─────────────────────────────────────────────────────────────────

function KeyBadge({ color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 18,
        padding: '0 6px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        background: color + '22',
        color,
      }}
    >
      KEY
    </span>
  )
}

export function KeyBadgeLight() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 18,
        padding: '0 6px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        background: 'rgba(255,255,255,0.3)',
        color: 'var(--gray-0)',
      }}
    >
      KEY
    </span>
  )
}

// ── Arrow divider ─────────────────────────────────────────────────────────────

function Arrow() {
  return (
    <div
      style={{
        color: 'var(--gray-300)',
        fontSize: 'var(--text-sm)',
        flexShrink: 0,
        height: INPUT_H,
        ...flexRowCenter,
        userSelect: 'none',
        marginTop: 23,
      }}
    >
      →
    </div>
  )
}

// ── ShiftRow ──────────────────────────────────────────────────────────────────

export default function ShiftRow({
  shift, teams, teamColor, isOpen, onToggle,
  onUpdate, onDelete, fixedLock, onSetFixedLock,
  shiftLengths, openTime, closeTime,
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const shiftLen = Math.round((shift.end - shift.start) * 100) / 100
  const paidHours = getPaidHours(shift.start, shift.end)
  const onSiteHours = getOnSiteHours(shift.start, shift.end, shift.break_duration_mins, shift.break_type)
  const dayLabel = getDayLabel(shift.days)
  const shortDayLabel = dayLabel.length > 14 ? `${shift.days.length}d` : dayLabel
  const isAutoKey = shift.anchor_type === 'open' || shift.anchor_type === 'close'
  const hasUnpaidBreak = shift.break_duration_mins > 0 && shift.break_type === 'unpaid'
  const isOpenType = shift.anchor_type === 'open'
  const isCloseType = shift.anchor_type === 'close'
  const isFixed = shift.anchor_type === 'fixed'
  const startLocked = isOpenType || (isFixed && fixedLock === 'start')
  const endLocked = isCloseType || (isFixed && fixedLock === 'end')
  const lenLocked = isFixed && fixedLock === 'length'

  const displayEnd = shift.break_type === 'unpaid' && shift.break_duration_mins > 0
    ? shift.end + shift.break_duration_mins / 60
    : shift.end

  const allLengths = [...new Set([...DEFAULT_SHIFT_LENGTHS, ...(shiftLengths || []), shiftLen])].filter(l => l > 0).sort((a, b) => a - b)
  const lenOptions = allLengths.map(l => ({
    value: l,
    label: DEFAULT_SHIFT_LENGTHS.includes(l) || shiftLengths?.includes(l) ? `${l}h` : `${l}h (custom)`,
  }))

  const up = (field, val) => {
    let updated = { ...shift, [field]: val }
    if (field === 'anchor_type') {
      if (val === 'open' || val === 'close') updated.keyholder = true
      if (val === 'open') updated.start = openTime
      if (val === 'close') updated.end = closeTime
    }
    onUpdate(shift.id, updated, false)
  }

  const upTime = (field, val) => {
    const { start, end } = applyTimeChange(shift, fixedLock, field, val, openTime, closeTime)
    onUpdate(shift.id, { ...shift, start, end }, false)
  }

  const toggleFixedLock = (field) => {
    if (!isFixed) return
    onSetFixedLock(shift.id, fixedLock === field ? 'start' : field)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try { await onUpdate(shift.id, shift, true) }
    catch { setSaveError('Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this shift pattern? This cannot be undone.')) return
    try { await onDelete(shift.id) }
    catch { setSaveError('Delete failed') }
  }

  return (
    <div
      style={{
        background: 'var(--gray-0)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isOpen ? `0 10px 24px ${teamColor}14` : '0 1px 4px rgba(0,0,0,0.03)',
        transition: 'box-shadow .15s, border-color .15s',
        border: `1px solid ${isOpen ? teamColor + '55' : 'var(--gray-200)'}`,
      }}
    >
      {/* ── Collapsed row ── */}
      <div
        onClick={onToggle}
        style={{
          ...flexRowCenter,
          cursor: 'pointer',
          minHeight: 46,
        }}
      >
        <div
          style={{
            width: 5,
            alignSelf: 'stretch',
            flexShrink: 0,
            background: teamColor,
          }}
        />
        <div
          style={{
            flex: 1,
            ...flexRowCenter,
            gap: 7,
            padding: '10px 14px',
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--gray-900)',
              whiteSpace: 'nowrap',
              fontFamily: FONT_BODY,
            }}
          >
            {shift.name}
          </span>
          {shift.keyholder && <KeyBadge color={teamColor} />}
        </div>
        <span
          style={{
            padding: '5px 10px',
            borderRadius: 999,
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            flexShrink: 0,
            background: teamColor + '18',
            color: teamColor,
            fontFamily: FONT_BODY,
          }}
        >
          {shift.anchor_type.charAt(0).toUpperCase() + shift.anchor_type.slice(1)}
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-700)',
            fontWeight: 500,
            width: 124,
            textAlign: 'center',
            flexShrink: 0,
            fontFamily: FONT_BODY,
          }}
        >
          {decimalToLabel(shift.start)} – {decimalToLabel(displayEnd)}
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            width: 76,
            textAlign: 'center',
            flexShrink: 0,
            fontFamily: FONT_BODY,
          }}
        >
          {shortDayLabel}
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-700)',
            width: 38,
            textAlign: 'center',
            flexShrink: 0,
            fontFamily: FONT_BODY,
          }}
        >
          x{shift.staff}
        </span>
        <div
          style={{
            width: 30,
            ...flexRowCenter,
            justifyContent: 'center',
            color: 'var(--gray-400)',
            fontSize: 'var(--text-xs)',
            marginRight: 6,
            flexShrink: 0,
            transition: 'transform .15s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </div>
      </div>

      {/* ── Expanded ── */}
      {isOpen && (
        <div
          style={{
            borderTop: `1px solid ${teamColor}22`,
            padding: '16px 20px 18px',
            background: teamColor + '05',
          }}
        >
          {/* Row 1: Name / Team / Type / Staff */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1.2fr 1fr 1fr',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                value={shift.name}
                onChange={e => up('name', e.target.value)}
                maxLength={40}
                style={{
                  height: INPUT_H,
                  width: '100%',
                  padding: '0 10px',
                  borderRadius: BORDER_RADIUS,
                  border: BORDER_DEFAULT,
                  background: 'var(--gray-0)',
                  color: 'var(--gray-900)',
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <FieldLabel>Team</FieldLabel>
              <Sel
                value={shift.team_id}
                options={(teams || []).map(t => ({ value: t.id, label: t.team_name }))}
                onChange={v => up('team_id', parseInt(v))}
              />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Sel
                value={shift.anchor_type}
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'close', label: 'Close' },
                  { value: 'fixed', label: 'Fixed' },
                ]}
                onChange={v => up('anchor_type', v)}
              />
            </div>
            <div>
              <FieldLabel>Staff Needed</FieldLabel>
              <NumInput value={shift.staff} onChange={v => up('staff', v)} />
            </div>
          </div>

          {/* Row 2: Equation — Start → Length → Break + toggle → End */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              marginBottom: 14,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel>
                Start
                {isOpenType ? <LockPill locked autoLocked color={teamColor} /> : null}
                {isFixed ? (
                  <LockPill
                    locked={fixedLock === 'start'}
                    onClick={() => toggleFixedLock('start')}
                    color={teamColor}
                  />
                ) : null}
              </FieldLabel>
              {startLocked ? (
                <LockedDisplay value={decimalToLabel(shift.start)} />
              ) : (
                <Sel value={shift.start} options={TIME_OPTIONS} onChange={v => upTime('start', v)} />
              )}
            </div>

            <Arrow />

            <div style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel>
                Length
                {isFixed ? (
                  <LockPill
                    locked={fixedLock === 'length'}
                    onClick={() => toggleFixedLock('length')}
                    color={teamColor}
                  />
                ) : null}
              </FieldLabel>
              <Sel
                value={shiftLen}
                options={lenOptions}
                onChange={v => upTime('length', v)}
                disabled={lenLocked}
              />
            </div>

            <Arrow />

            <div style={{ flex: 2, minWidth: 0 }}>
              <FieldLabel>Break</FieldLabel>
              <div
                style={{
                  display: 'flex',
                  gap: 5,
                  height: INPUT_H,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Sel
                    value={shift.break_duration_mins}
                    options={[
                      { value: 0, label: 'None' },
                      { value: 15, label: '15 min' },
                      { value: 20, label: '20 min' },
                      { value: 30, label: '30 min' },
                      { value: 45, label: '45 min' },
                      { value: 60, label: '1 hour' },
                    ]}
                    onChange={v => up('break_duration_mins', v)}
                  />
                </div>
                <SegmentedToggle
                  value={shift.break_type}
                  options={[
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                  onChange={v => up('break_type', v)}
                  disabled={shift.break_duration_mins === 0}
                  activeColor={teamColor}
                />
              </div>
            </div>

            <Arrow />

            <div style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel>
                End
                {isCloseType ? <LockPill locked autoLocked color={teamColor} /> : null}
                {isFixed ? (
                  <LockPill
                    locked={fixedLock === 'end'}
                    onClick={() => toggleFixedLock('end')}
                    color={teamColor}
                  />
                ) : null}
              </FieldLabel>
              {endLocked ? (
                <LockedDisplay value={decimalToLabel(shift.end)} />
              ) : (
                <Sel value={shift.end} options={TIME_OPTIONS_END} onChange={v => upTime('end', v)} />
              )}
            </div>
          </div>

          {/* Row 3: Keyholder + Days */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 20,
              marginBottom: 14,
              alignItems: 'start',
            }}
          >
            <div>
              <FieldLabel>Keyholder</FieldLabel>
              <PillToggle
                active={shift.keyholder}
                onClick={isAutoKey ? undefined : () => up('keyholder', !shift.keyholder)}
                activeColor={teamColor}
                disabled={isAutoKey}
                size="md"
              >
                <KeyholderIcon className="w-2.5 h-2.5" />
                {shift.keyholder ? 'Required' : 'Not required'}
                {isAutoKey && <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>auto</span>}
              </PillToggle>
            </div>
            <div>
              <FieldLabel>Days</FieldLabel>
              <DayToggles days={shift.days} onChange={v => up('days', v)} color={teamColor} />
            </div>
          </div>

          {/* Row 4: Summary + Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: `1px solid ${teamColor}15`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-700)', fontFamily: FONT_BODY }}>
                <span style={{ color: 'var(--gray-400)', fontSize: 'var(--text-xs)' }}>Paid: </span>
                <span style={{ fontWeight: 700 }}>{formatHours(paidHours)}</span>
              </span>
              {hasUnpaidBreak && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontFamily: FONT_BODY }}>
                  On-site: {formatHours(onSiteHours)}
                </span>
              )}
              {saveError && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--red-500)', fontFamily: FONT_BODY }}>
                  {saveError}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `1px solid var(--red-200)`,
                  background: 'var(--red-50)',
                  color: 'var(--red-500)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  gap: 6,
                  fontFamily: FONT_BODY,
                  cursor: 'pointer',
                }}
              >
                <TrashIcon className="w-3 h-3" strokeWidth={1.5} />
                Delete
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 22px',
                  borderRadius: 999,
                  border: 'none',
                  background: saving ? 'var(--gray-100)' : 'var(--pink-accent)',
                  color: saving ? 'var(--gray-400)' : 'var(--gray-0)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  fontFamily: FONT_BODY,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}