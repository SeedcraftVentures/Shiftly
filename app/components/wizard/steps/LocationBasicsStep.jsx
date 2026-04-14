'use client'

import { StepChip, TextField, NumberField, CurrencySelect } from '@/app/components/ui'
import { LocationIcon } from '@/app/lib/icons'

function parseCity(address) {
  if (!address) return ''
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  return parts.length >= 2 ? parts[parts.length - 1] : ''
}

export default function Step2LocationBasics({ state }) {
  const { businessName, address, locationNickname, currency, minWage, selectedCurrency, setField } = state

  const suggestedNickname = locationNickname || parseCity(address)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <StepChip icon={<LocationIcon size={13} />} label="Location" active />

      <h1 className="heading-page">Location basics</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 24px' }}>
          Where is it and what should we call it?
        </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, display: 'block' }}>
            Address
          </label>
          <TextField
            value={address}
            onChange={v => setField('address', v)}
            placeholder="e.g. 123 High Street, London"
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, display: 'block' }}>
            Location nickname
          </label>
          <TextField
            value={locationNickname}
            onChange={v => setField('locationNickname', v)}
            placeholder={suggestedNickname || 'e.g. City Centre'}
            size="md"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, display: 'block' }}>
              Currency
            </label>
            <CurrencySelect
              value={currency}
              onChange={v => setField('currency', v)}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, display: 'block' }}>
              Minimum wage
            </label>
            <NumberField
              value={minWage}
              onChange={v => setField('minWage', v)}
              placeholder={String(selectedCurrency.defaultMinWage)}
              prefix={selectedCurrency.symbol}
              min={0}
              step={0.01}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 12 }}>
        You can add more locations later from Settings.
      </p>
    </div>
  )
}
