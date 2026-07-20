'use client'

import { useState } from 'react'
import {
  DAYS,
  TENDENCY_OPTIONS,
  SHIFT_TYPE_OPTIONS,
  DAY_PATTERN_OPTIONS,
  makeRule,
  formatInitials,
  validateHours,
  getDayAvailability,
} from '../utils/staffHelpers'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

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

// ── Pill Toggle, universal on/off ────────────────────────────────────────────

function PillToggle({ active, onClick, children, activeColor = '#FF1F7D', disabled = false, size = 'md' }) {
  const h = { sm: 26, md: 32 }[size]
  const px = { sm: '0 9px', md: '0 13px' }[size]
  const fs = { sm: 10, md: 11 }[size]
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        height: h, padding: px, borderRadius: 7,
        border: active ? 'none' : '1px solid #E5E7EB',
        background: active ? activeColor : '#F9FAFB',
        color: active ? '#fff' : '#6B7280',
        fontSize: fs, fontWeight: 600,
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

// ── Micro components ──────────────────────────────────────────────────────────

function KeyBadge({ color }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
      padding: '2px 5px', background: color + '22', color, borderRadius: 4, lineHeight: 1,
    }}>KEY</span>
  )
}

function Avatar({ name, color }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 99, flexShrink: 0,
      background: color + '22', color, border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {formatInitials(name)}
    </div>
  )
}

function StatusBadge({ status, onClick }) {
  const styles = {
    none: { bg: '#fff', border: '#E5E7EB', color: '#374151', label: 'Invite', clickable: true },
    invited: { bg: '#FFF7ED', border: '#FED7AA', color: '#F97316', label: 'Invited', clickable: false },
    connected: { bg: '#DCFCE7', border: '#BBF7D0', color: '#16A34A', label: '✓ Connected', clickable: false },
  }
  const s = styles[status] || styles.none
  return (
    <div
      onClick={s.clickable ? onClick : undefined}
      style={{
        padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        border: `1px solid ${s.border}`, background: s.bg, color: s.color,
        cursor: s.clickable ? 'pointer' : 'default',
        whiteSpace: 'nowrap', flexShrink: 0, userSelect: 'none',
      }}
    >
      {s.label}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: '#9CA3AF',
      marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
    }}>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', maxLength }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: '100%', padding: '7px 10px', borderRadius: 8,
        border: '1px solid #E5E7EB', fontSize: 12, color: '#111827',
        background: '#fff', outline: 'none', boxSizing: 'border-box',
      }}
    />
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
        width: '100%', padding: '7px 10px', borderRadius: 8,
        border: `1px solid ${disabled ? '#F3F4F6' : '#E5E7EB'}`,
        fontSize: 12, color: disabled ? '#9CA3AF' : '#111827',
        background: disabled ? '#F9FAFB' : '#fff',
        outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
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

function HoursInput({ value, onChange, min = 0, max = 99 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 30, height: 34, border: '1px solid #E5E7EB',
          borderRadius: '8px 0 0 8px', background: '#F9FAFB',
          cursor: 'pointer', fontSize: 16, color: '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div style={{
        padding: '0 8px', height: 34, minWidth: 44,
        borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 600, color: '#111827', background: '#fff',
      }}>
        {value}h
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 30, height: 34, border: '1px solid #E5E7EB',
          borderRadius: '0 8px 8px 0', background: '#F9FAFB',
          cursor: 'pointer', fontSize: 16, color: '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  )
}

// ── Rule Builder Row ──────────────────────────────────────────────────────────

