'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DAYS_FULL, assignTeamColor } from '@/app/lib/constants'
import { ArrowIcon } from '@/app/lib/icons'
import { PrimaryButton, SecondaryButton, Spinner } from '@/app/components/ui'
import useOnboardingState from '../hooks/useOnboardingState'
import Step1Organization from '../steps/Step1Organization'
import Step2LocationBasics from '../steps/Step2LocationBasics'
import Step3LocationHours from '../steps/Step3LocationHours'
import Step4Teams from '../steps/Step4Teams'
import Step5Staff from '../steps/Step5Staff'

const TOTAL = 5

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }) {
  const pct = (step / total) * 100
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 600 }}>
          Step {step} of {total}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--pink-500), var(--pink-400))',
            borderRadius: 99,
            transition: 'width 0.4s ease',
            width: `${pct}%`,
          }}
        />
      </div>
    </div>
  )
}

// ── Wizard ───────────────────────────────────────────────────────────────────

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
      case 5: return true // staff is optional
      default: return false
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const teamsPayload = state.selectedTeams.map((t, i) => {
        const { color, colorLight } = assignTeamColor(i)
        return { ...t, color, colorLight }
      })

      const res = await fetch('/api/onboarding', {
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

      if (res.ok) {
        router.push('/dashboard?tour=start')
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to save — please try again')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  const stepComponent = {
    1: <Step1Organization state={state} />,
    2: <Step2LocationBasics state={state} />,
    3: <Step3LocationHours state={state} />,
    4: <Step4Teams state={state} />,
    5: <Step5Staff state={state} />,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--pink-50) 0%, var(--gray-0) 50%, var(--team-purple-light) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--gray-0)',
            padding: '10px 24px',
            borderRadius: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
            border: '1px solid var(--gray-100)',
          }}
        >
          <span className="heading-page">
            Shift<span style={{ color: 'var(--pink-500)' }}>ly</span>
          </span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 600 }}>
        <ProgressBar step={step} total={TOTAL} />

        <div
          style={{
            background: 'var(--gray-0)',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
            border: '1px solid var(--gray-100)',
            padding: '32px 36px',
            minHeight: 480,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {stepComponent[step]}

          {/* Nav buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 28,
              paddingTop: 20,
              borderTop: '1px solid var(--gray-100)',
            }}
          >
            <SecondaryButton
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0 : 1, transition: 'opacity .15s' }}
            >
              Back
            </SecondaryButton>

            {step < TOTAL ? (
              <PrimaryButton onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                Continue <ArrowIcon size={13} />
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={handleSubmit} disabled={!canProceed()} loading={saving}>
                {saving ? 'Saving\u2026' : <>Get Started <ArrowIcon size={13} /></>}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
