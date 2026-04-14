'use client'

import { useState, useCallback } from 'react'
import { useShifts } from './hooks/useShifts'
import { getCoverageGaps } from '@/app/lib/utils/shiftUtils'
import PageHeader from '@/app/wrappers/PageHeader'
import { PageContainer, FilterBar, WarningBar, Spinner } from '@/app/components/ui'
import { PlusIcon } from '@/app/lib/icons'
import Button from '@/app/components/ui/Button'
import ShiftsList from './components/ShiftsList'
import ShiftsWeek from './components/ShiftsWeek'
import { DAYS_SHORT } from '@/app/lib/constants/days'

export default function ShiftsPage() {
  const {
    shifts, teams, resolvedHours, shiftLengths,
    loading, error, addShift, updateShift, deleteShift,
  } = useShifts()

  const [filterTeamId, setFilterTeamId] = useState(null)
  const [openShiftId, setOpenShiftId] = useState(null)
  const [scrollToId, setScrollToId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredShifts = filterTeamId
    ? shifts.filter(s => s.shift_team === filterTeamId)
    : shifts

  // Build warnings from coverage gaps
  const warnings = []
  const teamsToCheck = filterTeamId
    ? teams.filter(t => t.team_id === filterTeamId)
    : teams

  teamsToCheck.forEach(team => {
    for (let di = 0; di < 7; di++) {
      const gaps = getCoverageGaps(shifts, team.team_id, di, resolvedHours)
      gaps.forEach((gap, gi) => {
        const startH = Math.floor(gap.start)
        const startM = Math.round((gap.start - startH) * 60)
        const endH = Math.floor(gap.end)
        const endM = Math.round((gap.end - endH) * 60)
        warnings.push({
          id: `${team.team_id}-${di}-${gi}`,
          label: `${team.name} / ${DAYS_SHORT[di]} ${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
          color: team.color,
          onClick: () => setSelectedDay(di),
        })
      })
    }
  })

  // Filter bar items
  const filterItems = teams.map(t => ({
    id: t.team_id,
    label: t.name,
    count: shifts.filter(s => s.shift_team === t.team_id).length,
    color: t.color,
    colorLight: t.colorLight,
  }))

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddShift = useCallback(async () => {
    try {
      const newShift = await addShift(filterTeamId)
      if (newShift) {
        setOpenShiftId(newShift.shift_id)
        setScrollToId(newShift.shift_id)
      }
    } catch (err) {
      console.error('Failed to add shift:', err)
    }
  }, [addShift, filterTeamId])

  const handleToggleShift = useCallback((shiftId) => {
    setOpenShiftId(prev => prev === shiftId ? null : shiftId)
  }, [])

  const handleClickShiftCard = useCallback((shiftId) => {
    setOpenShiftId(shiftId)
    setScrollToId(shiftId)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner />
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--red-500)' }}>
          {error}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Shifts"
        subtitle="Manage shift patterns across your teams"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <FilterBar
          items={filterItems}
          activeId={filterTeamId}
          onSelect={setFilterTeamId}
          allLabel="All Teams"
          allCount={shifts.length}
          rightSlot={
            <Button variant="primary" size="sm" icon={<PlusIcon />} onClick={handleAddShift}>
              Add Shift
            </Button>
          }
        />

        {warnings.length > 0 && (
          <WarningBar
            count={warnings.length}
            label="Coverage gaps detected"
            items={warnings}
            variant="danger"
          />
        )}

        <ShiftsList
          teams={teams}
          shifts={shifts}
          filteredShifts={filteredShifts}
          openShiftId={openShiftId}
          onToggleShift={handleToggleShift}
          onUpdateShift={updateShift}
          onDeleteShift={deleteShift}
          resolvedHours={resolvedHours}
          scrollToId={scrollToId}
        />

        <ShiftsWeek
          teams={teams}
          allShifts={shifts}
          filteredShifts={filteredShifts}
          selectedDay={selectedDay}
          openShiftId={openShiftId}
          warnings={warnings}
          onSelectDay={setSelectedDay}
          onClickShift={handleClickShiftCard}
          resolvedHours={resolvedHours}
        />
      </div>
    </PageContainer>
  )
}
