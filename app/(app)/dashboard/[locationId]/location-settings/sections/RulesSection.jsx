'use client'

import { useState, useEffect } from 'react'
import { Section, RuleCard } from '@/app/components/ui'

const RULES = [
  {
    key: 'no_clopening',
    title: 'No clopening',
    description: 'Prevent close-then-open shifts back-to-back',
  },
  {
    key: 'no_double_shifts',
    title: 'No double shifts',
    description: 'Prevent two shifts in the same day',
  },
  {
    key: 'fair_weekend_distribution',
    title: 'Fair weekend distribution',
    description: 'Distribute weekend shifts evenly across staff',
  },
  {
    key: 'enforce_max_consecutive_days',
    title: 'Max consecutive days',
    description: 'Maximum days worked in a row',
    valueKey: 'max_consecutive_days',
    valueSuffix: 'days',
  },
  {
    key: 'enforce_min_days_off',
    title: 'Min days off per week',
    description: 'Minimum rest days per week',
    valueKey: 'min_days_off',
    valueSuffix: 'days',
  },
  {
    key: 'enforce_rest_between_shifts',
    title: 'Rest between shifts',
    description: 'Minimum hours between consecutive shifts',
    valueKey: 'min_rest_hours',
    valueSuffix: 'hours',
  },
]

export default function RulesSection({ rules, onSave }) {
  const [local, setLocal] = useState({
    no_clopening: rules.no_clopening ?? true,
    no_double_shifts: rules.no_double_shifts ?? true,
    fair_weekend_distribution: rules.fair_weekend_distribution ?? true,
    enforce_max_consecutive_days: rules.enforce_max_consecutive_days ?? true,
    max_consecutive_days: rules.max_consecutive_days ?? 6,
    enforce_min_days_off: rules.enforce_min_days_off ?? true,
    min_days_off: rules.min_days_off ?? 1,
    enforce_rest_between_shifts: rules.enforce_rest_between_shifts ?? true,
    min_rest_hours: rules.min_rest_hours ?? 11,
  })

  // Sync if parent rules change (e.g. reload after save)
  useEffect(() => {
    setLocal(prev => ({ ...prev, ...rules }))
  }, [rules])

  const update = (key, value) => {
    const updated = { ...local, [key]: value }
    setLocal(updated)
    onSave({ [key]: value })
  }

  return (
    <Section
      title="Scheduling Rules"
      description="Constraints Shiftly will respect when generating rotas"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {RULES.map(rule => (
          <RuleCard
            key={rule.key}
            title={rule.title}
            description={rule.description}
            enabled={local[rule.key]}
            onEnabledChange={v => update(rule.key, v)}
            value={rule.valueKey ? local[rule.valueKey] : undefined}
            onValueChange={rule.valueKey ? v => update(rule.valueKey, v) : undefined}
            valueSuffix={rule.valueSuffix}
          />
        ))}
      </div>
    </Section>
  )
}