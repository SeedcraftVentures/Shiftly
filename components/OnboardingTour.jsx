'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from '@/app/components/ui/kit'

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function HomeIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> }
function RotaIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> }
function ShiftIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> }
function StaffIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg> }
function RulesIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> }
function InboxIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" /></svg> }
function PayrollIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h4a1 1 0 100-2H9z" clipRule="evenodd" /></svg> }
function ReportsIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg> }
function ArchiveIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg> }
function HelpIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg> }
function PhoneIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg> }
function DownloadIcon() { return <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg> }

// ── Tour steps (in nav order; concise, no jargon) ─────────────────────────────
const TOUR_STEPS = [
  { id: 'welcome', title: 'Welcome to Shiftly', content: "You're all set up. Here's a two-minute look around so you know where everything lives. You can retake it any time from the Help Centre.", tip: null, position: 'center', target: null, page: null, Icon: HomeIcon },
  { id: 'shifts', title: 'Shifts', content: "Define the shift patterns each team runs every week, like an opener or a closer. Set them once and every rota is built from them.", tip: "Pin a shift to your open or close time and it follows your hours. Shiftly flags any gaps in coverage.", position: 'right', target: 'nav-shifts', page: '/dashboard/shifts', Icon: ShiftIcon },
  { id: 'staff', title: 'Staff', content: "Add your team, their contracted hours and who holds a key, then set each person's weekly availability.", tip: "Click any day in the availability grid to set all day, specific hours, or off.", position: 'right', target: 'nav-staff', page: '/dashboard/staff', Icon: StaffIcon },
  { id: 'rules', title: 'Rules', content: "Set the rules every rota respects: minimum rest, maximum consecutive days, keyholder cover and fair distribution. The rota always generates; anything it can't fully meet is flagged, never blocked.", tip: null, position: 'right', target: 'nav-rules', page: '/dashboard/rules', Icon: RulesIcon },
  { id: 'rota-builder', title: 'Rota Builder', content: "Pick a week and hit generate. The solver fills every shift within contracts and rules in seconds, then you can drag to adjust before you publish.", tip: "Live compliance sits beside the grid, so you always know what's covered.", position: 'right', target: 'nav-generate', page: '/dashboard/generate', Icon: RotaIcon },
  { id: 'inbox', title: 'Inbox', content: "Your team's time-off requests, shift swaps and announcements will land here once the staff app ships. It's on the way.", tip: null, position: 'right', target: 'nav-requests', page: '/dashboard/requests', Icon: InboxIcon },
  { id: 'payroll', title: 'Payroll', content: "Gross pay per person for any period, across hourly, salaried and annualised staff. Export a CSV for your accountant in one click.", tip: null, position: 'right', target: 'nav-payroll', page: '/dashboard/payroll', Icon: PayrollIcon },
  { id: 'reports', title: 'Reports', content: "Track labour cost week to week, broken down by team and pay basis, so you can see where you're over or under.", tip: null, position: 'right', target: 'nav-reports', page: '/dashboard/reports', Icon: ReportsIcon },
  { id: 'archive', title: 'Archive', content: "Every rota you've published, kept for reference. Open any past week, print it, or share it as an image to your team's chat.", tip: null, position: 'right', target: 'nav-archive', page: '/dashboard/archive', Icon: ArchiveIcon },
  { id: 'help', title: 'Help Centre', content: "Guides, answers and this tour, any time you need them. We keep adding as the product grows.", tip: null, position: 'right', target: 'nav-help', page: '/dashboard/help', Icon: HelpIcon },
  { id: 'pwa', title: 'Install the app', content: "Add Shiftly to your home screen for one-tap access, no app store needed. Share it with your staff so they can check shifts on the go.", tip: null, position: 'center', target: null, page: null, isPWA: true, Icon: PhoneIcon },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingTour({ onComplete }) {
  const { T } = useTheme()
  const PINK = T.pink
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
      if (isNewSubscription || shouldStartTour) localStorage.removeItem('shiftly_tour_complete')
      setTimeout(() => setIsVisible(true), 800)
    }
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
      if (el) { setTargetRect(el.getBoundingClientRect()); setNavigating(false); return }
    }
    setTargetRect(null); setNavigating(false)
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
    if (step.page && pathname !== step.page) { setNavigating(true); router.push(step.page) }
    setCurrentStep(index)
  }, [pathname, router])

  const handleNext = () => { if (currentStep < TOUR_STEPS.length - 1) navigateToStep(currentStep + 1); else completeTour() }
  const handleBack = () => { if (currentStep > 0) navigateToStep(currentStep - 1) }

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
    if (isCenter || !targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    const top = targetRect.top + targetRect.height / 2
    const left = targetRect.right + 20
    return { top: `${Math.max(180, Math.min(top, window.innerHeight - 220))}px`, left: `${left}px`, transform: 'translateY(-50%)' }
  }

  const tipBox = { background: PINK + '14', border: `1px solid ${PINK}2E`, borderRadius: 10, padding: '10px 12px' }

  return (
    <>
      {/* Spotlight: dim everything except the target with a big box-shadow (no blur). */}
      {targetRect && !navigating ? (
        <div style={{ position: 'fixed', zIndex: 100, borderRadius: 14, top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12, boxShadow: '0 0 0 9999px rgba(10,10,12,0.6)', outline: `3px solid ${PINK}`, outlineOffset: 4, pointerEvents: 'none', transition: 'all .25s' }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,10,12,0.6)' }} />
      )}

      {/* Tooltip */}
      {!navigating && (
        <div style={{ position: 'fixed', zIndex: 102, width: 400, maxWidth: '92vw', fontFamily: T.font, transition: 'all .25s', ...getTooltipStyle() }}>
          <div style={{ background: T.cardSolid, borderRadius: 18, boxShadow: T.shadowHover, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ height: 4, background: `linear-gradient(90deg, ${PINK}, ${PINK}99)` }} />

            <div style={{ padding: '20px 24px 22px' }}>
              {/* step counter + skip */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: PINK + '16', color: PINK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><StepIcon /></div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.faint, letterSpacing: 0.5 }}>{currentStep + 1} / {TOUR_STEPS.length}</span>
                </div>
                <button onClick={completeTour} style={{ fontSize: 11, fontWeight: 600, color: T.faint, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: T.font }}>Skip tour</button>
              </div>

              <h3 style={{ fontFamily: T.fontHead, fontSize: 19, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', margin: '0 0 10px' }}>{step.title}</h3>
              <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.55, margin: '0 0 12px', letterSpacing: '-0.01em' }}>{step.content}</p>

              {step.tip && <div style={{ ...tipBox, marginBottom: 14 }}><p style={{ fontSize: 12, color: PINK, lineHeight: 1.5, margin: 0 }}>{step.tip}</p></div>}

              {/* PWA install */}
              {step.isPWA && (
                <div style={{ marginBottom: 14 }}>
                  {deferredPrompt ? (
                    <button onClick={handleInstallPWA} style={{ width: '100%', padding: '11px 16px', borderRadius: 10, background: PINK, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.font }}><DownloadIcon />Install Shiftly</button>
                  ) : isIOS ? (
                    <div style={{ ...tipBox, fontSize: 12, color: PINK, lineHeight: 1.5, textAlign: 'center' }}>Tap the <strong>Share</strong> button in Safari, then <strong>Add to Home Screen</strong> to install Shiftly.</div>
                  ) : (
                    <div style={{ background: T.subtle, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: T.muted, lineHeight: 1.5, textAlign: 'center' }}>Look for the install icon in your browser's address bar to add Shiftly to your desktop.</div>
                  )}
                </div>
              )}

              {/* progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5, margin: '14px 0' }}>
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} style={{ borderRadius: 99, transition: 'all .25s', width: i === currentStep ? 20 : 6, height: 6, background: i === currentStep ? PINK : i < currentStep ? PINK + '66' : T.track }} />
                ))}
              </div>

              {/* navigation */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!isFirst && <button onClick={handleBack} style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.subtle, color: T.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>Back</button>}
                <button onClick={handleNext} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: PINK, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>{isLast ? 'Get started' : 'Next'}</button>
              </div>
            </div>
          </div>

          {/* side arrow for right-anchored tooltips */}
          {!isCenter && targetRect && (
            <div style={{ position: 'absolute', width: 12, height: 12, background: T.cardSolid, transform: 'rotate(45deg)', left: -6, top: '50%', marginTop: -6, borderLeft: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }} />
          )}
        </div>
      )}

      {/* navigation loading */}
      {navigating && (
        <div style={{ position: 'fixed', zIndex: 102, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div style={{ background: T.cardSolid, borderRadius: 16, padding: '24px 32px', textAlign: 'center', boxShadow: T.shadowHover, border: `1px solid ${T.border}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 99, border: `3px solid ${T.track}`, borderTopColor: PINK, animation: 'spin 0.6s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12, color: T.faint, margin: 0, fontFamily: T.font }}>Loading…</p>
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
