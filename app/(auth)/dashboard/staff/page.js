'use client'

import { useState, useMemo, useCallback } from 'react'
import { useStaff } from './hooks/useStaff'
import { DAYS } from './utils/staffHelpers'
import StaffFilterBar from './components/StaffFilterBar'
import StaffWarningBar from './components/StaffWarningBar'
import StaffList from './components/StaffList'
import AvailabilityGrid from './components/AvailabilityGrid'
import FixIssuesModal from './components/FixIssuesModal'

export default function StaffPage() {
  const {
    staff, teams, shifts, loading, error,
    legalLimit, minWage, totalContractedHours,
    warnings, coverageMetrics,
    addStaff, updateStaff, deleteStaff, updateAvailabilityGrid,
  } = useStaff()

  const [filterTeamId, setFilterTeamId] = useState('all')
  const [openStaffId, setOpenStaffId] = useState(null)
  const [scrollToId, setScrollToId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [showFixModal, setShowFixModal] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState({})

  const filteredStaff = useMemo(() =>
    filterTeamId === 'all' ? staff : staff.filter(s => s.team_id === parseInt(filterTeamId))
  , [staff, filterTeamId])

  const teamsToShow = useMemo(() =>
    filterTeamId === 'all' ? teams : teams.filter(t => t.id === parseInt(filterTeamId))
  , [teams, filterTeamId])

  const shiftLengths = useMemo(() => {
    const lengths = new Set()
    teams.forEach(t => { if (Array.isArray(t.shift_lengths)) t.shift_lengths.forEach(l => lengths.add(l)) })
    if (lengths.size === 0) return [4, 6, 8, 10, 12]
    return Array.from(lengths).sort((a, b) => a - b)
  }, [teams])

  const handleAddStaff = useCallback(async () => {
    try {
      const newMember = await addStaff(filterTeamId)
      if (newMember) {
        setOpenStaffId(newMember.id)
        setSelectedStaffId(newMember.id)
        setScrollToId(newMember.id)
        setTimeout(() => setScrollToId(null), 300)
      }
    } catch (err) { console.error('Failed to add staff:', err) }
  }, [addStaff, filterTeamId])

  const handleToggleStaff = useCallback((id) => {
    setOpenStaffId(prev => {
      const newOpen = prev === id ? null : id
      if (newOpen) setSelectedStaffId(id)
      return newOpen
    })
  }, [])

  const handleSelectStaffInGrid = useCallback((staffId) => {
    setSelectedStaffId(staffId)
  }, [])

  const handleWarningStaffClick = useCallback((staffId) => {
    setOpenStaffId(staffId)
    setSelectedStaffId(staffId)
    setScrollToId(staffId)
    setTimeout(() => setScrollToId(null), 300)
  }, [])

  const handleConfirmFixes = useCallback(async () => {
    const fixKeys = Object.keys(selectedFixes).filter(k => selectedFixes[k])
    for (const key of fixKeys) {
      const [staffId] = key.split('-')
      const warning = warnings.find(w => w.staffId === parseInt(staffId))
      if (!warning) continue
      if (warning.type === 'issue') {
        const grid = {}
        DAYS.forEach(d => { grid[d] = 'available' })
        try { await updateAvailabilityGrid(parseInt(staffId), grid) } catch { /* continue */ }
      }
    }
    setShowFixModal(false)
    setSelectedFixes({})
  }, [selectedFixes, warnings, updateAvailabilityGrid])

  const inner = { maxWidth: 1000, margin: '0 auto', padding: '0 24px' }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading staff…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#EF4444', fontSize: 14 }}>{error}</div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: '#F9FAFB', color: '#111827',
    }}>

      {/* ── Page header ── */}
      <div style={{ background: '#F9FAFB', paddingTop: 28, paddingBottom: 0 }}>
        <div style={inner}>
          <h1 style={{
            fontFamily: "'Cal Sans', 'Plus Jakarta Sans', sans-serif",
            fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px',
          }}>Staff</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
            Manage your team members, contracted hours, and availability for rota generation.
          </p>
        </div>
      </div>

      {/* ── Sticky filter + warning bar ── */}
      <div style={{
        background: '#F9FAFB', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 30, paddingBottom: 8,
      }}>
        <div style={{ ...inner, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '0 18px' }}>
            <StaffFilterBar
              teams={teams}
              staff={staff}
              filterTeamId={filterTeamId}
              totalContractedHours={totalContractedHours}
              coverageMetrics={coverageMetrics}
              onFilterChange={setFilterTeamId}
              onAddStaff={handleAddStaff}
            />
          </div>
          <StaffWarningBar
            warnings={warnings}
            coverageMetrics={coverageMetrics}
            onStaffClick={handleWarningStaffClick}
            onFixIssues={() => { setSelectedFixes({}); setShowFixModal(true) }}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 8, paddingBottom: 24 }}>
        <div style={inner}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StaffList
              teams={teamsToShow}
              staff={staff}
              filteredStaff={filteredStaff}
              openStaffId={openStaffId}
              onToggleStaff={handleToggleStaff}
              onUpdateStaff={updateStaff}
              onDeleteStaff={deleteStaff}
              legalLimit={legalLimit}
              minWage={minWage}
              shiftLengths={shiftLengths}
              scrollToId={scrollToId}
            />
            <AvailabilityGrid
              teams={teamsToShow}
              staff={staff}
              filteredStaff={filteredStaff}
              shifts={shifts}
              selectedDay={selectedDay}
              selectedStaffId={selectedStaffId}
              warnings={warnings}
              onSelectDay={setSelectedDay}
              onSelectStaff={handleSelectStaffInGrid}
              onUpdateAvailability={updateAvailabilityGrid}
            />
          </div>
        </div>
      </div>

      {/* ── Fix Issues Modal ── */}
      {showFixModal && (
        <FixIssuesModal
          warnings={warnings}
          teams={teams}
          coverageMetrics={coverageMetrics}
          selectedFixes={selectedFixes}
          onToggleFix={(key) => setSelectedFixes(prev => ({ ...prev, [key]: !prev[key] }))}
          onConfirm={handleConfirmFixes}
          onClose={() => setShowFixModal(false)}
        />
      )}
    </div>
  )
}