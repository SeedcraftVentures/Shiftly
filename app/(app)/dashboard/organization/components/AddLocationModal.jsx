'use client'

import { useState } from 'react'
import { TextField, Button } from '@/app/components/ui'
import { effectiveCurrency } from '@/app/lib/utils/currencyUtils'

export default function AddLocationModal({ organization, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const inheritedCurrency = effectiveCurrency(null, organization)

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
          You can configure hours, teams, and rules after creating the location.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--gray-600)',
                marginBottom: 6,
              }}
            >
              Location name
            </label>
            <TextField
              value={name}
              onChange={setName}
              size="sm"
              placeholder="e.g. Main Street, Riverside"
              autoFocus
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--gray-600)',
                marginBottom: 6,
              }}
            >
              Address (optional)
            </label>
            <TextField
              value={address}
              onChange={setAddress}
              size="sm"
              placeholder="Street, city, postcode"
            />
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', margin: 0 }}>
            Currency: <strong>{inheritedCurrency}</strong> (inherited from organization)
          </p>

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