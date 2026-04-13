'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDownIcon,
  TrashIcon,
} from '@/app/lib/icons'
import {
  TextField,
  AnchorTypeSelector,
  DayToggleGroup,
  BreakDurationField,
  StaffCountStepper,
  KeyholderBadge,
} from '@/app/components/ui'
import { resolveShiftTimes, computeShiftHours } from '@/app/lib/utils/shiftUtils'
import { decimalTimeToLabel, getDayLabel, formatHours, TIME_OPTIONS, TIME_OPTIONS_END } from '@/app/lib/timeUtils'
import { DAYS_SHORT } from '@/app/lib/constants/days'

// ── Styles ───────────────────────────────────────────────────────────────────

const BORDER_DEFAULT = '1px solid var(--gray-200)'

function TimeSelect({ value, onChange, options, disabled }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      style={{
        height: 34,
        padding: '0 8px',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        border: BORDER_DEFAULT,
        borderRadius: 8,
        color: disabled ? 'var(--gray-400)' : 'var(--gray-800)',
        background: disabled ? 'var(--gray-50)' : 'var(--gray-0)',
        outline: 'none',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: 80,
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function FieldLabel({ label }) {
  return (
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 500 }}>
      {label}
    </span>
  )
}

function AnchoredBadge({ shift, resolvedHours }) {
  const resolved = resolveShiftTimes(shift, resolvedHours)
  const anchorLabel = shift.shift_type === 'open' ? 'opening' : 'closing'

  if (resolved.varies) {
    return (
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-400)',
          fontStyle: 'italic',
          cursor: 'help',
        }}
        title={resolved.byDay.map(d =>
          `${DAYS_SHORT[d.day]}: ${decimalTimeToLabel(d.start)} - ${decimalTimeToLabel(d.end)}`
        ).join('\n')}
      >
        Anchored to {anchorLabel} (varies)
      </span>
    )
  }

  const time = shift.shift_type === 'open' ? resolved.start : resolved.end
  return (
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontStyle: 'italic' }}>
      Anchored to {anchorLabel} ({decimalTimeToLabel(time)})
    </span>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ShiftRow({
  shift,
  team,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
  resolvedHours,
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const teamColor = team?.color || 'var(--gray-400)'
  const teamColorLight = team?.colorLight || 'var(--gray-100)'

  const resolved = resolveShiftTimes(shift, resolvedHours)
  const duration = computeShiftHours(resolved.start, resolved.end)

  const handleFieldChange = useCallback((field, value) => {
    onUpdate(shift.shift_id, { [field]: value })
  }, [shift.shift_id, onUpdate])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await onUpdate(shift.shift_id, {
        shift_name: shift.shift_name,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        days: shift.days,
        break_duration: shift.break_duration,
        break_is_paid: shift.break_is_paid,
        is_keyholder: shift.is_keyholder,
        num_staff_needed: shift.num_staff_needed,
      }, true)
    } catch (err) {
      setSaveError('Failed to save')
    } finally {
      setSaving(false)
    }
  }, [shift, onUpdate])

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this shift pattern?')) return
    try {
      await onDelete(shift.shift_id)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }, [shift.shift_id, onDelete])

  // ── Collapsed Row ──────────────────────────────────────────────────────────

  const collapsedRow = (
    <button
      onClick={() => onToggle(shift.shift_id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: 12,
        padding: '12px 16px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Team color bar */}
      <div style={{ width: 4, height: 32, borderRadius: 2, background: teamColor, flexShrink: 0 }} />

      {/* Shift name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-800)' }}>
          {shift.shift_name || 'Untitled Shift'}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 2 }}>
          {team?.name || 'Unknown team'}
        </div>
      </div>

      {/* Type badge */}
      <span
        style={{
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          background: teamColorLight,
          color: teamColor,
          textTransform: 'capitalize',
        }}
      >
        {shift.shift_type || 'fixed'}
      </span>

      {/* Time */}
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--gray-500)', minWidth: 90 }}>
        {decimalTimeToLabel(resolved.start)} - {decimalTimeToLabel(resolved.end)}
        {resolved.varies && ' *'}
      </span>

      {/* Days */}
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', minWidth: 60 }}>
        {getDayLabel(shift.days)}
      </span>

      {/* Staff count */}
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', minWidth: 20, textAlign: 'center' }}>
        {shift.num_staff_needed}x
      </span>

      {/* Keyholder */}
      {shift.is_keyholder && <KeyholderBadge variant="default" />}

      {/* Chevron */}
      <ChevronDownIcon
        className="w-4 h-4"
        style={{
          color: 'var(--gray-300)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform .15s',
        }}
      />
    </button>
  )

  // ── Expanded Edit Form ─────────────────────────────────────────────────────

  const expandedForm = isOpen && (
    <div style={{ padding: '0 16px 16px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 1: Name + Team pill + Anchor type */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <FieldLabel label="Shift name" />
          <TextField
            value={shift.shift_name || ''}
            onChange={v => handleFieldChange('shift_name', v)}
            size="sm"
            placeholder="e.g. Morning Open"
          />
        </div>
        <div>
          <FieldLabel label="Team" />
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: teamColorLight,
              color: teamColor,
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
            }}
          >
            {team?.name || '—'}
          </div>
        </div>
        <div>
          <FieldLabel label="Anchor type" />
          <AnchorTypeSelector
            value={shift.shift_type || 'fixed'}
            onChange={v => handleFieldChange('shift_type', v)}
          />
        </div>
      </div>

      {/* Row 2: Times */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <FieldLabel label="Start time" />
          {shift.shift_type === 'open' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--gray-50)',
                color: 'var(--gray-400)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                border: '1.5px solid var(--gray-100)',
              }}>
                {decimalTimeToLabel(resolved.start)}
              </div>
              <AnchoredBadge shift={shift} resolvedHours={resolvedHours} />
            </div>
          ) : (
            <TimeSelect
              value={shift.start_time}
              onChange={v => handleFieldChange('start_time', v)}
              options={TIME_OPTIONS}
            />
          )}
        </div>

        <div>
          <FieldLabel label="End time" />
          {shift.shift_type === 'close' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--gray-50)',
                color: 'var(--gray-400)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                border: '1.5px solid var(--gray-100)',
              }}>
                {decimalTimeToLabel(resolved.end)}
              </div>
              <AnchoredBadge shift={shift} resolvedHours={resolvedHours} />
            </div>
          ) : (
            <TimeSelect
              value={shift.end_time}
              onChange={v => handleFieldChange('end_time', v)}
              options={TIME_OPTIONS_END}
            />
          )}
        </div>

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', alignSelf: 'center' }}>
          {formatHours(duration)} shift
        </div>
      </div>

      {/* Row 3: Days */}
      <div>
        <FieldLabel label="Days" />
        <DayToggleGroup
          days={shift.days || []}
          onChange={v => handleFieldChange('days', v)}
          color={teamColor}
        />
      </div>

      {/* Row 4: Break + Staff + Keyholder */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <FieldLabel label="Break" />
          <BreakDurationField
            duration={shift.break_duration ?? 0}
            isPaid={shift.break_is_paid ?? false}
            onDurationChange={v => handleFieldChange('break_duration', v)}
            onPaidChange={v => handleFieldChange('break_is_paid', v)}
          />
        </div>

        <div>
          <FieldLabel label="Staff needed" />
          <StaffCountStepper
            value={shift.num_staff_needed ?? 1}
            onChange={v => handleFieldChange('num_staff_needed', v)}
          />
        </div>

        <div>
          <FieldLabel label="Keyholder" />
          <button
            onClick={() => handleFieldChange('is_keyholder', !shift.is_keyholder)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              border: shift.is_keyholder ? '2px solid var(--pink-500)' : BORDER_DEFAULT,
              background: shift.is_keyholder ? 'var(--pink-50)' : 'var(--gray-0)',
              color: shift.is_keyholder ? 'var(--pink-500)' : 'var(--gray-400)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <KeyholderBadge variant={shift.is_keyholder ? 'default' : 'light'} color={shift.is_keyholder ? 'var(--pink-500)' : 'var(--gray-300)'} />
            {shift.is_keyholder ? 'Required' : 'Not required'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid var(--gray-100)' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ fontSize: 'var(--text-xs)', padding: '8px 20px' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        <button
          onClick={handleDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            color: 'var(--red-500)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <TrashIcon className="w-3.5 h-3.5" />
          Delete
        </button>

        {saveError && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--red-500)' }}>{saveError}</span>
        )}
      </div>
    </div>
  )

  return (
    <div
      style={{
        border: isOpen ? `2px solid ${teamColor}` : '1.5px solid var(--gray-100)',
        borderRadius: 12,
        background: 'var(--gray-0)',
        overflow: 'hidden',
        transition: 'border-color .15s',
      }}
    >
      {collapsedRow}
      {expandedForm}
    </div>
  )
}
