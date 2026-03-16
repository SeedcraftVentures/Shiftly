import { useState, useEffect, useCallback } from 'react'

export function useRules() {
  const [teamRules, setTeamRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/rules')
        if (!res.ok) throw new Error('Failed to load rules')
        const data = await res.json()
        setTeamRules(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load rules — please refresh')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateRule = useCallback((teamId, key, value) => {
    setTeamRules(prev => prev.map(tr =>
      tr.team_id === teamId
        ? { ...tr, rules: { ...tr.rules, [key]: value } }
        : tr
    ))
  }, [])

  const saveRules = useCallback(async (teamId) => {
    const tr = teamRules.find(r => r.team_id === teamId)
    if (!tr) return
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, rules: tr.rules }),
    })
    if (!res.ok) throw new Error('Save failed')
    return await res.json()
  }, [teamRules])

  return { teamRules, loading, error, updateRule, saveRules }
}