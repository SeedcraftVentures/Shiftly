'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DAYS_FULL, assignTeamColor } from '@/app/lib/constants'
import WizardShell from '@/app/components/wizard/WizardShell'
import useLocationWizardState from '@/app/lib/hooks/useLocationWizardState'
import { useLocationContext } from '@/app/lib/contexts/LocationContext'
import LocationBasicsStep from '@/app/components/wizard/steps/LocationBasicsStep'
import LocationHoursStep from '@/app/components/wizard/steps/LocationHoursStep'
import TeamsStep from '@/app/components/wizard/steps/TeamsStep'
import StaffStep from '@/app/components/wizard/steps/StaffStep'

const TOTAL = 4

export default function AddLocationWizard({ organization }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const { switchLocation, refresh: refreshLocations } = useLocationContext()

  // Pass the org's industry so teams step can show presets
  const state = useLocationWizardState({ industry: organization?.industry })

  const canProceed = () => {
    switch (step) {
      case 1: return state.address.trim().length > 0
      case 2: return DAYS_FULL.some(d => state.hours[d].open)
      case 3: return state.selectedTeams.length > 0
      case 4: return true
      default: return false
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/locations')
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const teamsPayload = state.selectedTeams.map((t, i) => {
        const { color, colorLight } = assignTeamColor(i)
        return { ...t, color, colorLight }
      })

      const res = await fetch('/api/locations/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: (state.locationNickname || '').trim() || state.address.trim(),
          address: state.address.trim(),
          // null = inherit currency from organization
          currency: state.currency === organization?.currency ? null : state.currency,
          min_wage: state.minWage || null,
          operating_hours: state.hours,
          teams: teamsPayload,
          staff_by_team: state.staffByTeam,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to create location')
      }

      const { location_id } = await res.json()

      // Refresh the provider so sidebar picks up the new location, then switch to it
      await refreshLocations()
      await switchLocation(location_id)
      router.push(`/dashboard/${location_id}/location-settings`)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to create location')
    } finally {
      setSaving(false)
    }
  }

  const stepContent = {
    1: <LocationBasicsStep state={state} />,
    2: <LocationHoursStep state={state} />,
    3: <TeamsStep state={state} />,
    4: <StaffStep state={state} />,
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL}
      canProceed={canProceed()}
      saving={saving}
      onBack={() => setStep(s => s - 1)}
      onContinue={() => setStep(s => s + 1)}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      cancelLabel="Back to Organization"
      submitLabel="Create location"
      variant="inline"
    >
      {stepContent[step]}
    </WizardShell>
  )
}