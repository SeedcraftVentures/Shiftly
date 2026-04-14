'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/app/wrappers/PageHeader'
import { PageContainer, Tabs, Spinner } from '@/app/components/ui'
import OrganizationDetailsTab from './tabs/OrganizationDetailsTab'
import LocationsTab from './tabs/LocationsTab'
import MembersTab from './tabs/MembersTab'

const TABS = [
  { value: 'details', label: 'Organization' },
  { value: 'locations', label: 'Locations' },
  { value: 'members', label: 'Members' },
]

export default function OrganizationPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('action') === 'add-location' ? 'locations' : 'details'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/organization')
      if (!res.ok) throw new Error('Failed to load organization')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patchOrg = async (fields) => {
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error('Failed to save')
      await load()
    } catch (err) {
      console.error(err)
    }
  }

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

  const { organization, locations, isOwner } = data

  return (
    <PageContainer>
      <PageHeader
        title="Organization Settings"
        subtitle="Manage your organization, locations, and team members"
      />

      <div style={{ marginTop: 24 }}>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'details' && (
          <OrganizationDetailsTab
            organization={organization}
            onSave={patchOrg}
            isOwner={isOwner}
          />
        )}
        {activeTab === 'locations' && (
          <LocationsTab
            organization={organization}
            locations={locations}
            isOwner={isOwner}
            onReload={load}
          />
        )}
        {activeTab === 'members' && (
          <MembersTab isOwner={isOwner} />
        )}
      </div>
    </PageContainer>
  )
}