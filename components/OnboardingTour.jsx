'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const PINK = '#FF1F7D'
const FONT_HEADING = "'Cal Sans', 'Plus Jakarta Sans', sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', sans-serif"

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  )
}

function RotaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  )
}

function ShiftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  )
}

function StaffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  )
}

function RulesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

// ── Tour steps ────────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Shiftly',
    content: "You're all set up. Let's take a quick look around so you know where everything lives. It takes about two minutes, and you can retake it anytime from the Help Centre.",
    tip: null,
    position: 'center',
    target: null,
    page: null,
    Icon: HomeIcon,
  },
  {
    id: 'shifts',
    title: 'Shift Patterns',
    content: "The Shifts page is where you define your shift templates — things like Early, Mid, Late. Set the times once and the solver uses them every time you generate a rota.",
    tip: "Open, Close and Fixed anchor types mean shifts automatically adjust to your operating hours.",
    position: 'right',
    target: 'nav-shifts',
    page: '/dashboard/shifts',
    Icon: ShiftIcon,
  },
  {
    id: 'staff',
    title: 'Staff',
    content: "Add your team members here, set their contracted hours, max hours, and availability. The solver uses this to build fair rotas that respect everyone's constraints.",
    tip: "Availability rules let you set hard constraints — like a staff member who can never do close shifts — and soft preferences the solver will try to honour.",
    position: 'right',
    target: 'nav-staff',
    page: '/dashboard/staff',
    Icon: StaffIcon,
  },
  {
    id: 'rules',
    title: 'Rules',
    content: "Set the scheduling rules the solver must follow — minimum rest between shifts, maximum consecutive days, fair distribution preferences. Hard constraints are always enforced. Soft preferences are best-effort.",
    tip: null,
    position: 'right',
    target: 'nav-rules',
    page: '/dashboard/rules',
    Icon: RulesIcon,
  },
  {
    id: 'rota-builder',
    title: 'Rota Builder',
    content: "Once your shifts, staff, and rules are set up, come here to generate your rota. Pick the team and week, hit Generate, and the solver builds a compliant, balanced rota in seconds.",
    tip: "You can edit any generated rota manually before approving it. Approved rotas push straight to your staff's app.",
    position: 'right',
    target: 'nav-generate',
    page: '/dashboard/generate',
    Icon: RotaIcon,
  },
  {
    id: 'inbox',
    title: 'Inbox',
    content: "Staff requests, shift swap approvals, and escalations all land here. You can also send announcements to your whole team or specific groups.",
    tip: null,
    position: 'right',
    target: 'nav-requests',
    page: '/dashboard/requests',
    Icon: InboxIcon,
  },
  {
    id: 'reports',
    title: 'Reports',
    content: "Track hours worked, weekly labour costs, and compliance across your team. See where contracted hours are being met and where you might be over or under-staffed.",
    tip: null,
    position: 'right',
    target: 'nav-reports',
    page: '/dashboard/reports',
    Icon: ReportsIcon,
  },
  {
    id: 'help',
    title: 'Help Centre',
    content: "Find answers to common questions, watch walkthrough videos, and retake this tour anytime. We'll keep adding guides as the product grows.",
    tip: null,
    position: 'right',
    target: 'nav-help',
    page: '/dashboard/help',
    Icon: HelpIcon,
  },
  {
    id: 'pwa',
    title: 'Install the App',
    content: "Add Shiftly to your home screen for instant access — no app store needed. Share this with your staff so they can check their shifts on the go.",
    tip: null,
    position: 'center',
    target: null,
    page: null,
    isPWA: true,
    Icon: PhoneIcon,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [navigating, setNavigating] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('shiftly_tour_complete')
    const shouldStartTour = searchParams.get('tour') === 'start'
    const isNewSubscription = searchParams.get('subscription') === 'success'

    if (!hasSeenTour || isNewSubscription || shouldStartTour) {
      if (isNewSubscription || shouldStartTour) {
        localStorage.removeItem('shiftly_tour_complete')
      }
      setTimeout(() => setIsVisible(true), 800)
    }

    // Detect iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream)
  }, [searchParams])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const updateTargetRect = useCallback(() => {
    const step = TOUR_STEPS[currentStep]
    if (step?.target) {
      const el = document.getElementById(step.target)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
        setNavigating(false)
        return
      }
    }
    setTargetRect(null)
    setNavigating(false)
  }, [currentStep])

  useEffect(() => {
    if (!isVisible) return
    const t = setTimeout(updateTargetRect, 300)
    return () => clearTimeout(t)
  }, [currentStep, pathname, isVisible, updateTargetRect])

  useEffect(() => {
    if (!isVisible) return
    window.addEventListener('resize', updateTargetRect)
    return () => window.removeEventListener('resize', updateTargetRect)
  }, [isVisible, updateTargetRect])

  const navigateToStep = useCallback((index) => {
    const step = TOUR_STEPS[index]
    if (step.page && pathname !== step.page) {
      setNavigating(true)
      router.push(step.page)
    }
    setCurrentStep(index)
  }, [pathname, router])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) navigateToStep(currentStep + 1)
    else completeTour()
  }

  const handleBack = () => {
    if (currentStep > 0) navigateToStep(currentStep - 1)
  }

  const completeTour = () => {
    localStorage.setItem('shiftly_tour_complete', 'true')
    setIsVisible(false)
    if (pathname !== '/dashboard') router.push('/dashboard')
    onComplete?.()
  }

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (outcome === 'accepted') handleNext()
    }
  }

  if (!isVisible) return null

  const step = TOUR_STEPS[currentStep]
  const isCenter = step.position === 'center' || !targetRect
  const isLast = currentStep === TOUR_STEPS.length - 1
  const isFirst = currentStep === 0
  const StepIcon = step.Icon

  const getTooltipStyle = () => {
    if (isCenter || !targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
    const top = targetRect.top + targetRect.height / 2
    const left = targetRect.right + 20
    return {
      top: `${Math.max(180, Math.min(top, window.innerHeight - 220))}px`,
      left: `${left}px`,
      transform: 'translateY(-50%)',
    }
  }

  return (
    <>
      {/* Spotlight: dim everything EXCEPT the target via a big box-shadow (no blur),
          so the element the tour is pointing at stays crisp and readable. */}
      {targetRect && !navigating ? (
        <div style={{
          position: 'fixed', zIndex: 100, borderRadius: 14,
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          boxShadow: '0 0 0 9999px rgba(17,24,39,0.55)',
          outline: `3px solid ${PINK}`,
          outlineOffset: 4,
          pointerEvents: 'none',
          transition: 'all .25s',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(17,24,39,0.55)' }} />
      )}

      {/* Tooltip */}
      {!navigating && (
        <div style={{
          position: 'fixed', zIndex: 102,
          width: 400, maxWidth: '92vw',
          fontFamily: FONT_BODY,
          transition: 'all .25s',
          ...getTooltipStyle(),
        }}>
          <div style={{
            background: '#fff', borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            border: '1px solid #F3F4F6', overflow: 'hidden',
          }}>
            {/* Pink top bar */}
            <div style={{ height: 4, background: `linear-gradient(90deg, ${PINK}, #FF5FA8)` }} />

            <div style={{ padding: '20px 24px 22px' }}>
              {/* Step counter + skip */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: '#FFF0F5', color: PINK,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <StepIcon />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.5 }}>
                    {currentStep + 1} / {TOUR_STEPS.length}
                  </span>
                </div>
                <button
                  onClick={completeTour}
                  style={{
                    fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  Skip tour
                </button>
              </div>

              {/* Title */}
              <h3 style={{
                fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 700,
                color: '#111827', margin: '0 0 10px',
              }}>
                {step.title}
              </h3>

              {/* Body */}
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>
                {step.content}
              </p>

              {/* Tip */}
              {step.tip && (
                <div style={{
                  background: '#FFF0F5', border: '1px solid #FF1F7D22',
                  borderRadius: 8, padding: '10px 12px', marginBottom: 14,
                }}>
                  <p style={{ fontSize: 12, color: PINK, lineHeight: 1.5, margin: 0 }}>
                    {step.tip}
                  </p>
                </div>
              )}

              {/* PWA install */}
              {step.isPWA && (
                <div style={{ marginBottom: 14 }}>
                  {deferredPrompt ? (
                    // Chrome / Edge / Android — show real install button
                    <button
                      onClick={handleInstallPWA}
                      style={{
                        width: '100%', padding: '11px 16px', borderRadius: 8,
                        background: PINK, color: '#fff', border: 'none',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8,
                      }}
                    >
                      <DownloadIcon />
                      Install Shiftly
                    </button>
                  ) : isIOS ? (
                    // iOS Safari — programmatic install not possible
                    <div style={{
                      background: '#FFF0F5', border: '1px solid #FF1F7D22',
                      borderRadius: 8, padding: '10px 12px',
                      fontSize: 12, color: PINK,
                      lineHeight: 1.5, textAlign: 'center',
                    }}>
                      Tap the <strong>Share</strong> button in Safari then
                      tap <strong>Add to Home Screen</strong> to install Shiftly.
                    </div>
                  ) : (
                    // Desktop without prompt (already installed or not supported)
                    <div style={{
                      background: '#F9FAFB', border: '1px solid #E5E7EB',
                      borderRadius: 8, padding: '10px 12px',
                      fontSize: 12, color: '#6B7280',
                      lineHeight: 1.5, textAlign: 'center',
                    }}>
                      Look for the install icon in your browser's address bar to add Shiftly to your desktop.
                    </div>
                  )}
                </div>
              )}

              {/* Progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, margin: '14px 0' }}>
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} style={{
                    borderRadius: 99, transition: 'all .25s',
                    width: i === currentStep ? 20 : 6,
                    height: 6,
                    background: i === currentStep ? PINK
                      : i < currentStep ? '#FFC0D9'
                      : '#E5E7EB',
                  }} />
                ))}
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!isFirst && (
                  <button
                    onClick={handleBack}
                    style={{
                      padding: '8px 16px', borderRadius: 8,
                      border: '1px solid #E5E7EB', background: '#F9FAFB',
                      color: '#6B7280', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  style={{
                    flex: 1, padding: '9px 16px', borderRadius: 8,
                    border: 'none', background: PINK, color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {isLast ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>

          {/* Side arrow for right-anchored tooltips */}
          {!isCenter && targetRect && (
            <div style={{
              position: 'absolute',
              width: 12, height: 12,
              background: '#fff',
              transform: 'rotate(45deg)',
              left: -6, top: '50%', marginTop: -6,
              borderLeft: '1px solid #F3F4F6',
              borderBottom: '1px solid #F3F4F6',
            }} />
          )}
        </div>
      )}

      {/* Navigation loading */}
      {navigating && (
        <div style={{
          position: 'fixed', zIndex: 102,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14,
            padding: '24px 32px', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 99,
              border: '3px solid #F3F4F6', borderTopColor: PINK,
              animation: 'spin 0.6s linear infinite',
              margin: '0 auto 10px',
            }} />
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Loading…</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}

export function resetTour() {
  localStorage.removeItem('shiftly_tour_complete')
}