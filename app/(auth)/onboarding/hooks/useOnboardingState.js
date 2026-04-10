'use client'

import { useState } from 'react'
import { INDUSTRY_TEAMS, CURRENCIES, DAYS_FULL, getWeekdays, getWeekends, defaultHours } from '@/app/lib/constants'

export default function useOnboardingState() {
  // Step 1 — Organization
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState(null)

  // Step 2 — Location basics
  const [address, setAddress] = useState('')
  const [locationNickname, setLocationNickname] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [minWage, setMinWage] = useState('')

  // Step 3 — Hours
  const [hours, setHours] = useState(defaultHours())

  // Step 4 — Teams
  const [selectedTeams, setSelectedTeams] = useState([])
  const [customTeam, setCustomTeam] = useState('')

  // Step 5 — Staff
  const [staffByTeam, setStaffByTeam] = useState({})

  // Derived
  const presetTeams = industry ? (INDUSTRY_TEAMS[industry] || []) : []
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  // ── Setters ──

  function setField(field, value) {
    const setters = {
      businessName: setBusinessName,
      industry: setIndustry,
      address: setAddress,
      locationNickname: setLocationNickname,
      currency: setCurrency,
      minWage: setMinWage,
      customTeam: setCustomTeam,
    }
    if (setters[field]) setters[field](value)
  }

  // ── Teams ──

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

  // ── Hours ──

  function updateDayHours(day, data) {
    setHours(prev => ({ ...prev, [day]: data }))
  }

  function copyTo(sourceDay, target) {
    const source = hours[sourceDay]
    setHours(prev => {
      const updated = { ...prev }
      const targets = target === 'all' ? DAYS_FULL
        : target === 'weekdays' ? getWeekdays()
        : target === 'weekends' ? getWeekends()
        : [target]
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

  // ── Staff ──

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
    businessName,
    industry,
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
