'use client'

import { useState } from 'react'
import {
  DAYS,
  TIME_OPTIONS,
  TIME_OPTIONS_END,
  DEFAULT_SHIFT_LENGTHS,
  decimalToLabel,
  getDayLabel,
  getPaidHours,
  getOnSiteHours,
  formatHours,
  applyTimeChange,
} from '../utils/shifthelpers'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function LockClosedIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 16" fill="currentColor">
      <path d="M12 7h-1V5a4 4 0 00-8 0v2H2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2zM5 5a2 2 0 014 0v2H5V5zm2 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
    </svg>
  )
}

function LockOpenIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="10" height="9" rx="1.5" />
      <path d="M5 7V4.5a2 2 0 014 0" />
      <circle cx="7" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

function BinIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4h12M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M11.5 4l-.92 9.5a1 1 0 01-1 .9H4.42a1 1 0 01-1-.9L2.5 4" />
      <path d="M5.5 7v4M8.5 7v4" />
    </svg>
  )
}

function KeyholderIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
    </svg>
  )
}

// ── Universal pill toggle ─────────────────────────────────────────────────────

function PillToggle({ active, onClick, children, activeColor = '#FF1F7D', disabled = false, size = 'md' }) {
  const heights = { sm: 26, md: 32 }
  const pads = { sm: '0 9px', md: '0 13px' }
  const sizes = { sm: 10, md: 11 }
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        height: heights[size], padding: pads[size], borderRadius: 8,
        border: active ? 'none' : '1px solid #E5E7EB',
        background: active ? activeColor : '#F9FAFB',
        color: active ? '#fff' : '#6B7280',
        fontSize: sizes[size], fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        flexShrink: 0, transition: 'all .1s', userSelect: 'none', whiteSpace: 'nowrap',
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
        height: 22, padding: '0 8px', borderRadius: 8,
        border: locked ? 'none' : '1px solid #E5E7EB',
        background: locked ? color : '#F9FAFB',
        color: locked ? '#fff' : '#9CA3AF',
        fontSize: 10, fontWeight: 600,
        cursor: autoLocked ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        flexShrink: 0, transition: 'all .1s', userSelect: 'none',
      }}
    >
      {locked ? <LockClosedIcon size={9} /> : <LockOpenIcon size={9} />}
      {locked ? 'Locked' : 'Lock'}
    </button>
  )
}

// ── Field components ──────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: '#9CA3AF',
      marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5, minHeight: 18,
    }}>
      {children}
    </div>
  )
}

// Standard height for all inputs in equation row
const INPUT_H = 34

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
        width: '100%', height: INPUT_H, padding: '0 10px', borderRadius: 8,
        border: `1px solid ${disabled ? '#F3F4F6' : '#E5E7EB'}`,
        fontSize: 12, color: disabled ? '#9CA3AF' : '#111827',
        background: disabled ? '#F9FAFB' : '#fff',
        outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1, boxSizing: 'border-box',
      }}
    >
      {options.map(o => {
        const v = typeof o === 'object' ? o.value : o
        const l = typeof o === 'object' ? o.label : o
        return <option key={v} value={v}>{l}</option>
      })}
    </select>
  )
}

function LockedDisplay({ value }) {
  return (
    <div style={{
      width: '100%', height: INPUT_H, padding: '0 10px', borderRadius: 8,
      background: '#F9FAFB', border: '1px solid #F3F4F6',
      fontSize: 12, color: '#9CA3AF', fontWeight: 500,
      display: 'flex', alignItems: 'center', boxSizing: 'border-box',
    }}>
      {value}
    </div>
  )
}

