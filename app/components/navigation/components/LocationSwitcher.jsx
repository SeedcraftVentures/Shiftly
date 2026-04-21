'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDownIcon, BuildingIcon, PlusIcon, CheckIcon } from '@/app/lib/icons'
import { useLocationContext } from '@/app/lib/contexts/LocationContext'
import { useOutsideClick } from '@/app/lib/hooks/useOutsideClick'
import { useEscapeKey } from '@/app/lib/hooks/useEscapeKey'

export default function LocationSwitcher() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const { locations, currentLocation, switchLocation, loading } = useLocationContext()

  const close = () => setOpen(false)
  useOutsideClick(containerRef, close, open)
  useEscapeKey(close, open)

  const handleSwitch = async (locationId) => {
    await switchLocation(locationId)
    close()
    router.push(`/dashboard/${locationId}`)
  }

  if (loading) {
    return (
      <div className="mb-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
        <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-0.5">Workspace</p>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 hover:bg-white/15 transition-colors text-left flex items-center justify-between gap-2"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-0.5">Workspace</p>
          <p className="text-white font-medium text-sm truncate">
            {currentLocation?.name || 'No location'}
          </p>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-white/70 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
            {/* Locations list */}
            <div className="py-1">
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Locations
            </p>
            {locations.length === 0 ? (
                <p className="px-4 py-2 text-sm text-gray-400">No locations yet</p>
            ) : (
                locations.map(loc => {
                const isCurrent = loc.location_id === currentLocation?.location_id
                return (
                    <button
                    key={loc.location_id}
                    onClick={() => handleSwitch(loc.location_id)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                        isCurrent ? 'text-shiftly-pink font-semibold' : 'text-gray-700'
                    }`}
                    >
                    <BuildingIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{loc.name}</span>
                    {isCurrent && <CheckIcon className="w-4 h-4 flex-shrink-0" />}
                    </button>
                )
                })
            )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Org settings + add location */}
        <div className="py-1">
        <button
            onClick={() => {
            close()
            router.push('/dashboard/locations')
            }}
            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors text-gray-700"
        >
            <BuildingIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Manage locations</span>
        </button>
        <button
            onClick={() => {
            close()
            router.push('/dashboard/locations/add-location')
            }}
            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors text-shiftly-pink font-medium"
        >
            <PlusIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Add location</span>
        </button>
        </div>
        </div>
      )}
    </div>
  )
}