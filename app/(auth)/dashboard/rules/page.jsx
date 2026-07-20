'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme, Card, Switch, Stepper, Icon, Ic } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  RULES PAGE - universal scheduling rules (per location). One flat list, equal
//  weight. The rota always builds; if a rule can't be fully met it's flagged in
//  the Rota Builder (not blocked here). Autosaves on change.
// ════════════════════════════════════════════════════════════════════════════

const RULES = [
  { key: 'enforce_keyholder', type: 'toggle', label: 'Keyholder on open and close', desc: 'Opening and closing shifts are only assigned to staff marked as keyholders.' },
  { key: 'min_rest_hours', type: 'stepper', label: 'Minimum rest between shifts', desc: 'Hours off between one shift ending and the next starting. Prevents clopening.', min: 8, max: 24, unit: 'h' },
  { key: 'max_consecutive_days', type: 'stepper', label: 'Maximum consecutive days', desc: 'The most days in a row a person can be scheduled to work.', min: 1, max: 7, unit: 'd' },
  { key: 'fair_distribution', type: 'toggle', label: 'Fair distribution', desc: 'Spread shifts as evenly as possible across all eligible staff.' },
  { key: 'prefer_consecutive_days_off', type: 'toggle', label: 'Group days off together', desc: "Keep each person's days off in a block rather than scattered through the week." },
  { key: 'balance_keyholder_shifts', type: 'toggle', label: 'Balance keyholder shifts', desc: 'Spread open and close shifts across all keyholders rather than the same person.' },
]
const DEFAULTS = { enforce_keyholder: true, min_rest_hours: 11, max_consecutive_days: 5, fair_distribution: true, prefer_consecutive_days_off: true, balance_keyholder_shifts: true }

function SaveStatus({ T, state }) {
  const c = state === 'saving' ? { c: T.muted, t: 'Saving…' } : state === 'saved' ? { c: T.green, t: 'Saved' } : state === 'error' ? { c: T.red, t: 'Couldn’t save, retry' } : null
  if (!c) return null
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: c.c }}>{state === 'saved' && <Icon path={Ic.check} size={14} stroke={2.6} />}{c.t}</span>
}

export default function RulesPage() {
  const { T } = useTheme()
  const [rules, setRules] = useState(DEFAULTS)
  const [locationId, setLocationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const rulesRef = useRef(rules)
  const locRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/rules')
        const data = await res.json()
        if (Array.isArray(data) && data[0]) { const r = { ...DEFAULTS, ...(data[0].rules || {}) }; setRules(r); rulesRef.current = r; setLocationId(data[0].location_id); locRef.current = data[0].location_id }
      } catch { /* non-fatal, use defaults */ } finally { setLoading(false) }
    })()
  }, [])

  const doSave = useCallback(async (r) => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/rules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: locRef.current, rules: r }) })
      if (!res.ok) throw new Error()
      setSaveState('saved'); setTimeout(() => setSaveState((x) => (x === 'saved' ? 'idle' : x)), 1400)
    } catch { setSaveState('error') }
  }, [])
  // autosave: update immediately, persist after a short debounce
  const update = useCallback((key, value) => {
    const next = { ...rulesRef.current, [key]: value }
    rulesRef.current = next
    setRules(next)
    setSaveState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSave(rulesRef.current), 500)
  }, [doSave])
  useEffect(() => () => { if (saveTimer.current) { clearTimeout(saveTimer.current); doSave(rulesRef.current) } }, [doSave])

  if (loading) return <div style={{ fontFamily: T.font, padding: 60, textAlign: 'center', color: T.faint }}>Loading rules…</div>

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 780, margin: '0 auto', padding: '40px 32px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Rules</h1>
        <div style={{ marginTop: 8 }}><SaveStatus T={T} state={saveState} /></div>
      </div>
      <p style={{ fontSize: 16, color: T.muted, margin: '6px 0 0', letterSpacing: '-0.01em' }}>Scheduling rules applied to every rota you generate.</p>
      <p style={{ fontSize: 13, color: T.faint, margin: '10px 0 24px', lineHeight: 1.5, maxWidth: 620 }}>Every rule carries equal weight, and the rota always generates. If a rule can't be fully met, it's flagged for you in the Rota Builder. Changes save automatically.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {RULES.map((rule) => {
          const value = rules[rule.key]
          const on = rule.type === 'toggle' ? value === true : true
          return (
            <Card key={rule.key} pad="18px 20px" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 3, letterSpacing: '-0.01em' }}>{rule.label}</div>
                <p style={{ fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5, letterSpacing: '-0.01em' }}>{rule.desc}</p>
              </div>
              {rule.type === 'stepper'
                ? <Stepper value={typeof value === 'number' ? value : rule.min} onChange={(v) => update(rule.key, v)} min={rule.min} max={rule.max} suffix={rule.unit} />
                : <Switch on={on} onChange={() => update(rule.key, !on)} />}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
