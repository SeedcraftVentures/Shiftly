'use client'

import { useState, useEffect, useCallback } from 'react'

// ════════════════════════════════════════════════════════════════════════════
//  RULES PAGE — universal scheduling rules (per location). One flat list, equal
//  weight. The rota always builds; if a rule can't be fully met it's flagged in
//  the Rota Builder (not blocked here).
// ════════════════════════════════════════════════════════════════════════════

const PINK = '#FF1F7D'
const FONT = "'Plus Jakarta Sans', sans-serif"

const RULES = [
  { key: 'enforce_keyholder', type: 'toggle', label: 'Keyholder on open & close', desc: 'Opening and closing shifts are only assigned to staff marked as keyholders.' },
  { key: 'min_rest_hours', type: 'stepper', label: 'Minimum rest between shifts', desc: 'Hours off between one shift ending and the next starting. Prevents clopening.', min: 8, max: 24, unit: 'h' },
  { key: 'max_consecutive_days', type: 'stepper', label: 'Maximum consecutive days', desc: 'The most days in a row a person can be scheduled to work.', min: 1, max: 7, unit: 'd' },
  { key: 'fair_distribution', type: 'toggle', label: 'Fair distribution', desc: 'Spread shifts as evenly as possible across all eligible staff.' },
  { key: 'prefer_consecutive_days_off', type: 'toggle', label: 'Group days off together', desc: "Keep each person's days off in a block rather than scattered through the week." },
  { key: 'balance_keyholder_shifts', type: 'toggle', label: 'Balance keyholder shifts', desc: 'Spread open and close shifts across all keyholders rather than the same person.' },
]
const DEFAULTS = { enforce_keyholder: true, min_rest_hours: 11, max_consecutive_days: 5, fair_distribution: true, prefer_consecutive_days_off: true, balance_keyholder_shifts: true }

function Switch({ on, onClick }) {
  const w = 46, h = 26
  return <button onClick={onClick} style={{ position: 'relative', width: w, height: h, borderRadius: 99, border: 'none', background: on ? PINK : '#E5E7EB', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 3, left: on ? w - h + 3 : 3, width: h - 6, height: h - 6, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </button>
}
function Stepper({ value, onChange, min, max, unit }) {
  const btn = { width: 34, height: 34, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: 17, color: '#6B7280' }
  return <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
    <button onClick={() => onChange(Math.max(min, value - 1))} style={{ ...btn, borderRadius: '8px 0 0 8px' }}>−</button>
    <div style={{ minWidth: 54, height: 34, borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#111827', background: '#fff', fontFamily: FONT }}>{value}{unit}</div>
    <button onClick={() => onChange(Math.min(max, value + 1))} style={{ ...btn, borderRadius: '0 8px 8px 0' }}>+</button>
  </div>
}

export default function RulesPage() {
  const [rules, setRules] = useState(DEFAULTS)
  const [locationId, setLocationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/rules')
        const data = await res.json()
        if (Array.isArray(data) && data[0]) { setRules({ ...DEFAULTS, ...(data[0].rules || {}) }); setLocationId(data[0].location_id) }
      } catch { /* non-fatal — defaults */ } finally { setLoading(false) }
    })()
  }, [])

  const update = useCallback((key, value) => setRules((prev) => ({ ...prev, [key]: value })), [])
  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch('/api/rules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: locationId, rules }) })
      if (!res.ok) throw new Error()
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setError('Save failed — please try again') } finally { setSaving(false) }
  }

  if (loading) return <div style={{ fontFamily: FONT, padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading rules…</div>

  const inner = { maxWidth: 760, margin: '0 auto', padding: '0 24px' }
  return <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827', paddingTop: 30, paddingBottom: 50 }}>
    <div style={inner}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Rules</h1>
      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 8px' }}>Scheduling rules applied to every rota you generate.</p>
      <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: '0 0 22px' }}>Every rule carries equal weight. The rota always generates — if a rule can’t be fully met, it’s flagged for you in the Rota Builder.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {RULES.map((rule) => {
          const value = rules[rule.key]
          const on = rule.type === 'toggle' ? value === true : true
          return <div key={rule.key} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: `1.5px solid ${on ? PINK + '33' : '#ECECEF'}`, display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color .15s' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{rule.label}</div>
              <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>{rule.desc}</p>
            </div>
            {rule.type === 'stepper'
              ? <Stepper value={typeof value === 'number' ? value : rule.min} onChange={(v) => update(rule.key, v)} min={rule.min} max={rule.max} unit={rule.unit} />
              : <Switch on={on} onClick={() => update(rule.key, !on)} />}
          </div>
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
        {error && <span style={{ fontSize: 12, color: '#EF4444' }}>{error}</span>}
        {saved && <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✓ Saved</span>}
        <button onClick={handleSave} disabled={saving} style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, padding: '11px 28px', borderRadius: 10, border: 'none', background: saving ? '#F3F4F6' : PINK, color: saving ? '#9CA3AF' : '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving…' : 'Save rules'}</button>
      </div>
    </div>
  </div>
}
