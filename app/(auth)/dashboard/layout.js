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

  // The setup companion reports its footprint so we condense the page to its left
  // instead of being overlapped. Only on wide screens; it overlays on mobile.
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
          {/* Non-sticky trial countdown at the top of the content. */}
          <TrialBanner />
          {/* notifications overlay the top-right corner (in line with each page's title). */}
          <div className="hidden lg:block absolute top-0 right-0 z-20">
            <DashboardTopBar />
          </div>
          <div className="flex-1">
            {children}
          </div>
        </div>
        {/* First-run setup, docked to the right; the page condenses beside it. */}
        <SetupCompanion onWidth={setCompanionW} />
        {/* Trial countdown paywall overlay (fixed, self-contained). */}
        <TrialGate />
      </div>
    </OnboardingCheck>
  )
}
