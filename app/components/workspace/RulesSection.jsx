'use client'

import { useState, useEffect, useCallback } from 'react'

// Pink SVG icons instead of emojis
const RuleIcons = {
  no_double_shifts: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#FF1F7D" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  rest_between_shifts: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#FF1F7D" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  no_clopening: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#FF1F7D" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  fair_weekend_distribution: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#FF1F7D" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  max_consecutive_days: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#FF1F7D" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  minimum_days_off: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#FF1F7D" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
}

const AVAILABLE_RULES = [
  { type: 'no_double_shifts', name: 'No Double Shifts', description: 'Staff cannot work overlapping shifts on the same day', hasValue: false, defaultValue: null },
  { type: 'rest_between_shifts', name: 'Rest Between Shifts', description: 'Minimum hours of rest required between consecutive shifts', hasValue: true, valueLabel: 'Hours', defaultValue: 11, min: 8, max: 14 },
  { type: 'no_clopening', name: 'No Clopening', description: 'No closing shift followed by opening shift the next day', hasValue: false, defaultValue: null },
  { type: 'fair_weekend_distribution', name: 'Fair Weekends', description: 'Weekend shifts distributed evenly among available staff', hasValue: false, defaultValue: null },
  { type: 'max_consecutive_days', name: 'Max Consecutive Days', description: 'Maximum number of days a staff member can work in a row', hasValue: true, valueLabel: 'Days', defaultValue: 6, min: 3, max: 7 },
  { type: 'minimum_days_off', name: 'Minimum Days Off', description: 'Minimum days off required per week', hasValue: true, valueLabel: 'Days', defaultValue: 1, min: 1, max: 3 },
]

export default function RulesSection({ selectedTeamId }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  const loadRules = useCallback(async () => {
    if (!selectedTeamId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/rules?team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Failed to load rules')
      const savedRules = await res.json()

      const merged = AVAILABLE_RULES.map(rule => {
        const saved = savedRules.find(r => r.type === rule.type)
        return {
          ...rule,
          id: saved?.id || null,
          enabled: saved ? saved.enabled : false,
          value: saved?.value ?? rule.defaultValue
        }
      })
      setRules(merged)
    } catch (err) {
      console.error('Error loading rules:', err)
      setRules(AVAILABLE_RULES.map(r => ({ ...r, id: null, enabled: false, value: r.defaultValue })))
    } finally {
      setLoading(false)
    }
  }, [selectedTeamId])

  useEffect(() => { loadRules() }, [loadRules])

  // Use POST for both create and update, the API handles upsert logic
  const saveRule = async (rule) => {
    setSaving(rule.type)
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: selectedTeamId,
          type: rule.type,
          name: rule.name,
          enabled: rule.enabled,
          value: rule.value
        })
      })
      if (!res.ok) throw new Error('Failed to save rule')
      const saved = await res.json()
      setRules(prev => prev.map(r =>
        r.type === rule.type ? { ...r, id: saved.id || r.id } : r
      ))
    } catch (err) {
      console.error('Error saving rule:', err)
    } finally {
      setSaving(null)
    }
  }

  const toggleRule = (type) => {
    setRules(prev => {
      const updated = prev.map(r => r.type === type ? { ...r, enabled: !r.enabled } : r)
      const rule = updated.find(r => r.type === type)
      if (rule) saveRule(rule)
      return updated
    })
  }

  const updateValue = (type, value) => {
    setRules(prev => {
      const updated = prev.map(r => r.type === type ? { ...r, value: parseInt(value) || r.defaultValue } : r)
      const rule = updated.find(r => r.type === type)
      if (rule) saveRule(rule)
      return updated
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5">
        <h3 className="font-semibold text-gray-900 font-cal text-lg">Scheduling Rules</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          These constraints are enforced when generating rotas. {rules.filter(r => r.enabled).length} of {rules.length} active.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map(rule => (
          <div
            key={rule.type}
            className={`rounded-2xl border p-5 transition-all ${
              rule.enabled ? 'border-pink-200 bg-pink-50/40 shadow-sm' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  rule.enabled ? 'bg-pink-100' : 'bg-gray-100'
                }`}>
                  {RuleIcons[rule.type]}
                </div>
                <h4 className="text-sm font-semibold text-gray-900">{rule.name}</h4>
              </div>
              <button
                onClick={() => toggleRule(rule.type)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  rule.enabled ? '' : 'bg-gray-200'
                }`}
                style={rule.enabled ? { background: '#FF1F7D' } : {}}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  rule.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">{rule.description}</p>

            {rule.hasValue && rule.enabled && (
              <div className="mt-3 flex items-center gap-2">
                <select
                  value={rule.value}
                  onChange={(e) => updateValue(rule.type, e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  {Array.from({ length: rule.max - rule.min + 1 }, (_, i) => rule.min + i).map(v => (
                    <option key={v} value={v}>{v} {rule.valueLabel?.toLowerCase()}</option>
                  ))}
                </select>
                {saving === rule.type && (
                  <div className="w-3 h-3 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}