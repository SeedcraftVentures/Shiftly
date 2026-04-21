'use client'

import { useState, useEffect, useCallback } from 'react'
import { INDUSTRIES, CURRENCIES } from '@/app/lib/constants'

export default function BusinessDetailsPage() {
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/organization')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setOrg(data.organization)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (fields) => {
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error('Failed to save')
      setOrg(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>Loading…</div>
  if (!org) return <div style={{ padding: 24, color: 'var(--red-500)', fontSize: 'var(--text-sm)' }}>Failed to load.</div>

  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Industry</label>
        <select
          value={org.industry || ''}
          onChange={e => save({ industry: e.target.value })}
          style={{ padding: '8px 14px', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1.5px solid var(--gray-200)', borderRadius: 8, color: 'var(--gray-800)', background: 'var(--gray-0)', outline: 'none', cursor: 'pointer' }}
        >
          {INDUSTRIES.map(ind => (
            <option key={ind.value} value={ind.value}>{ind.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Default currency</label>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginBottom: 6 }}>Locations can override this individually</p>
        <select
          value={org.currency || 'GBP'}
          onChange={e => save({ currency: e.target.value })}
          style={{ padding: '8px 14px', fontSize: 'var(--text-sm)', fontWeight: 600, border: '1.5px solid var(--gray-200)', borderRadius: 8, color: 'var(--gray-800)', background: 'var(--gray-0)', outline: 'none', cursor: 'pointer' }}
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}