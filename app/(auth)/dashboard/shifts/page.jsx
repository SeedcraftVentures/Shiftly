'use client'

import { useState, useMemo, useCallback } from 'react'
import { useShifts } from './hooks/useShifts'
import { getTeamGaps } from '@/app/lib/shiftUtils'
import { DAYS_SHORT, decimalTimeToLabel } from '@/app/lib/timeUtils'
import PageHeader from '@/app/wrappers/PageHeader'
import ShiftFilterBar from './components/ShiftFilterBar'
import ShiftWarningBar from './components/ShiftWarningBar'
import ShiftsList from './components/ShiftsList'
// import WeekAtAGlance from './components/WeekAtAGlance'
// import FixGapsModal from './components/FixGapsModal'

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
    DAYS_SHORT.forEach((day, di) => {
      teamsToCheck.forEach(team => {
        getTeamGaps(shifts, team.id, di).forEach(g => {
          w.push({ teamId: team.id, teamName: team.team_name, teamColor: team.color, day, di, from: decimalTimeToLabel(g.s), to: decimalTimeToLabel(g.e) })
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

  const centerStateStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }

  const innerStyle = {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '0 24px',
  }

  if (loading) {
    return (
      <div
        style={{
          ...centerStateStyle,
          color: 'var(--gray-400)',
          fontSize: 'var(--text-sm)',
        }}
      >
        Loading shifts…
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          ...centerStateStyle,
          color: 'var(--red-500)',
          fontSize: 'var(--text-sm)',
        }}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'var(--gray-50)',
        color: 'var(--gray-900)',
      }}
    >

      {/* ── Page header ── */}
      <div style={{
        background: 'var(--gray-50)',
        paddingTop: 28,
        paddingBottom: 0
      }}>
        <div style={innerStyle}>
          <PageHeader 
            title={`Shifts`}
            subtitle="Define your shift patterns. The solver uses these to build rotas automatically."
          />
        </div>
      </div>

      {/* ── Sticky filter + warning bar ── */}
      <div
        style={{ 
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
          paddingBottom: 8
        }}
      >
        <div
          style={{
            ...innerStyle,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            background: 'var(--gray-50)'
          }}
        >
          <ShiftFilterBar
            teams={teams} shifts={shifts} filterTeamId={filterTeamId}
            onFilterChange={setFilterTeamId} onAddShift={handleAddShift}
          />
          <ShiftWarningBar
            warnings={warnings} onDayClick={setSelectedDay}
            onFixGaps={() => { setSelectedRecs({}); setShowFixModal(true) }}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            ...innerStyle,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <ShiftsList
            teams={teams} shifts={shifts} filteredShifts={filteredShifts}
            openShiftId={openShiftId} onToggleShift={handleToggleShift}
            onUpdateShift={updateShift} onDeleteShift={deleteShift}
            fixedLocks={fixedLocks} onSetFixedLock={handleSetFixedLock}
            shiftLengths={shiftLengths} openTime={openTime} closeTime={closeTime}
            scrollToId={scrollToId}
          />
          {/* <WeekAtAGlance
            teams={teamsToCheck} allShifts={shifts} filteredShifts={filteredShifts}
            selectedDay={selectedDay} openShiftId={openShiftId} warnings={warnings}
            onSelectDay={setSelectedDay} onClickShift={handleClickShiftCard}
          /> */}
        </div>
      </div>

      {/* {showFixModal && (
        <FixGapsModal
          allShifts={shifts} teams={teamsToCheck} selectedRecs={selectedRecs}
          onToggleRec={(recId) => setSelectedRecs(prev => ({ ...prev, [recId]: !prev[recId] }))}
          onConfirm={handleConfirmRecs}
          onClose={() => setShowFixModal(false)}
        />
      )} */}
    </div>
  )
}