function NumInput({ value, onChange, min = 1, max = 20 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} style={{
        width: 30, height: INPUT_H, border: '1px solid #E5E7EB',
        borderRadius: '8px 0 0 8px', background: '#F9FAFB',
        cursor: 'pointer', fontSize: 16, color: '#6B7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>−</button>
      <div style={{
        padding: '0 8px', height: INPUT_H, minWidth: 38,
        borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, color: '#111827', background: '#fff',
      }}>{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))} style={{
        width: 30, height: INPUT_H, border: '1px solid #E5E7EB',
        borderRadius: '0 8px 8px 0', background: '#F9FAFB',
        cursor: 'pointer', fontSize: 16, color: '#6B7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>
    </div>
  )
}

// ── Segmented toggle — Paid / Unpaid ──────────────────────────────────────────

function SegmentedToggle({ value, options, onChange, disabled, activeColor }) {
  return (
    <div style={{
      display: 'flex', height: INPUT_H, flexShrink: 0,
      border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden',
      opacity: disabled ? 0.45 : 1,
    }}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => !disabled && onChange(opt.value)}
          style={{
            padding: '0 11px', height: '100%', fontSize: 11, fontWeight: 600,
            border: 'none',
            borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
            background: value === opt.value ? (activeColor || '#FF1F7D') : '#fff',
            color: value === opt.value ? '#fff' : '#6B7280',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all .1s', whiteSpace: 'nowrap',
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[['All', [0,1,2,3,4,5,6]], ['Weekdays', [0,1,2,3,4]], ['Weekends', [5,6]]].map(([label, d]) => (
          <button key={label} onClick={() => onChange(d)} style={{
            padding: '3px 10px', height: 26, borderRadius: 8,
            border: '1px solid #E5E7EB', background: '#F9FAFB',
            color: '#6B7280', fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {DAYS.map((d, di) => (
          <button
            key={d}
            onClick={() => onChange(
              days.includes(di)
                ? days.filter(x => x !== di)
                : [...days, di].sort((a, b) => a - b)
            )}
            style={{
              width: 34, height: 28, borderRadius: 8, border: 'none',
              fontSize: 10, fontWeight: 600,
              background: days.includes(di) ? color : '#F3F4F6',
              color: days.includes(di) ? '#fff' : '#9CA3AF',
              cursor: 'pointer', transition: 'all .1s',
            }}
          >{d.slice(0, 2)}</button>
        ))}
      </div>
    </div>
  )
}

// ── Key badge ─────────────────────────────────────────────────────────────────

function KeyBadge({ color }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
      padding: '2px 5px', background: color + '22', color, borderRadius: 4, lineHeight: 1,
    }}>KEY</span>
  )
}

export function KeyBadgeLight() {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
      padding: '2px 5px', background: 'rgba(255,255,255,0.3)', color: '#fff',
      borderRadius: 4, lineHeight: 1,
    }}>KEY</span>
  )
}

// ── Arrow divider ─────────────────────────────────────────────────────────────

