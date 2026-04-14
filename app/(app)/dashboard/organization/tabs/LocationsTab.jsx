'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Section, Button } from '@/app/components/ui'
import { useLocationContext } from '@/app/lib/contexts/LocationContext'
import LocationCard from '../components/LocationCard'
import AddLocationModal from '../components/AddLocationModal'

export default function LocationsTab({ organization, locations, isOwner, onReload, autoOpenAdd }) {
  const router = useRouter()
  const { switchLocation, refresh } = useLocationContext()
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (autoOpenAdd) setShowAdd(true)
  }, [autoOpenAdd])

  const handleLocationClick = async (locationId) => {
    await switchLocation(locationId)
    router.push(`/dashboard/${locationId}/location-settings`)
  }

  const handleAdded = async () => {
    setShowAdd(false)
    await refresh()        // updates the shared provider state
    await onReload()       // refreshes the org page's own data
  }

  return (
    <Section
      title="Locations"
      description={`${locations.length} ${locations.length === 1 ? 'location' : 'locations'} in this organization`}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {locations.map(location => (
          <LocationCard
            key={location.location_id}
            location={location}
            organization={organization}
            onClick={() => handleLocationClick(location.location_id)}
          />
        ))}

        {isOwner && (
          <button
            onClick={() => setShowAdd(true)}
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

      {showAdd && (
        <AddLocationModal
          organization={organization}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}
    </Section>
  )
}