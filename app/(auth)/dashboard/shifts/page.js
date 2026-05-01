'use client'

import { useState, useMemo, useCallback } from 'react'
import { useShifts } from './hooks/useShifts'
import { DAYS, getTeamGaps, decimalToLabel } from './utils/shifthelpers'
import ShiftFilterBar from './components/ShiftFilterBar'
import WarningBar from './components/WarningBar'
import ShiftPatternList from './components/ShiftPatternList'
import WeekAtAGlance from './components/WeekAtAGlance'
import FixGapsModal from './components/FixGapsModal'

export default function ShiftsPage() {
  const {
    shifts, teams, loading, error,
    openTime, closeTime, shiftLengths,
    addShift, updateShift, deleteShift, addRecommendedShifts,
  } = useShifts()

  const [filterTeamId, setFilterTeamId] = useState('all')
  const [openShiftId, setOpenShiftId] = useState(null)
  const [scrollToId, setScrollToId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const [fixedLocks, setFixedLocks] = useState({})
  const [showFixModal, setShowFixModal] = useState(false)
  const [selectedRecs, setSelectedRecs] = useState({})

  const filteredShifts = useMemo(() =>
    filterTeamId === 'all' ? shifts : shifts.filter(s => s.team_id === parseInt(filterTeamId))
  , [shifts, filterTeamId])

  const teamsToCheck = useMemo(() =>
    filterTeamId === 'all' ? teams : teams.filter(t => t.id === parseInt(filterTeamId))
  , [teams, filterTeamId])

  const warnings = useMemo(() => {
    const w = []
    DAYS.forEach((day, di) => {
      teamsToCheck.forEach(team => {
        getTeamGaps(shifts, team.id, di).forEach(g => {
          w.push({ teamId: team.id, teamName: team.team_name, teamColor: team.color, day, di, from: decimalToLabel(g.s), to: decimalToLabel(g.e) })
        })
      })
    })
    return w
  }, [shifts, teamsToCheck])

  const handleAddShift = useCallback(async () => {
    try {
      const newShift = await addShift(filterTeamId)
      if (newShift) {
        setOpenShiftId(newShift.id)
        setScrollToId(newShift.id)
        setTimeout(() => setScrollToId(null), 300)
      }
    } catch (err) { console.error('Failed to add shift:', err) }
  }, [addShift, filterTeamId])

  const handleToggleShift = useCallback((id) => {
    setOpenShiftId(prev => prev === id ? null : id)
  }, [])

  const handleClickShiftCard = useCallback((id) => {
    setOpenShiftId(prev => prev === id ? null : id)
    setScrollToId(id)
    setTimeout(() => setScrollToId(null), 300)
  }, [])

  const handleSetFixedLock = useCallback((id, val) => {
    setFixedLocks(prev => ({ ...prev, [id]: val }))
  }, [])

  const handleConfirmRecs = useCallback(async (recommendations) => {
    try {
      await addRecommendedShifts(recommendations, selectedRecs)
      setShowFixModal(false)
      setSelectedRecs({})
    } catch (err) { console.error('Failed to add recommended shifts:', err) }
  }, [addRecommendedShifts, selectedRecs])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading shifts…</div>
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

  // Shared inner layout — constrains all content to 1000px centred with 24px side padding
  const inner = { maxWidth: 1000, margin: '0 auto', padding: '0 24px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F9FAFB', color: '#111827' }}>

      {/* ── Page header ── */}
      <div style={{ background: '#F9FAFB', paddingTop: 28, paddingBottom: 0 }}>
        <div style={inner}>
          <h1 style={{
            fontFamily: "'Cal Sans', 'Plus Jakarta Sans', sans-serif",
            fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px',
          }}>Shifts</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
            Define your shift patterns — the solver uses these to build rotas automatically.
          </p>
        </div>
      </div>

      {/* ── Sticky filter + warning bar ── */}
      <div style={{ background: '#F9FAFB', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30, paddingBottom: 8 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <ShiftFilterBar
              teams={teams} shifts={shifts} filterTeamId={filterTeamId}
              onFilterChange={setFilterTeamId} onAddShift={handleAddShift}
            />
          </div>
          <WarningBar
            warnings={warnings} onDayClick={setSelectedDay}
            onFixGaps={() => { setSelectedRecs({}); setShowFixModal(true) }}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 16, paddingBottom: 24 }}>
        <div style={inner}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ShiftPatternList
              teams={teams} shifts={shifts} filteredShifts={filteredShifts}
              openShiftId={openShiftId} onToggleShift={handleToggleShift}
              onUpdateShift={updateShift} onDeleteShift={deleteShift}
              fixedLocks={fixedLocks} onSetFixedLock={handleSetFixedLock}
              shiftLengths={shiftLengths} openTime={openTime} closeTime={closeTime}
              scrollToId={scrollToId}
            />
            <WeekAtAGlance
              teams={teamsToCheck} allShifts={shifts} filteredShifts={filteredShifts}
              selectedDay={selectedDay} openShiftId={openShiftId} warnings={warnings}
              onSelectDay={setSelectedDay} onClickShift={handleClickShiftCard}
            />
          </div>
        </div>
      </div>

      {showFixModal && (
        <FixGapsModal
          allShifts={shifts} teams={teamsToCheck} selectedRecs={selectedRecs}
          onToggleRec={(recId) => setSelectedRecs(prev => ({ ...prev, [recId]: !prev[recId] }))}
          onConfirm={handleConfirmRecs}
          onClose={() => setShowFixModal(false)}
        />
      )}
    </div>
  )
}