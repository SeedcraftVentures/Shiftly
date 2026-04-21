'use client'

import { useState, useCallback, useMemo } from 'react'
import { useStaff } from './hooks/useStaff'
import PageHeader from '@/app/components/layout/PageHeader'
import { PageContainer, FilterBar, Spinner } from '@/app/components/ui'
import { PlusIcon } from '@/app/lib/icons'
import Button from '@/app/components/ui/Button'
import StaffList from './components/StaffList'

export default function StaffPage() {
  const {
    staff, teams, loading, error, totalContractedHours,
    addStaff, updateStaff, deleteStaff,
  } = useStaff()

  const [filterTeamId, setFilterTeamId] = useState(null)
  const [openStaffId, setOpenStaffId] = useState(null)
  const [scrollToId, setScrollToId] = useState(null)

  const filteredStaff = useMemo(() =>
    filterTeamId ? staff.filter(s => s.team_id === filterTeamId) : staff
  , [staff, filterTeamId])

  const filterItems = teams.map(t => ({
    id: t.team_id,
    label: t.name,
    count: staff.filter(s => s.team_id === t.team_id).length,
    color: t.color,
    colorLight: t.colorLight,
  }))

  const handleAddStaff = useCallback(async () => {
    try {
      const newMember = await addStaff(filterTeamId)
      if (newMember) {
        setOpenStaffId(newMember.staff_id)
        setScrollToId(newMember.staff_id)
      }
    } catch (err) {
      console.error('Failed to add staff:', err)
    }
  }, [addStaff, filterTeamId])

  const handleToggleStaff = useCallback((staffId) => {
    setOpenStaffId(prev => prev === staffId ? null : staffId)
  }, [])

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
        title="Staff"
        subtitle={`${staff.length} member${staff.length !== 1 ? 's' : ''} · ${totalContractedHours}h contracted`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <FilterBar
          items={filterItems}
          activeId={filterTeamId}
          onSelect={setFilterTeamId}
          allLabel="All Teams"
          allCount={staff.length}
          rightSlot={
            <Button variant="primary" size="sm" icon={<PlusIcon />} onClick={handleAddStaff}>
              Add Staff
            </Button>
          }
        />

        <StaffList
          teams={teams}
          staff={staff}
          filteredStaff={filteredStaff}
          openStaffId={openStaffId}
          onToggleStaff={handleToggleStaff}
          onUpdateStaff={updateStaff}
          onDeleteStaff={deleteStaff}
          scrollToId={scrollToId}
        />
      </div>
    </PageContainer>
  )
}