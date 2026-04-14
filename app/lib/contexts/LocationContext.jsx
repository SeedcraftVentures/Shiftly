'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const LocationContext = createContext(null)

export function LocationProvider({ children }) {
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

  // Called after creating/deleting a location — refetches the list
  const refresh = useCallback(() => load(), [load])

  const currentLocation = locations.find(l => l.location_id === currentLocationId) || null

  const value = {
    locations,
    currentLocation,
    currentLocationId,
    switchLocation,
    refresh,
    loading,
  }

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocationContext() {
  const ctx = useContext(LocationContext)
  if (!ctx) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return ctx
}