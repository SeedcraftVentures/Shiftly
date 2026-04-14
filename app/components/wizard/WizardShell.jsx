'use client'

import { ArrowIcon } from '@/app/lib/icons'
import { PrimaryButton, SecondaryButton, Button } from '@/app/components/ui'

/**
 * Generic wizard container. Supports two visual modes:
 *   - "fullscreen": pink gradient + Shiftly logo, fills viewport (onboarding)
 *   - "inline":     plain white background, no logo, sits inside existing layout
 */
export default function WizardShell({
  step,
  totalSteps,
  children,
  onBack,
  onContinue,
  onSubmit,
  canProceed = true,
  saving = false,
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel = 'Get Started',
  variant = 'fullscreen',
}) {
  const isLast = step === totalSteps
  const isFullscreen = variant === 'fullscreen'

  const outerStyle = isFullscreen
    ? {
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, var(--shiftly-pink-light) 0%, var(--gray-0) 50%, var(--team-purple-light) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
      }
    : {
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }

  return (
    <div style={outerStyle}>
      {/* Cancel button — top-right for inline, top-left overlay for fullscreen */}
      {onCancel && isFullscreen && (
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            padding: '8px 14px',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-600)',
            background: 'var(--gray-0)',
            border: '1.5px solid var(--gray-200)',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          ← {cancelLabel}
        </button>
      )}

      {/* Shiftly logo (fullscreen only) */}
      {isFullscreen && (
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
              Shift<span style={{ color: 'var(--shiftly-pink)' }}>ly</span>
            </span>
          </div>
        </div>
      )}

      {/* Inline header: cancel button sits inline, not absolute */}
      {onCancel && !isFullscreen && (
        <div>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            ← {cancelLabel}
          </Button>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: isFullscreen ? 600 : 720, margin: isFullscreen ? '0 auto' : 0 }}>
        <ProgressBar step={step} total={totalSteps} />

        <div
          style={{
            background: 'var(--gray-0)',
            borderRadius: 20,
            boxShadow: isFullscreen ? '0 8px 40px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            border: '1px solid var(--gray-100)',
            padding: '32px 36px',
            minHeight: 480,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}

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
              onClick={onBack}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0 : 1, transition: 'opacity .15s' }}
            >
              Back
            </SecondaryButton>

            {isLast ? (
              <PrimaryButton onClick={onSubmit} disabled={!canProceed} loading={saving}>
                {saving ? 'Saving…' : <>{submitLabel} <ArrowIcon size={13} /></>}
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={onContinue} disabled={!canProceed}>
                Continue <ArrowIcon size={13} />
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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
            background: 'var(--shiftly-pink)',
            borderRadius: 99,
            transition: 'width 0.4s ease',
            width: `${pct}%`,
          }}
        />
      </div>
    </div>
  )
}