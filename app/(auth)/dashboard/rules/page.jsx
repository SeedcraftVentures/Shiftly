'use client'

import { useState, useEffect, useCallback } from 'react'

const FONT_HEADING = "'Cal Sans', 'Plus Jakarta Sans', sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', sans-serif"
const PINK = '#FF1F7D'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function KeyIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
    </svg>
  )
}

function MoonIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  )
}

function CalIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  )
}

function UsersIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  )
}

function SunIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
    </svg>
  )
}

function SparkleIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
  )
}

// ── Rule definitions ──────────────────────────────────────────────────────────

const RULES = [
  {
    key: 'enforce_keyholder',
    type: 'toggle',
    label: 'Enforce keyholder requirement',
    description: 'Open and close shifts will only be assigned to staff marked as keyholders.',
    Icon: KeyIcon,
    hard: true,
  },
  {
    key: 'min_rest_hours',
    type: 'stepper',
    label: 'Minimum rest between shifts',
    description: 'Staff must have at least this many hours off between the end of one shift and the start of the next. Prevents clopening.',
    Icon: MoonIcon,
    min: 8, max: 24, unit: 'h',
    hard: true,
  },
  {
    key: 'max_consecutive_days',
    type: 'stepper',
    label: 'Maximum consecutive working days',
    description: 'Staff will not be scheduled to work more than this many days in a row.',
    Icon: CalIcon,
    min: 1, max: 7, unit: 'd',
    hard: true,
  },
  {
    key: 'fair_distribution',
    type: 'toggle',
    label: 'Fair shift distribution',
    description: 'Spreads shifts as evenly as possible across all eligible staff.',
    Icon: UsersIcon,
    hard: false,
  },
  {
    key: 'prefer_consecutive_days_off',
    type: 'toggle',
    label: 'Prefer consecutive days off',
    description: "Groups each staff member's days off together in a block rather than scattering them through the week.",
    Icon: SunIcon,
    hard: false,
  },
  {
    key: 'balance_keyholder_shifts',
    type: 'toggle',
    label: 'Balance keyholder shifts',
    description: 'Open and close shifts are spread across all eligible keyholder staff rather than always falling to the same person.',
    Icon: SparkleIcon,
    hard: false,
  },
]

const DEFAULTS = {
  enforce_keyholder: true,
  min_rest_hours: 11,
  max_consecutive_days: 5,
  fair_distribution: true,
  prefer_consecutive_days_off: true,
  balance_keyholder_shifts: true,
}

// ── Pill toggle ───────────────────────────────────────────────────────────────

function PillToggle({ active, onClick }) {
  const w = 48, h = 26
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', width: w, height: h,
        borderRadius: 99, border: 'none',
        background: active ? PINK : '#E5E7EB',
        cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3, left: active ? w - h + 3 : 3,
        width: h - 6, height: h - 6,
        borderRadius: 99, background: '#fff',
        transition: 'left .18s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
      }} />
    </button>
  )
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min, max, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 32, height: 32, border: '1px solid #E5E7EB',
          borderRadius: '8px 0 0 8px', background: '#F9FAFB',
          cursor: 'pointer', fontSize: 16, color: '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div style={{
        padding: '0 12px', height: 32, minWidth: 52,
        borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#111827', background: '#fff',
        fontFamily: FONT_BODY,
      }}>
        {value}{unit}
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 32, height: 32, border: '1px solid #E5E7EB',
          borderRadius: '0 8px 8px 0', background: '#F9FAFB',
          cursor: 'pointer', fontSize: 16, color: '#6B7280',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  )
}

// ── Rule card ─────────────────────────────────────────────────────────────────

function RuleCard({ rule, value, onChange }) {
  const isOn = rule.type === 'toggle' ? value === true : true

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      border: `1.5px solid ${isOn ? PINK + '40' : '#E5E7EB'}`,
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'border-color .15s',
    }}>
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: isOn ? PINK + '12' : '#F9FAFB',
        color: isOn ? PINK : '#9CA3AF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${isOn ? PINK + '25' : '#F3F4F6'}`,
        transition: 'all .15s',
      }}>
        <rule.Icon size={15} />
      </div>

      {/* Label + description + stepper */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#111827',
            fontFamily: FONT_HEADING,
          }}>
            {rule.label}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 6px',
            borderRadius: 4, letterSpacing: 0.3,
            background: '#FFF0F5', color: PINK,
          }}>
            {rule.hard ? 'HARD' : 'SOFT'}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
          {rule.description}
        </p>
        {rule.type === 'stepper' && (
          <div style={{ marginTop: 10 }}>
            <Stepper
              value={typeof value === 'number' ? value : rule.min}
              onChange={onChange}
              min={rule.min}
              max={rule.max}
              unit={rule.unit}
            />
          </div>
        )}
      </div>

      {/* Toggle */}
      {rule.type === 'toggle' && (
        <PillToggle active={isOn} onClick={() => onChange(!isOn)} />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RulesPage() {
  const [rules, setRules] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const inner = { maxWidth: 1000, margin: '0 auto', padding: '0 24px' }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/rules')
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data?.length > 0 && data[0].rules) {
          setRules({ ...DEFAULTS, ...data[0].rules })
        }
      } catch {
        // non-fatal — use defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const update = useCallback((key, value) => {
    setRules(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const teamsRes = await fetch('/api/teams')
      const teams = await teamsRes.json()
      await Promise.all((teams || []).map(team =>
        fetch('/api/rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_id: team.id, rules }),
        })
      ))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: FONT_BODY }}>
        <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading rules…</div>
      </div>
    )
  }

  const hardRules = RULES.filter(r => r.hard)
  const softRules = RULES.filter(r => !r.hard)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      fontFamily: FONT_BODY, background: '#F9FAFB', color: '#111827',
    }}>

      {/* Header */}
      <div style={{ background: '#F9FAFB', paddingTop: 28 }}>
        <div style={inner}>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            Rules
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
            Global scheduling rules applied to every rota generation across all teams.
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, paddingTop: 8, paddingBottom: 40 }}>
        <div style={inner}>

          {/* Hard constraints */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: PINK }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: PINK, letterSpacing: 0.5, fontFamily: FONT_HEADING }}>
                HARD CONSTRAINTS
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                always enforced — rota won't generate if these can't be met
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hardRules.map(rule => (
                <RuleCard
                  key={rule.key}
                  rule={rule}
                  value={rules[rule.key]}
                  onChange={val => update(rule.key, val)}
                />
              ))}
            </div>
          </div>

          {/* Soft preferences */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: PINK }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: PINK, letterSpacing: 0.5, fontFamily: FONT_HEADING }}>
                SOFT PREFERENCES
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                best-effort — solver optimises toward these where possible
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {softRules.map(rule => (
                <RuleCard
                  key={rule.key}
                  rule={rule}
                  value={rules[rule.key]}
                  onChange={val => update(rule.key, val)}
                />
              ))}
            </div>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            {error && <span style={{ fontSize: 11, color: '#EF4444' }}>{error}</span>}
            {saved && <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Saved</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 26px', borderRadius: 8, border: 'none',
                background: saving ? '#F3F4F6' : PINK,
                color: saving ? '#9CA3AF' : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save Rules'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}