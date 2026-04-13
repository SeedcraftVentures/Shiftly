import { useState, useEffect, useCallback, useMemo } from 'react'
import { assignTeamColor } from '@/app/lib/constants'
import { buildResolvedHours } from '@/app/lib/utils/shiftUtils'

export function useShifts() {
  const [shifts, setShifts] = useState([])
  const [teams, setTeams] = useState([])
  const [locationHours, setLocationHours] = useState([])
  const [teamHourOverrides, setTeamHourOverrides] = useState([])
  const [shiftLengths, setShiftLengths] = useState([4, 6, 8])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Load ────────────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/shifts')
      if (!res.ok) throw new Error('Failed to fetch shifts')
      const data = await res.json()

      setShifts(data.shifts || [])
      setTeams(data.teams || [])
      setLocationHours(data.locationHours || [])
      setTeamHourOverrides(data.teamHourOverrides || [])
      setShiftLengths(data.shiftLengths || [4, 6, 8])
    } catch (err) {
      console.error('Failed to load shifts:', err)
      setError('Failed to load - please refresh')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // ── Derived ─────────────────────────────────────────────────────────────────

  const teamsWithColor = useMemo(() => assignTeamColor(teams), [teams])

  const resolvedHours = useMemo(
    () => buildResolvedHours(locationHours, teamHourOverrides),
    [locationHours, teamHourOverrides]
  )

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addShift = useCallback(async (teamId) => {
    const targetTeam = teamId || teamsWithColor[0]?.team_id
    if (!targetTeam) return null

    const body = {
      shift_team: targetTeam,
      shift_name: 'New Shift',
      shift_type: 'open',
      start_time: null,
      end_time: null,
      days: [0, 1, 2, 3, 4],
      break_duration: 0.5,
      break_is_paid: false,
      is_keyholder: true,
      num_staff_needed: 1,
    }

    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to create shift')

    const newShift = await res.json()
    setShifts(prev => [...prev, newShift])
    return newShift
  }, [teamsWithColor])

  const updateShift = useCallback(async (shiftId, updates, persist = false) => {
    // Optimistic update
    setShifts(prev => prev.map(s =>
      s.shift_id === shiftId ? { ...s, ...updates } : s
    ))

    if (persist) {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved = await res.json()
      setShifts(prev => prev.map(s => s.shift_id === shiftId ? saved : s))
    }
  }, [])

  const deleteShift = useCallback(async (shiftId) => {
    const res = await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    setShifts(prev => prev.filter(s => s.shift_id !== shiftId))
  }, [])

  return {
    shifts,
    teams: teamsWithColor,
    locationHours,
    teamHourOverrides,
    resolvedHours,
    shiftLengths,
    loading,
    error,
    addShift,
    updateShift,
    deleteShift,
    reload,
  }
}
