import { useState, useEffect, useCallback, useMemo } from 'react'
import { assignTeamColors, getStaffWarnings, getCoverageMetrics, DEFAULT_LEGAL_LIMIT } from '../utils/staffHelpers'

export function useStaff() {
  const [staff, setStaff] = useState([])
  const [teams, setTeams] = useState([])
  const [shifts, setShifts] = useState([])
  const [locale, setLocale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sr, tr, shr] = await Promise.all([
          fetch('/api/staff'),
          fetch('/api/teams'),
          fetch('/api/shifts'),
        ])
        const [sd, td, shd] = await Promise.all([sr.json(), tr.json(), shr.json()])

        const teamsData = Array.isArray(td) ? td : []
        setStaff(Array.isArray(sd) ? sd : [])
        setTeams(teamsData)
        setShifts(Array.isArray(shd) ? shd : [])

        const defaultTeam = teamsData.find(t => t.is_default) || teamsData[0]
        if (defaultTeam?.locale_id) {
          try {
            const lr = await fetch(`/api/locales?id=${defaultTeam.locale_id}`)
            if (lr.ok) setLocale(await lr.json())
          } catch { /* non-fatal */ }
        }
      } catch (err) {
        console.error('Failed to load staff:', err)
        setError('Failed to load — please refresh')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const teamsWithColor = useMemo(() => assignTeamColors(teams), [teams])
  const legalLimit = locale?.max_weekly_hours || DEFAULT_LEGAL_LIMIT
  const minWage = useMemo(() => 11.44, [locale])

  const totalContractedHours = useMemo(() =>
    staff.reduce((sum, s) => sum + (s.contracted_hours || 0), 0)
  , [staff])

  const warnings = useMemo(() =>
    getStaffWarnings(staff, shifts, teamsWithColor)
  , [staff, shifts, teamsWithColor])

  const coverageMetrics = useMemo(() =>
    getCoverageMetrics(shifts, staff)
  , [shifts, staff])

  const addStaff = useCallback(async (filterTeamId) => {
    // Team ids are UUIDs in the new schema, do NOT parseInt them.
    const teamId = filterTeamId !== 'all'
      ? filterTeamId
      : teamsWithColor[0]?.id
    if (!teamId) return null

    const body = {
      team_id: teamId,
      name: 'New Staff Member',
      email: '',
      contracted_hours: 0,
      max_hours: legalLimit,
      hourly_rate: 11.44,
      keyholder: false,
      availability_rules: [],
      invite_status: 'none',
    }

    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Failed to create staff member')
    const newMember = await res.json()
    setStaff(prev => [...prev, newMember])
    return newMember
  }, [teamsWithColor, legalLimit])

  const updateStaff = useCallback(async (id, updated, persist = false) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...updated, id } : s))
    if (persist) {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updated }),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved = await res.json()
      setStaff(prev => prev.map(s => s.id === id ? saved : s))
    }
  }, [])

  const deleteStaff = useCallback(async (id) => {
    const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    setStaff(prev => prev.filter(s => s.id !== id))
  }, [])

  const updateAvailabilityGrid = useCallback(async (id, grid) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, availability_grid: grid } : s))
    const member = staff.find(s => s.id === id)
    if (!member) return
    const res = await fetch('/api/staff', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...member, availability_grid: grid }),
    })
    if (!res.ok) throw new Error('Availability save failed')
    const saved = await res.json()
    setStaff(prev => prev.map(s => s.id === id ? saved : s))
  }, [staff])

  return {
    staff,
    teams: teamsWithColor,
    shifts,
    loading,
    error,
    legalLimit,
    minWage,
    totalContractedHours,
    warnings,
    coverageMetrics,
    addStaff,
    updateStaff,
    deleteStaff,
    updateAvailabilityGrid,
  }
}