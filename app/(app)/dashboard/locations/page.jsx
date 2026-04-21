'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/app/components/layout/PageHeader'
import { PageContainer, Spinner } from '@/app/components/ui'
import LocationCard from './components/LocationCard'
import { useLocationContext } from '@/app/lib/contexts/LocationContext'

export default function LocationsPage() {
  const router = useRouter()
  const { switchLocation } = useLocationContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/organization')
      if (!res.ok) throw new Error('Failed to load')
      setData(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleLocationClick = async (locationId) => {
    await switchLocation(locationId)
    router.push(`/dashboard/${locationId}/location-settings`)
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

  const { organization, locations, canManageSettings } = data || {}

  return (
    <PageContainer>
      <PageHeader
        title="Manage Locations"
        subtitle={`${locations?.length || 0} ${locations?.length === 1 ? 'location' : 'locations'}`}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
        marginTop: 24,
      }}>
        {locations?.map(location => (
          <LocationCard
            key={location.location_id}
            location={location}
            organization={organization}
            onClick={() => handleLocationClick(location.location_id)}
          />
        ))}

        {canManageSettings && (
          <button
            onClick={() => router.push('/dashboard/locations/add-location')}
            style={{
              minHeight: 140,
              border: '2px dashed var(--gray-200)',
              borderRadius: 12,
              background: 'var(--gray-0)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--gray-500)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              transition: 'all .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--shiftly-pink)'
              e.currentTarget.style.color = 'var(--shiftly-pink)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--gray-200)'
              e.currentTarget.style.color = 'var(--gray-500)'
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
            Add location
          </button>
        )}
      </div>
    </PageContainer>
  )
}