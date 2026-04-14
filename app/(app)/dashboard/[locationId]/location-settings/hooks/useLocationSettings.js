'use client'

import { useState, useEffect, useCallback } from 'react'

export default function useLocationSettings(locationId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!locationId) return
    try {
      const res = await fetch(`/api/locations/${locationId}/profile`)
      if (!res.ok) throw new Error('Failed to fetch location profile')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      console.error('Error loading location profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [locationId])

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

  const patchLocation = useCallback((fields) => patchTo(`/api/locations/${locationId}`, fields), [patchTo, locationId])
  const patchRules = useCallback((fields) => patchTo(`/api/locations/${locationId}/rules`, fields), [patchTo, locationId])
  const patchLocationHours = useCallback((fields) => patchTo(`/api/locations/${locationId}/hours`, fields), [patchTo, locationId])

  return {
    data,
    loading,
    error,
    reload: load,
    patchLocation,
    patchRules,
    patchLocationHours,
  }
}