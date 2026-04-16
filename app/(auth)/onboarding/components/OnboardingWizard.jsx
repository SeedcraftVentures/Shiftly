'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DAYS_FULL, assignTeamColor } from '@/app/lib/constants'
import WizardShell from '@/app/components/wizard/WizardShell'
import useOnboardingState from '../hooks/useOnboardingState'
import OrganizationStep from '@/app/components/wizard/steps/OrganizationStep'
import LocationBasicsStep from '@/app/components/wizard/steps/LocationBasicsStep'
import LocationHoursStep from '@/app/components/wizard/steps/LocationHoursStep'
import TeamsStep from '@/app/components/wizard/steps/TeamsStep'
import StaffStep from '@/app/components/wizard/steps/StaffStep'

const TOTAL = 5

export default function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const state = useOnboardingState()

  const canProceed = () => {
    switch (step) {
      case 1: return state.businessName.trim().length > 0 && state.industry !== null
      case 2: return state.address.trim().length > 0
      case 3: return DAYS_FULL.some(d => state.hours[d].open)
      case 4: return state.selectedTeams.length > 0
      case 5: return true
      default: return false
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      // Bake team colors now so they're stable in the payload
      const teamsPayload = state.selectedTeams.map((t, i) => {
        const { color, colorLight } = assignTeamColor(i)
        return { ...t, color, colorLight }
      })

      // Stash wizard state. Org + location get provisioned after payment
      // completes (via subscription webhook in Phase 6).
      const res = await fetch('/api/pending-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: state.businessName.trim(),
          industry: state.industry,
          address: state.address.trim(),
          location_nickname: (state.locationNickname || '').trim() || undefined,
          currency: state.currency,
          min_wage: state.minWage || undefined,
          teams: teamsPayload,
          operating_hours: state.hours,
          staff_by_team: state.staffByTeam,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save onboarding')
      }

      // Next step: payment (placeholder until Clerk billing wires up)
      router.push('/onboarding/payment')
    } catch (err) {
      console.error(err)
      alert('Failed to save onboarding — please try again')
    } finally {
      setSaving(false)
    }
  }

  const stepContent = {
    1: <OrganizationStep state={state} />,
    2: <LocationBasicsStep state={state} />,
    3: <LocationHoursStep state={state} />,
    4: <TeamsStep state={state} />,
    5: <StaffStep state={state} />,
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
      submitLabel="Continue to payment"
    >
      {stepContent[step]}
    </WizardShell>
  )
}