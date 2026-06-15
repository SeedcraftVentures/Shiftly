import { useState, useEffect, useCallback, useMemo } from 'react'
import { assignTeamColors, timeStringToDecimal, DEFAULT_SHIFT_LENGTHS } from '../utils/shifthelpers'

export function useShifts() {
  const [teams, setTeams] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [tr, sr] = await Promise.all([fetch('/api/teams'), fetch('/api/shifts')])
        const [td, sd] = await Promise.all([tr.json(), sr.json()])
        setTeams(Array.isArray(td) ? td : [])
        setShifts(Array.isArray(sd) ? sd : [])
      } catch (err) {
        console.error('Failed to load shifts:', err)
        setError('Failed to load — please refresh')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Derived team data ───────────────────────────────────────────────────────

  const teamsWithColor = useMemo(() => assignTeamColors(teams), [teams])

  const defaultTeam = useMemo(
    () => teamsWithColor.find(t => t.is_default) || teamsWithColor[0],
    [teamsWithColor]
  )

  // open_time/close_time now live on the Location (not Team); until /api/teams surfaces
  // them, fall back to sensible business hours (|| also catches a 0 from an absent value).
  const openTime = useMemo(
    () => timeStringToDecimal(defaultTeam?.open_time) || 9,
    [defaultTeam]
  )

  const closeTime = useMemo(
    () => timeStringToDecimal(defaultTeam?.close_time) || 17,
    [defaultTeam]
  )

  const shiftLengths = useMemo(() => {
    const raw = defaultTeam?.shift_lengths
    if (Array.isArray(raw) && raw.length) return raw
    return DEFAULT_SHIFT_LENGTHS
  }, [defaultTeam])

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addShift = useCallback(async (filterTeamId) => {
    // Team ids are UUIDs in the new schema — do NOT parseInt them.
    const teamId = filterTeamId !== 'all'
      ? filterTeamId
      : teamsWithColor[0]?.id
    if (!teamId) return null

    const body = {
      team_id: teamId,
      name: 'New Shift',
      anchor_type: 'fixed',
      start: openTime,
      end: openTime + 8,
      days: [0, 1, 2, 3, 4, 5, 6],
      staff: 1,
      keyholder: false,
      break_duration_mins: 0,
      break_type: 'unpaid',
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
  }, [teamsWithColor, openTime])

  const updateShift = useCallback(async (id, updated, persist = false) => {
    // Optimistic update immediately
    setShifts(prev => prev.map(s => s.id === id ? { ...updated, id } : s))

    if (persist) {
      const res = await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updated }),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved = await res.json()
      // Reconcile with server response
      setShifts(prev => prev.map(s => s.id === id ? saved : s))
    }
  }, [])

  const deleteShift = useCallback(async (id) => {
    const res = await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    setShifts(prev => prev.filter(s => s.id !== id))
  }, [])

  const addRecommendedShifts = useCallback(async (recommendations, selectedRecs) => {
    const toAdd = recommendations.filter(r => selectedRecs[r.id])
    if (!toAdd.length) return

    const created = await Promise.all(
      toAdd.map(rec =>
        fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: rec.teamId,
            name: `Gap Fill ${rec.fromLabel}–${rec.toLabel}`,
            anchor_type: 'fixed',
            start: rec.startH,
            end: rec.endH,
            days: [...rec.days],
            staff: 1,
            keyholder: false,
            break_duration_mins: 0,
            break_type: 'unpaid',
          }),
        }).then(r => r.json())
      )
    )
    setShifts(prev => [...prev, ...created])
  }, [])

  return {
    // State
    shifts,
    teams: teamsWithColor,
    loading,
    error,
    // Business settings derived from default team
    openTime,
    closeTime,
    shiftLengths,
    // CRUD
    addShift,
    updateShift,
    deleteShift,
    addRecommendedShifts,
  }
}