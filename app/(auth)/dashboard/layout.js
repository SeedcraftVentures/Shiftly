'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/app/components/Navigation'
import DashboardTopBar from '@/app/components/DashboardTopBar'
import OnboardingCheck from '@/app/components/OnboardingCheck'
import OnboardingTour from '@/components/OnboardingTour'
import { useTheme } from '@/app/components/ui/kit'

export default function DashboardLayout({ children }) {
  const { T } = useTheme()
  // Nav collapse lives here so the content's left padding tracks the rail width.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { if (localStorage.getItem('shiftly_nav_collapsed') === '1') setCollapsed(true) }, [])
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; localStorage.setItem('shiftly_nav_collapsed', n ? '1' : '0'); return n })

  return (
    <OnboardingCheck>
      <div style={{ fontFamily: "'Cal Sans Text', 'Plus Jakarta Sans', sans-serif", background: '#FF1F7D' }} className={`min-h-screen p-3 transition-[padding] duration-200 ${collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-52'}`}>
        <Navigation collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <div style={{ background: T.appBg }} className="min-h-[calc(100vh-1.5rem)] rounded-[1.25rem] lg:ml-1 mt-14 lg:mt-0 flex flex-col relative">
          {/* notifications overlay the top-right corner (in line with each page's title)
              instead of consuming their own row, so pages start near the top */}
          <div className="hidden lg:block absolute top-0 right-0 z-20">
            <DashboardTopBar />
          </div>
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
      <OnboardingTour />
    </OnboardingCheck>
  )
}