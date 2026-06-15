'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/app/components/Navigation'
import DashboardTopBar from '@/app/components/DashboardTopBar'
import OnboardingCheck from '@/app/components/OnboardingCheck'
import OnboardingTour from '@/components/OnboardingTour'

export default function DashboardLayout({ children }) {
  // Nav collapse lives here so the content's left padding tracks the rail width.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { if (localStorage.getItem('shiftly_nav_collapsed') === '1') setCollapsed(true) }, [])
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; localStorage.setItem('shiftly_nav_collapsed', n ? '1' : '0'); return n })

  return (
    <OnboardingCheck>
      <div className={`min-h-screen bg-[#FF1F7D] p-3 transition-[padding] duration-200 ${collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-52'}`}>
        <Navigation collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <div className="min-h-[calc(100vh-1.5rem)] bg-[#F8F9FA] rounded-[1.25rem] lg:ml-1 mt-14 lg:mt-0 flex flex-col">
          <div className="hidden lg:block">
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