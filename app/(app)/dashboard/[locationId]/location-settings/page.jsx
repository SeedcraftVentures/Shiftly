'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/app/components/layout/PageHeader'
import { useRouter } from 'next/navigation'
import { PageContainer, Tabs, Spinner, Button } from '@/app/components/ui'
import useLocationSettings from './hooks/useLocationSettings'
import DetailsSection from './sections/DetailsSection'
import HoursSection from './sections/HoursSection'
import RulesSection from './sections/RulesSection'
import TeamsSection from './sections/TeamsSection'

const TABS = [
  { value: 'details', label: 'Details' },
  { value: 'hours', label: 'Hours' },
  { value: 'rules', label: 'Rules' },
  { value: 'teams', label: 'Teams' },
]

export default function LocationSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const locationId = params.locationId
  const [activeTab, setActiveTab] = useState('details')

  const {
    data,
    loading,
    error,
    reload,
    patchLocation,
    patchRules,
    patchLocationHours,
  } = useLocationSettings(locationId)

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner />
        </div>
      </PageContainer>
    )
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div style={{ padding: 40 }}>
          <p style={{ color: 'var(--gray-500)' }}>{error || 'Failed to load.'}</p>
        </div>
      </PageContainer>
    )
  }

  const { organization, location, locationHours, locationRules, teams, teamHours } = data
  const rules = locationRules || {}

  return (
    <PageContainer>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <PageHeader
          title={location.name}
          subtitle="Manage this location's details, hours, rules, and teams"
        />
        {data.isOwner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/dashboard/locations')}
          >
            All locations →
          </Button>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'details' && (
          <DetailsSection
            location={location}
            organization={organization}
            onSave={patchLocation}
          />
        )}
        {activeTab === 'hours' && (
          <HoursSection
            locationHours={locationHours}
            onSave={patchLocationHours}
          />
        )}
        {activeTab === 'rules' && (
          <RulesSection rules={rules} onSave={patchRules} />
        )}
        {activeTab === 'teams' && (
          <TeamsSection
            locationId={locationId}
            teams={teams}
            teamHours={teamHours}
            locationHours={locationHours}
            onReload={reload}
          />
        )}
      </div>
    </PageContainer>
  )
}