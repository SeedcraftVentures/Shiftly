'use client'

const FONT_HEADING = "'Cal Sans', 'Cal Sans Text', 'Plus Jakarta Sans', sans-serif"

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function LockIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 16" fill="currentColor">
      <path d="M12 7h-1V5a4 4 0 00-8 0v2H2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2zM5 5a2 2 0 014 0v2H5V5zm2 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
    </svg>
  )
}

function SparkleIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
  )
}

// ── Toggle pill, reused from design system ───────────────────────────────────

function PillToggle({ active, onClick, children, activeColor = '#FF1F7D', disabled = false }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        height: 32, padding: '0 13px', borderRadius: 8,
        border: active ? 'none' : '1px solid #E5E7EB',
        background: active ? activeColor : '#F9FAFB',
        color: active ? '#fff' : '#6B7280',
        fontSize: 11, fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        flexShrink: 0, transition: 'all .1s', userSelect: 'none',
      }}
    >
      {children}
    </button>
  )
}

// ── Stepper input ─────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min, max, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 32, height: 34, border: '1px solid #E5E7EB',
          borderRadius: '8px 0 0 8px', background: '#F9FAFB',
          cursor: 'pointer', fontSize: 16, color: '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div style={{
        padding: '0 10px', height: 34, minWidth: 52,
        borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#111827', background: '#fff',
        whiteSpace: 'nowrap',
      }}>
        {value}{unit}
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 32, height: 34, border: '1px solid #E5E7EB',
          borderRadius: '0 8px 8px 0', background: '#F9FAFB',
          cursor: 'pointer', fontSize: 16, color: '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  )
}

// ── Rule row ──────────────────────────────────────────────────────────────────

function RuleRow({ label, description, type, value, onChange, min, max, unit, teamColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid #F9FAFB',
    }}>
      <div style={{ flex: 1, marginRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {type === 'toggle' && (
          <PillToggle
            active={value}
            onClick={() => onChange(!value)}
            activeColor={teamColor}
          >
            {value ? 'On' : 'Off'}
          </PillToggle>
        )}
        {type === 'stepper' && (
          <Stepper value={value} onChange={onChange} min={min} max={max} unit={unit} />
        )}
      </div>
    </div>
  )
}

// ── RuleSection ───────────────────────────────────────────────────────────────

export default function RuleSection({ teamRule, teamColor, onUpdate, onSave }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const { useState } = require('react')

  const r = teamRule.rules

  const up = (key, val) => onUpdate(teamRule.team_id, key, val)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      await onSave(teamRule.team_id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  const hardRules = [
    {
      key: 'max_consecutive_days',
      label: 'Max consecutive working days',
      description: 'Staff will not be scheduled to work more than this many days in a row.',
      type: 'stepper', min: 1, max: 7, unit: 'd',
    },
    {
      key: 'min_rest_hours',
      label: 'Minimum rest between shifts',
      description: 'Staff must have at least this many hours off between the end of one shift and the start of the next.',
      type: 'stepper', min: 8, max: 24, unit: 'h',
    },
    {
      key: 'max_weekly_hours',
      label: 'Maximum weekly hours',
      description: 'The solver will not schedule any staff member beyond this limit per week, regardless of their max_hours setting.',
      type: 'stepper', min: 8, max: 60, unit: 'h',
    },
    {
      key: 'enforce_keyholder',
      label: 'Enforce keyholder requirement',
      description: 'Shifts marked as requiring a keyholder will only be assigned to staff with the keyholder flag.',
      type: 'toggle',
    },
  ]

  const softRules = [
    {
      key: 'fair_distribution',
      label: 'Fair shift distribution',
      description: 'The solver will try to spread shifts evenly across staff rather than concentrating on a few individuals.',
      type: 'toggle',
    },
    {
      key: 'prefer_consecutive_days_off',
      label: 'Prefer consecutive days off',
      description: 'Where possible, the solver will try to give staff their days off in a block rather than scattered.',
      type: 'toggle',
    },
    {
      key: 'balance_keyholder_shifts',
      label: 'Balance keyholder shifts',
      description: 'Open and close shifts requiring keyholders will be spread across eligible staff rather than always assigned to the same person.',
      type: 'toggle',
    },
    {
      key: 'prefer_consistent_shift_times',
      label: 'Prefer consistent shift times',
      description: 'The solver will try to give staff the same shift type week to week where possible. Useful for staff with regular routines.',
      type: 'toggle',
    },
  ]

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 12, height: 12, borderRadius: 3, background: teamColor }} />
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#111827',
          fontFamily: FONT_HEADING,
        }}>
          {teamRule.team_name}
        </span>
      </div>

      <div style={{ padding: '4px 20px 20px' }}>

        {/* Hard constraints */}
        <div style={{ marginBottom: 8, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 6,
              background: '#EF444415', color: '#EF4444',
            }}>
              <LockIcon size={11} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', fontFamily: FONT_HEADING }}>
              Hard Constraints
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>— always enforced by the solver</span>
          </div>

          <div style={{
            borderRadius: 10, border: '1px solid #FEE2E2',
            background: '#FFF5F5', padding: '0 14px',
          }}>
            {hardRules.map((rule, i) => (
              <RuleRow
                key={rule.key}
                {...rule}
                value={r[rule.key]}
                onChange={val => up(rule.key, val)}
                teamColor='#EF4444'
              />
            ))}
          </div>
        </div>

        {/* Soft preferences */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 6,
              background: teamColor + '18', color: teamColor,
            }}>
              <SparkleIcon size={11} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: teamColor, fontFamily: FONT_HEADING }}>
              Soft Preferences
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>— solver will optimise toward these</span>
          </div>

          <div style={{
            borderRadius: 10, border: `1px solid ${teamColor}33`,
            background: teamColor + '08', padding: '0 14px',
          }}>
            {softRules.map((rule) => (
              <RuleRow
                key={rule.key}
                {...rule}
                value={r[rule.key]}
                onChange={val => up(rule.key, val)}
                teamColor={teamColor}
              />
            ))}
          </div>
        </div>

        {/* Save */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: 10, marginTop: 16,
        }}>
          {saveError && <span style={{ fontSize: 11, color: '#EF4444' }}>{saveError}</span>}
          {saved && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 22px', borderRadius: 8, border: 'none',
              background: saving ? '#F3F4F6' : '#FF1F7D',
              color: saving ? '#9CA3AF' : '#fff',
              fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save Rules'}
          </button>
        </div>
      </div>
    </div>
  )
}