'use client'

import { useState } from 'react'
import { Section, FieldRow, TextField, NumberField, Chip } from '@/app/components/ui'
import Button from '@/app/components/Button'
import { getCurrencyPrefix, DEFAULT_CURRENCY } from '@/app/lib/constants'

export default function LocationSection({ location, onSave }) {
  const [nickname, setNickname] = useState(location.name || '')
  const [address, setAddress] = useState(location.address || '')
  const [minWage, setMinWage] = useState(location.min_wage ?? '')
  const [maxHours, setMaxHours] = useState(location.max_consecutive_hours ?? '')
  const [shiftLengths, setShiftLengths] = useState(location.shift_lengths || [])
  const [newLength, setNewLength] = useState('')

  const saveField = (field, value) => onSave({ [field]: value })

  const addShiftLength = () => {
    const val = parseFloat(newLength)
    if (!isNaN(val) && val > 0 && !shiftLengths.includes(val)) {
      const updated = [...shiftLengths, val].sort((a, b) => a - b)
      setShiftLengths(updated)
      onSave({ shift_lengths: updated })
      setNewLength('')
    }
  }

  const removeShiftLength = (val) => {
    const updated = shiftLengths.filter(l => l !== val)
    setShiftLengths(updated)
    onSave({ shift_lengths: updated })
  }

  const currencyPrefix = getCurrencyPrefix(location.currency)

  return (
    <Section
      title="Location"
      description="Address, currency, and wage settings"
    >
      <FieldRow label="Location nickname">
        <TextField
          value={nickname}
          onChange={setNickname}
          onBlur={() => nickname.trim() && saveField('name', nickname.trim())}
          size="sm"
          placeholder="e.g. Main Street"
        />
      </FieldRow>

      <FieldRow label="Address">
        <TextField
          value={address}
          onChange={setAddress}
          onBlur={() => address.trim() && saveField('address', address.trim())}
          size="sm"
          placeholder="Full address"
        />
      </FieldRow>

      <FieldRow label="Currency" description="Contact support to change">
        <div
          style={{
            display: 'inline-flex',
            padding: '8px 14px',
            borderRadius: 8,
            background: 'var(--gray-50)',
            border: '1.5px solid var(--gray-200)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-500)',
          }}
        >
          {location.currency || DEFAULT_CURRENCY}
        </div>
      </FieldRow>

      <FieldRow label="Min wage">
        <NumberField
          value={minWage}
          onChange={setMinWage}
          onBlur={() => saveField('min_wage', minWage === '' ? null : Number(minWage))}
          prefix={currencyPrefix}
          step={0.01}
          min={0}
          style={{ width: 120 }}
        />
      </FieldRow>

      <FieldRow label="Max consecutive hours">
        <NumberField
          value={maxHours}
          onChange={setMaxHours}
          onBlur={() => saveField('max_consecutive_hours', maxHours === '' ? null : Number(maxHours))}
          step={1}
          min={1}
          style={{ width: 120 }}
        />
      </FieldRow>

      <FieldRow label="Default shift lengths">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {shiftLengths.map(len => (
            <Chip key={len} onRemove={() => removeShiftLength(len)}>
              {len}h
            </Chip>
          ))}
          <input
            type="number"
            value={newLength}
            onChange={e => setNewLength(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addShiftLength()}
            placeholder="+ Add"
            style={{
              width: 70,
              padding: '6px 10px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              border: '1.5px dashed var(--gray-200)',
              borderRadius: 6,
              outline: 'none',
              color: 'var(--gray-700)',
              background: 'var(--gray-0)',
            }}
          />
          {newLength && <Button variant="secondary" size="sm" onClick={addShiftLength}>Add</Button>}
        </div>
      </FieldRow>
    </Section>
  )
}