'use client'

import { useState } from 'react'
import { Section, FieldRow, TextField, NumberField, Chip, Button } from '@/app/components/ui'
import { CURRENCIES } from '@/app/lib/constants'
import { effectiveCurrency, effectiveCurrencyPrefix } from '@/app/lib/utils/currencyUtils'

export default function DetailsSection({ location, organization, onSave }) {
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

  // ── Currency logic ────────────────────────────────────────────────────────
  const orgCurrencyCode = effectiveCurrency(null, organization)
  const activeCurrencyCode = effectiveCurrency(location, organization)
  const currencyPrefix = effectiveCurrencyPrefix(location, organization)
  const isCurrencyOverridden = !!location.currency

  // Available override options exclude the org's currency
  const overrideOptions = CURRENCIES.filter(c => c.code !== orgCurrencyCode)

  const handleOverrideCurrency = () => {
    // Default to first non-org option
    const first = overrideOptions[0]
    if (first) onSave({ currency: first.code })
  }

  const handleResetCurrency = () => {
    onSave({ currency: null })
  }

  return (
    <Section
      title="Location Details"
      description="Address, currency, and wage settings for this location"
    >
      <FieldRow label="Location name">
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

      <FieldRow
        label="Currency"
        description={
          isCurrencyOverridden
            ? 'Overridden for this location'
            : 'Inherited from organization'
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isCurrencyOverridden ? (
            <>
              <select
                value={location.currency}
                onChange={e => onSave({ currency: e.target.value })}
                style={{
                  padding: '8px 14px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  border: '1.5px solid var(--shiftly-pink)',
                  borderRadius: 8,
                  color: 'var(--gray-800)',
                  background: 'var(--gray-0)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {overrideOptions.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
              <Button variant="secondary" size="sm" onClick={handleResetCurrency}>
                Reset to {orgCurrencyCode}
              </Button>
            </>
          ) : (
            <>
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
                {activeCurrencyCode}
              </div>
              {overrideOptions.length > 0 && (
                <Button variant="secondary" size="sm" onClick={handleOverrideCurrency}>
                  Override
                </Button>
              )}
            </>
          )}
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