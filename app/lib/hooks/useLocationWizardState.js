'use client'

import { useState } from 'react'
import { CURRENCIES, DAYS_FULL, INDUSTRY_TEAMS, getWeekdays, getWeekends, defaultHours, DEFAULT_CURRENCY } from '@/app/lib/constants'

/**
 * State hook for the 4 location-configuring steps (basics, hours, teams, staff).
 *
 * @param {object} [opts]
 * @param {string} [opts.industry] - If set, presetTeams will be pulled from INDUSTRY_TEAMS.
 *                                    Onboarding passes the industry from its own state.
 */
export default function useLocationWizardState(opts = {}) {
  const { industry = null } = opts

  // Basics
  const [address, setAddress] = useState('')
  const [locationNickname, setLocationNickname] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [minWage, setMinWage] = useState('')

  // Hours
  const [hours, setHours] = useState(defaultHours())

  // Teams
  const [selectedTeams, setSelectedTeams] = useState([])
  const [customTeam, setCustomTeam] = useState('')

  // Staff
  const [staffByTeam, setStaffByTeam] = useState({})

  // Derived
  const presetTeams = industry ? (INDUSTRY_TEAMS[industry] || []) : []
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  // ── Setters ──────────────────────────────────────────────────────────────

  function setField(field, value) {
    const setters = {
      address: setAddress,
      locationNickname: setLocationNickname,
      currency: setCurrency,
      minWage: setMinWage,
      customTeam: setCustomTeam,
    }
    if (setters[field]) setters[field](value)
  }

  // ── Teams ────────────────────────────────────────────────────────────────

  function toggleTeam(id, label) {
    setSelectedTeams(prev => {
      const exists = prev.find(t => t.id === id)
      if (exists) return prev.filter(t => t.id !== id)
      return [...prev, { id, label }]
    })
  }

  function addCustomTeam() {
    const trimmed = customTeam.trim()
    if (!trimmed) return
    const id = `custom_${Date.now()}`
    setSelectedTeams(prev => [...prev, { id, label: trimmed }])
    setCustomTeam('')
  }

  function removeTeam(id) {
    setSelectedTeams(prev => prev.filter(t => t.id !== id))
  }

  // ── Hours ────────────────────────────────────────────────────────────────

  function updateDayHours(day, data) {
    setHours(prev => ({ ...prev, [day]: data }))
  }

  function copyTo(sourceDay, target) {
    const source = hours[sourceDay]
    setHours(prev => {
      const updated = { ...prev }
      const targets =
        target === 'all' ? DAYS_FULL :
        target === 'weekdays' ? getWeekdays() :
        target === 'weekends' ? getWeekends() :
        [target]
      targets.forEach(d => {
        if (d !== sourceDay) {
          updated[d] = {
            ...updated[d],
            opening: source.opening,
            first_shift: source.first_shift,
            last_shift: source.last_shift,
            closing: source.closing,
          }
        }
      })
      return updated
    })
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  function addStaffToTeam(teamId, input) {
    const names = input.split(',').map(n => n.trim()).filter(Boolean)
    if (names.length === 0) return
    setStaffByTeam(prev => ({
      ...prev,
      [teamId]: [...(prev[teamId] || []), ...names],
    }))
  }

  function removeStaffFromTeam(teamId, index) {
    setStaffByTeam(prev => ({
      ...prev,
      [teamId]: (prev[teamId] || []).filter((_, i) => i !== index),
    }))
  }

  return {
    // State
    address,
    locationNickname,
    currency,
    minWage,
    hours,
    selectedTeams,
    customTeam,
    staffByTeam,

    // Derived
    presetTeams,
    selectedCurrency,

    // Actions
    setField,
    toggleTeam,
    addCustomTeam,
    removeTeam,
    updateDayHours,
    copyTo,
    addStaffToTeam,
    removeStaffFromTeam,
  }
}