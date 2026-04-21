import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { assignTeamColor } from '@/app/lib/constants'

export function useStaff() {
  const { locationId } = useParams()
  const [staff, setStaff] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!locationId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}/staff`)
      if (!res.ok) throw new Error('Failed to fetch staff')
      const data = await res.json()
      setStaff(data.staff || [])
      setTeams(data.teams || [])
    } catch (err) {
      console.error('Failed to load staff:', err)
      setError('Failed to load — please refresh')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => { reload() }, [reload])

  const teamsWithColor = useMemo(
    () => teams.map((t, i) => ({ ...t, ...assignTeamColor(i) })),
    [teams]
  )

  const addStaff = useCallback(async (filterTeamId) => {
    const targetTeam = filterTeamId && filterTeamId !== 'all'
      ? filterTeamId
      : teamsWithColor[0]?.team_id
    if (!targetTeam) return null

    const res = await fetch(`/api/locations/${locationId}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: targetTeam }),
    })
    if (!res.ok) throw new Error('Failed to create staff')

    const newStaff = await res.json()
    setStaff(prev => [...prev, newStaff])
    return newStaff
  }, [locationId, teamsWithColor])

  const updateStaff = useCallback(async (staffId, updates, persist = false) => {
    setStaff(prev => prev.map(s =>
      s.staff_id === staffId ? { ...s, ...updates } : s
    ))

    if (persist) {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved = await res.json()
      setStaff(prev => prev.map(s => s.staff_id === staffId ? saved : s))
    }
  }, [])

  const deleteStaff = useCallback(async (staffId) => {
    const res = await fetch(`/api/staff/${staffId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    setStaff(prev => prev.filter(s => s.staff_id !== staffId))
  }, [])

  const totalContractedHours = useMemo(
    () => staff.reduce((sum, s) => sum + (s.contracted_hours || 0), 0),
    [staff]
  )

  return {
    staff,
    teams: teamsWithColor,
    loading,
    error,
    totalContractedHours,
    addStaff,
    updateStaff,
    deleteStaff,
    reload,
  }
}