'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/app/components/Navigation'
import DashboardTopBar from '@/app/components/DashboardTopBar'
import OnboardingCheck from '@/app/components/OnboardingCheck'
import SetupCompanion from '@/app/components/SetupCompanion'
import TrialGate from '@/app/components/TrialGate'
import TrialBanner from '@/app/components/TrialBanner'
import { useTheme } from '@/app/components/ui/kit'

export default function DashboardLayout({ children }) {
  const { T } = useTheme()
  // Nav collapse lives here so the content's left padding tracks the rail width.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { if (localStorage.getItem('shiftly_nav_collapsed') === '1') setCollapsed(true) }, [])
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; localStorage.setItem('shiftly_nav_collapsed', n ? '1' : '0'); return n })

  // The setup companion reports its footprint so we can condense the app to its
  // left instead of being overlapped. Only on wide screens; it overlays on mobile.
  const [companionW, setCompanionW] = useState(0)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches); on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const padRight = wide && companionW ? companionW : undefined

  return (
    <OnboardingCheck>
      <div style={{ fontFamily: "var(--font-figtree), 'Plus Jakarta Sans', system-ui, sans-serif", background: '#FF1F7D', paddingRight: padRight, transition: 'padding-right .28s ease' }} className={`min-h-screen p-3 transition-[padding] duration-200 ${collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-52'}`}>
        <Navigation collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <div style={{ background: T.appBg }} className="min-h-[calc(100vh-1.5rem)] rounded-[1.25rem] lg:ml-1 mt-14 lg:mt-0 flex flex-col relative">
          {/* Non-sticky trial countdown, in flow at the top of the content so it
              scrolls away (renders nothing outside the trial). */}
          <TrialBanner />
          {/* notifications overlay the top-right corner (in line with each page's title)
              instead of consuming their own row, so pages start near the top */}
          <div className="hidden lg:block absolute top-0 right-0 z-20">
            <DashboardTopBar />
          </div>
          <div className="flex-1">
            {children}
          </div>
        </div>
        {/* First-run setup, in place. Floats over every dashboard page; shows
            only while the workspace is incomplete, else steps aside to a bubble.
            It reports its width so the app condenses beside it (wide screens). */}
        <SetupCompanion onWidth={setCompanionW} />
        {/* Trial countdown nudge + the post-trial paywall. Self-contained: reads
            its own entitlement, renders fixed overlays, and blocks the app when
            the no-card trial has expired (data stays saved). */}
        <TrialGate />
      </div>
    </OnboardingCheck>
  )
}