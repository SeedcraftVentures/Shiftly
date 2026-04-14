'use client'

import { useState } from 'react'
import useLocationWizardState from '@/app/lib/hooks/useLocationWizardState'

export default function useOnboardingState() {
  // Step 1 — Organization (onboarding-only)
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState(null)

  // Steps 2-5 — Location + teams + staff (shared with add-location wizard)
  const locationState = useLocationWizardState({ industry })

  // Local setField handles the org fields, everything else delegates
  function setField(field, value) {
    if (field === 'businessName') {
      setBusinessName(value)
      return
    }
    if (field === 'industry') {
      setIndustry(value)
      return
    }
    locationState.setField(field, value)
  }

  return {
    ...locationState,

    // Org-specific state
    businessName,
    industry,

    // Override setField to handle org fields in addition
    setField,
  }
}