function Arrow() {
  return (
    <div style={{
      color: '#D1D5DB', fontSize: 14, flexShrink: 0,
      height: INPUT_H, display: 'flex', alignItems: 'center',
      userSelect: 'none', marginTop: 23, // push to input level (label ~23px)
    }}>→</div>
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
    <div style={{
      borderRadius: 10,
      border: `1px solid ${isOpen ? teamColor + '55' : '#E5E7EB'}`,
      background: '#fff', overflow: 'hidden', transition: 'all .15s',
    }}>

      {/* ── Collapsed row ── */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', minHeight: 46 }}>
        <div style={{ width: 4, alignSelf: 'stretch', background: teamColor, borderRadius: '10px 0 0 10px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{shift.name}</span>
          {shift.keyholder && <KeyBadge color={teamColor} />}
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: teamColor + '18', color: teamColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {shift.anchor_type.charAt(0).toUpperCase() + shift.anchor_type.slice(1)}
        </span>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, width: 124, textAlign: 'center', flexShrink: 0 }}>
          {decimalToLabel(shift.start)} – {decimalToLabel(displayEnd)}
        </span>
        <span style={{ fontSize: 11, color: '#6B7280', width: 76, textAlign: 'center', flexShrink: 0 }}>{shortDayLabel}</span>
        <span style={{ fontSize: 12, color: '#374151', width: 38, textAlign: 'center', flexShrink: 0 }}>x{shift.staff}</span>
        <div style={{ width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12, marginRight: 6, flexShrink: 0, transition: 'transform .15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</div>
      </div>

      {/* ── Expanded ── */}
      {isOpen && (
        <div style={{ borderTop: `1px solid ${teamColor}22`, padding: '16px 20px 18px', background: teamColor + '05' }}>

          {/* Row 1: Name / Team / Type / Staff */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>Name</FieldLabel>
              <input value={shift.name} onChange={e => up('name', e.target.value)} maxLength={40} style={{
                width: '100%', height: INPUT_H, padding: '0 10px', borderRadius: 8,
                border: '1px solid #E5E7EB', fontSize: 12, background: '#fff',
                outline: 'none', boxSizing: 'border-box', color: '#111827',
              }} />
            </div>
            <div>
              <FieldLabel>Team</FieldLabel>
              <Sel value={shift.team_id} options={(teams || []).map(t => ({ value: t.id, label: t.team_name }))} onChange={v => up('team_id', parseInt(v))} />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Sel value={shift.anchor_type} options={[{ value: 'open', label: 'Open' }, { value: 'close', label: 'Close' }, { value: 'fixed', label: 'Fixed' }]} onChange={v => up('anchor_type', v)} />
            </div>
            <div>
              <FieldLabel>Staff Needed</FieldLabel>
              <NumInput value={shift.staff} onChange={v => up('staff', v)} />
            </div>
          </div>

          {/* Row 2: Equation — Start → Length → Break + toggle → End */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 14 }}>

            <div style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel>
                Start
                {isOpenType ? <LockPill locked autoLocked color={teamColor} /> : null}
                {isFixed ? <LockPill locked={fixedLock === 'start'} onClick={() => toggleFixedLock('start')} color={teamColor} /> : null}
              </FieldLabel>
              {startLocked ? <LockedDisplay value={decimalToLabel(shift.start)} /> : <Sel value={shift.start} options={TIME_OPTIONS} onChange={v => upTime('start', v)} />}
            </div>

            <Arrow />

            <div style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel>
                Length
                {isFixed ? <LockPill locked={fixedLock === 'length'} onClick={() => toggleFixedLock('length')} color={teamColor} /> : null}
              </FieldLabel>
              <Sel value={shiftLen} options={lenOptions} onChange={v => upTime('length', v)} disabled={lenLocked} />
            </div>

            <Arrow />

            <div style={{ flex: 2, minWidth: 0 }}>
              <FieldLabel>Break</FieldLabel>
              <div style={{ display: 'flex', gap: 5, height: INPUT_H }}>
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
                  options={[{ value: 'unpaid', label: 'Unpaid' }, { value: 'paid', label: 'Paid' }]}
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
                {isFixed ? <LockPill locked={fixedLock === 'end'} onClick={() => toggleFixedLock('end')} color={teamColor} /> : null}
              </FieldLabel>
              {endLocked ? <LockedDisplay value={decimalToLabel(shift.end)} /> : <Sel value={shift.end} options={TIME_OPTIONS_END} onChange={v => upTime('end', v)} />}
            </div>

          </div>

          {/* Row 3: Keyholder + Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 14, alignItems: 'start' }}>
            <div>
              <FieldLabel>Keyholder</FieldLabel>
              <PillToggle
                active={shift.keyholder}
                onClick={isAutoKey ? undefined : () => up('keyholder', !shift.keyholder)}
                activeColor={teamColor}
                disabled={isAutoKey}
                size="md"
              >
                <KeyholderIcon size={11} />
                {shift.keyholder ? 'Required' : 'Not required'}
                {isAutoKey && <span style={{ fontSize: 9, opacity: 0.7 }}>auto</span>}
              </PillToggle>
            </div>
            <div>
              <FieldLabel>Days</FieldLabel>
              <DayToggles days={shift.days} onChange={v => up('days', v)} color={teamColor} />
            </div>
          </div>

          {/* Row 4: Summary + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${teamColor}15` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>
                <span style={{ color: '#9CA3AF', fontSize: 11 }}>Paid: </span>
                <span style={{ fontWeight: 700 }}>{formatHours(paidHours)}</span>
              </span>
              {hasUnpaidBreak && (
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>On-site: {formatHours(onSiteHours)}</span>
              )}
              {saveError && <span style={{ fontSize: 11, color: '#EF4444' }}>{saveError}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDelete} style={{
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid #FECACA', background: '#FEF2F2',
                color: '#EF4444', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <BinIcon />Delete
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 22px', borderRadius: 8, border: 'none',
                background: saving ? '#F3F4F6' : '#FF1F7D',
                color: saving ? '#9CA3AF' : '#fff',
                fontSize: 12, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}