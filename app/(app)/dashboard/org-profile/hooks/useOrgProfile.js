'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Fetches org profile data and provides patch helpers.
 * All patches optimistically update via reload() after the request completes.
 */
export default function useOrgProfile() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org-profile')
      if (!res.ok) throw new Error('Failed to fetch org profile')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      console.error('Error loading org profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Patch helpers ──────────────────────────────────────────────────────────

  const patch = useCallback(async (section, body) => {
    try {
      const res = await fetch('/api/org-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, ...body }),
      })
      if (!res.ok) throw new Error(`Failed to patch ${section}`)
      await load()
    } catch (err) {
      console.error(err)
    }
  }, [load])

  const patchOrg = useCallback((fields) => patch('organization', fields), [patch])
  const patchLocation = useCallback((fields) => patch('location', fields), [patch])
  const patchRules = useCallback((fields) => patch('rules', fields), [patch])
  const patchLocationHours = useCallback((fields) => patch('location_hours', fields), [patch])

  return {
    data,
    loading,
    error,
    reload: load,
    patchOrg,
    patchLocation,
    patchRules,
    patchLocationHours,
  }
}