'use client'

import { useState, useEffect, useCallback } from 'react'

export function useLocations() {
  const [locations, setLocations] = useState([])
  const [currentLocationId, setCurrentLocationId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [locsRes, lastRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/users/last-location'),
      ])
      const locsJson = locsRes.ok ? await locsRes.json() : { locations: [] }
      const lastJson = lastRes.ok ? await lastRes.json() : { last_location_id: null }

      const locs = locsJson.locations || []
      setLocations(locs)

      // Pick current: last-used if still accessible, else first available, else null
      const lastId = lastJson.last_location_id
      const isAccessible = lastId && locs.some(l => l.location_id === lastId)
      setCurrentLocationId(isAccessible ? lastId : (locs[0]?.location_id ?? null))
    } catch (err) {
      console.error('Error loading locations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const switchLocation = useCallback(async (locationId) => {
    setCurrentLocationId(locationId)
    try {
      await fetch('/api/users/last-location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId }),
      })
    } catch (err) {
      console.error('Failed to persist location switch:', err)
    }
  }, [])

  const currentLocation = locations.find(l => l.location_id === currentLocationId) || null

  return {
    locations,
    currentLocation,
    currentLocationId,
    switchLocation,
    loading,
    reload: load,
  }
}