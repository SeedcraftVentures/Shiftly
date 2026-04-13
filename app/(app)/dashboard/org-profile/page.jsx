'use client'

import { useState } from 'react'
import PageHeader from '@/app/wrappers/PageHeader'
import { PageContainer, Tabs, Spinner } from '@/app/components/ui'
import useOrgProfile from './hooks/useOrgProfile'
import OrganizationSection from './sections/OrganizationSection'
import LocationSection from './sections/LocationSection'
import HoursSection from './sections/HoursSection'
import RulesSection from './sections/RulesSection'
import TeamsSection from './sections/TeamsSection'

const TABS = [
  { value: 'organization', label: 'Organization' },
  { value: 'location', label: 'Location' },
  { value: 'hours', label: 'Hours' },
  { value: 'rules', label: 'Rules' },
  { value: 'teams', label: 'Teams' },
]

export default function OrgProfilePage() {
  const [activeTab, setActiveTab] = useState('organization')
  const {
    data,
    loading,
    error,
    reload,
    patchOrg,
    patchLocation,
    patchRules,
    patchLocationHours,
  } = useOrgProfile()

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
          <p style={{ color: 'var(--gray-500)' }}>
            {error || 'Failed to load organization profile.'}
          </p>
        </div>
      </PageContainer>
    )
  }

  const { organization, location, locationHours, locationRules, teams, teamHours } = data
  const rules = locationRules || {}

  return (
    <PageContainer>
      <PageHeader
        title="Organization"
        subtitle="Manage your organization, location, and team settings"
      />

      <div style={{ marginTop: 24 }}>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'organization' && (
          <OrganizationSection organization={organization} onSave={patchOrg} />
        )}
        {activeTab === 'location' && (
          <LocationSection location={location} onSave={patchLocation} />
        )}
        {activeTab === 'hours' && (
          <HoursSection locationHours={locationHours} onSave={patchLocationHours} />
        )}
        {activeTab === 'rules' && (
          <RulesSection rules={rules} onSave={patchRules} />
        )}
        {activeTab === 'teams' && (
          <TeamsSection
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