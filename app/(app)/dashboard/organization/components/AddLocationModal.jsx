'use client'

import { useState } from 'react'
import { TextField, NumberField, CurrencySelect, Button } from '@/app/components/ui'
import { CURRENCIES } from '@/app/lib/constants'
import { effectiveCurrency } from '@/app/lib/utils/currencyUtils'

export default function AddLocationModal({ organization, onClose, onAdded }) {
  const orgCurrencyCode = effectiveCurrency(null, organization)
  const orgCurrency = CURRENCIES.find(c => c.code === orgCurrencyCode) || CURRENCIES[0]

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [currencyOverride, setCurrencyOverride] = useState('') // '' = inherit
  const [minWage, setMinWage] = useState(String(orgCurrency.defaultMinWage))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Selectable currencies in the override dropdown — exclude the org's current currency
  const overrideOptions = CURRENCIES.filter(c => c.code !== orgCurrencyCode)

  // Currency used for the min wage prefix: override if chosen, else org
  const activeCurrency = currencyOverride
    ? CURRENCIES.find(c => c.code === currencyOverride) || orgCurrency
    : orgCurrency

  const isCurrencyOverridden = currencyOverride !== ''
  const isMinWageOverridden =
    minWage !== '' && Number(minWage) !== Number(orgCurrency.defaultMinWage)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          currency: isCurrencyOverridden ? currencyOverride : null,
          min_wage: minWage === '' ? null : Number(minWage),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add location')
      }
      await onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const labelStyle = {
    display: 'block',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    color: 'var(--gray-600)',
    marginBottom: 6,
  }

  const overrideHintStyle = {
    fontSize: 'var(--text-xs)',
    color: 'var(--shiftly-pink)',
    fontWeight: 500,
    marginLeft: 6,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--gray-0)',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--gray-900)',
            margin: '0 0 6px',
          }}
        >
          Add a location
        </h2>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            margin: '0 0 20px',
          }}
        >
          Defaults are inherited from your organization. Change them here to override for this location only.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Location name</label>
            <TextField
              value={name}
              onChange={setName}
              size="sm"
              placeholder="e.g. Main Street"
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>Address</label>
            <TextField
              value={address}
              onChange={setAddress}
              size="sm"
              placeholder="Street, city, postcode"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Currency
              {isCurrencyOverridden && <span style={overrideHintStyle}>Overridden</span>}
            </label>
            {overrideOptions.length > 0 ? (
              <select
                value={currencyOverride}
                onChange={e => setCurrencyOverride(e.target.value)}
                style={{
                  padding: '8px 14px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  border: `1.5px solid ${isCurrencyOverridden ? 'var(--shiftly-pink)' : 'var(--gray-200)'}`,
                  borderRadius: 8,
                  color: 'var(--gray-800)',
                  background: 'var(--gray-0)',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'border-color .15s',
                }}
              >
                <option value="">{orgCurrencyCode} (from organization)</option>
                {overrideOptions.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            ) : (
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
                {orgCurrencyCode}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>
              Min wage
              {isMinWageOverridden && <span style={overrideHintStyle}>Overridden</span>}
            </label>
            <NumberField
              value={minWage}
              onChange={setMinWage}
              prefix={activeCurrency.symbol}
              step={0.01}
              min={0}
              style={{ width: 140 }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--red-500)', margin: 0 }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
          >
            {saving ? 'Adding…' : 'Add location'}
          </Button>
        </div>
      </div>
    </div>
  )
}