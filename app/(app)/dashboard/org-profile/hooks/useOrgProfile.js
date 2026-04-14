'use client'

import { useState, useEffect, useCallback } from 'react'

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

  const patchTo = useCallback(async (path, body) => {
    try {
      const res = await fetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Failed to patch ${path}`)
      await load()
    } catch (err) {
      console.error(err)
    }
  }, [load])

  const patchOrg = useCallback((fields) => patchTo('/api/org-profile/organization', fields), [patchTo])
  const patchLocation = useCallback((fields) => patchTo('/api/org-profile/location', fields), [patchTo])
  const patchRules = useCallback((fields) => patchTo('/api/org-profile/location-rules', fields), [patchTo])
  const patchLocationHours = useCallback((fields) => patchTo('/api/org-profile/location-hours', fields), [patchTo])

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