function RuleRow({ rule, shiftLengths, onUpdate, onRemove }) {
  const durationOptions = [
    { value: 'any', label: 'Any length' },
    ...(shiftLengths || [4, 6, 8]).map(l => ({ value: l, label: `${l}h` })),
  ]
  const tendencyColor = {
    always: '#16A34A', never: '#EF4444', prefer: '#F97316',
  }[rule.tendency] || '#6B7280'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 10px', borderRadius: 8,
      background: '#fff', border: '1px solid #E5E7EB',
    }}>
      <select value={rule.tendency} onChange={e => onUpdate({ ...rule, tendency: e.target.value })} style={{
        padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
        border: `1.5px solid ${tendencyColor}44`,
        background: tendencyColor + '10', color: tendencyColor,
        outline: 'none', cursor: 'pointer',
      }}>
        {TENDENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={rule.shift_type} onChange={e => onUpdate({ ...rule, shift_type: e.target.value })} style={{
        padding: '4px 8px', borderRadius: 6, fontSize: 11,
        border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
        outline: 'none', cursor: 'pointer',
      }}>
        {SHIFT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={rule.days} onChange={e => onUpdate({ ...rule, days: e.target.value })} style={{
        padding: '4px 8px', borderRadius: 6, fontSize: 11,
        border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
        outline: 'none', cursor: 'pointer',
      }}>
        {DAY_PATTERN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        value={rule.duration}
        onChange={e => {
          const raw = e.target.value
          const parsed = parseFloat(raw)
          onUpdate({ ...rule, duration: isNaN(parsed) ? raw : parsed })
        }}
        style={{
          padding: '4px 8px', borderRadius: 6, fontSize: 11,
          border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
          outline: 'none', cursor: 'pointer',
        }}
      >
        {durationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button onClick={onRemove} style={{
        width: 22, height: 22, borderRadius: 5, border: '1px solid #FECACA',
        background: '#FEF2F2', color: '#EF4444', fontSize: 13,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, marginLeft: 'auto',
      }}>×</button>
    </div>
  )
}

// ── Availability summary ──────────────────────────────────────────────────────

function getAvailSummary(member) {
  const grid = member.availability_grid
  if (grid && typeof grid === 'object' && Object.keys(grid).length > 0) {
    let avail = 0, partial = 0
    DAYS.forEach((_, di) => {
      const status = getDayAvailability(member, di)
      if (status === 'available' || status === 'preferred') avail++
      else if (status === 'partial') { avail++; partial++ }
    })
    if (avail === 0) return 'Unavailable'
    const base = avail === 7 ? 'All days' : `${avail}d`
    return partial > 0 ? `${base} (${partial}~)` : base
  }
  if (member.availability) {
    try {
      const parsed = typeof member.availability === 'string'
        ? JSON.parse(member.availability) : member.availability
      if (typeof parsed === 'object' && parsed !== null) {
        const avail = Object.values(parsed).filter(v =>
          (typeof v === 'boolean' && v) || (typeof v === 'object' && v?.available === true)
        ).length
        if (avail === 7) return 'All days'
        if (avail === 0) return 'Unavailable'
        return `${avail}d`
      }
    } catch { /* fall through */ }
  }
  return 'No data'
}

// ── StaffRow ──────────────────────────────────────────────────────────────────

export default function StaffRow({
  member, teams, teamColor, isOpen, onToggle,
  onUpdate, onDelete, legalLimit, minWage, shiftLengths,
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const hoursErrors = validateHours(member.contracted_hours, member.max_hours, legalLimit)
  const availSummary = getAvailSummary(member)

  const up = (field, val) => onUpdate(member.id, { ...member, [field]: val }, false)

  const upRule = (ruleId, updated) => {
    up('availability_rules', member.availability_rules.map(r => r.id === ruleId ? updated : r))
  }

  const addRule = () => up('availability_rules', [...(member.availability_rules || []), makeRule()])
  const removeRule = (ruleId) => up('availability_rules', member.availability_rules.filter(r => r.id !== ruleId))

  const handleInvite = () => {
    if (member.invite_status === 'none') up('invite_status', 'invited')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await onUpdate(member.id, member, true)
    } catch {
      setSaveError('Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove ${member.name}? This cannot be undone.`)) return
    try {
      await onDelete(member.id)
    } catch {
      setSaveError('Delete failed')
    }
  }

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${isOpen ? teamColor + '55' : '#E5E7EB'}`,
      background: '#fff', overflow: 'hidden', transition: 'all .15s',
    }}>

      {/* ── Collapsed row ── */}
      <div onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', cursor: 'pointer', minHeight: 46,
      }}>
        <div style={{
          width: 4, alignSelf: 'stretch', background: teamColor,
          borderRadius: '10px 0 0 10px', flexShrink: 0,
        }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', flex: 1, minWidth: 0,
        }}>
          <Avatar name={member.name} color={teamColor} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
            {member.name}
          </span>
          {member.keyholder && <KeyBadge color={teamColor} />}
        </div>
        <span style={{ fontSize: 11, color: '#6B7280', width: 80, textAlign: 'center', flexShrink: 0 }}>
          {availSummary}
        </span>
        <span style={{ fontSize: 12, width: 90, textAlign: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, color: member.contracted_hours > 0 ? '#FF1F7D' : '#9CA3AF' }}>
            {member.contracted_hours}h
          </span>
          <span style={{ color: '#D1D5DB' }}> / </span>
          <span style={{ color: '#6B7280' }}>{member.max_hours}h</span>
        </span>
        <div style={{ width: 110, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <StatusBadge
            status={member.invite_status}
            onClick={e => { e.stopPropagation(); handleInvite() }}
          />
        </div>
        <div style={{
          width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9CA3AF', fontSize: 12, marginRight: 6, flexShrink: 0,
          transition: 'transform .15s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▾</div>
      </div>

      {/* ── Expanded edit area ── */}
      {isOpen && (
        <div style={{
          borderTop: `1px solid ${teamColor}22`,
          padding: '18px 20px 20px',
          background: teamColor + '05',
        }}>

          {/* Row 1: Name / Email / Team / Keyholder */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr auto',
            gap: 12, marginBottom: 16, alignItems: 'end',
          }}>
            <div>
              <FieldLabel>Name</FieldLabel>
              <TextInput value={member.name} onChange={v => up('name', v)} maxLength={50} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput
                value={member.email} onChange={v => up('email', v)}
                type="email" placeholder="email@example.com"
              />
            </div>
            <div>
              <FieldLabel>Team</FieldLabel>
              <Sel
                value={member.team_id}
                options={(teams || []).map(t => ({ value: t.id, label: t.team_name }))}
                onChange={v => up('team_id', parseInt(v))}
              />
            </div>
            <div style={{ paddingBottom: 2 }}>
              <PillToggle
                active={member.keyholder}
                onClick={() => up('keyholder', !member.keyholder)}
                activeColor={teamColor}
                size="md"
              >
                <KeyholderIcon size={11} />
                Keyholder
              </PillToggle>
            </div>
          </div>

          {/* Row 2: Wage / Contracted / Max / Invite */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 12, marginBottom: 16,
          }}>
            <div>
              <FieldLabel>Wage (£/hr)</FieldLabel>
              <input
                type="number"
                value={member.hourly_rate || ''}
                onChange={e => up('hourly_rate', parseFloat(e.target.value) || 0)}
                min={minWage} step={0.01}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1px solid #E5E7EB', fontSize: 12, color: '#111827',
                  background: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {member.hourly_rate > 0 && member.hourly_rate < minWage && (
                <div style={{ fontSize: 10, color: '#EF4444', marginTop: 3 }}>
                  Below minimum wage (£{minWage}/hr)
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Contracted hrs/wk</FieldLabel>
              <HoursInput
                value={member.contracted_hours || 0}
                onChange={v => up('contracted_hours', v)}
                min={0} max={member.max_hours || legalLimit}
              />
              {hoursErrors.contracted_hours && (
                <div style={{ fontSize: 10, color: '#EF4444', marginTop: 3 }}>
                  {hoursErrors.contracted_hours}
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Max hrs/wk (legal: {legalLimit}h)</FieldLabel>
              <HoursInput
                value={member.max_hours || 0}
                onChange={v => up('max_hours', v)}
                min={member.contracted_hours || 0} max={legalLimit}
              />
              {hoursErrors.max_hours && (
                <div style={{ fontSize: 10, color: '#EF4444', marginTop: 3 }}>
                  {hoursErrors.max_hours}
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Invite status</FieldLabel>
              <Sel
                value={member.invite_status || 'none'}
                options={[
                  { value: 'none', label: 'Not invited' },
                  { value: 'invited', label: 'Invited' },
                  { value: 'connected', label: 'Connected' },
                ]}
                onChange={v => up('invite_status', v)}
                disabled={member.invite_status === 'connected'}
              />
            </div>
          </div>

          {/* Row 3: Availability Rules */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FieldLabel>Availability Rules</FieldLabel>
                {member.availability_rules?.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 7px',
                    borderRadius: 99, background: teamColor + '15', color: teamColor,
                  }}>
                    {member.availability_rules.length} rule{member.availability_rules.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={addRule} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${teamColor}44`, background: teamColor + '10',
                color: teamColor, cursor: 'pointer',
              }}>+ Add Rule</button>
            </div>
            {member.availability_rules?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {member.availability_rules.map(rule => (
                  <RuleRow
                    key={rule.id} rule={rule} shiftLengths={shiftLengths}
                    onUpdate={updated => upRule(rule.id, updated)}
                    onRemove={() => removeRule(rule.id)}
                  />
                ))}
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>
                  <span style={{ color: '#EF4444', fontWeight: 600 }}>Always/Never</span> = hard &nbsp;·&nbsp;
                  <span style={{ color: '#F97316', fontWeight: 600 }}>Prefer</span> = soft
                </div>
              </div>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: 8,
                border: '1px dashed #E5E7EB', background: '#F9FAFB',
                fontSize: 12, color: '#9CA3AF', textAlign: 'center',
              }}>
                No rules set — staff will be considered for all shifts
              </div>
            )}
          </div>

          {/* Row 4: Error + Actions */}
          {saveError && (
            <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 8 }}>{saveError}</div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            alignItems: 'center', gap: 8,
            paddingTop: 12, borderTop: `1px solid ${teamColor}15`,
          }}>
            <button onClick={handleDelete} style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid #FECACA', background: '#FEF2F2',
              color: '#EF4444', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <BinIcon />
              Remove
            </button>
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(hoursErrors).length > 0}
              style={{
                padding: '8px 22px', borderRadius: 8, border: 'none',
                background: saving || Object.keys(hoursErrors).length > 0 ? '#F3F4F6' : '#FF1F7D',
                color: saving || Object.keys(hoursErrors).length > 0 ? '#9CA3AF' : '#fff',
                fontSize: 12, fontWeight: 600,
                cursor: saving || Object.keys(hoursErrors).length > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}