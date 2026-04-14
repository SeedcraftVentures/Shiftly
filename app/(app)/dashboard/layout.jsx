'use client'

import NavigationSideBar from '@/app/components/navigation/NavigationSideBar'
import DesktopTopBar from '@/app/wrappers/DesktopTopBar'
import OnboardingCheck from '@/app/(auth)/onboarding/components/OnboardingCheck'
import { LocationProvider } from '@/app/lib/contexts/LocationContext'

export default function DashboardLayout({ children }) {
  return (
    <OnboardingCheck>
      <LocationProvider>
        <div className="min-h-screen accent-bg-color p-3 lg:pl-52">
          <NavigationSideBar />
          <div className="min-h-[calc(100vh-1.5rem)] bg-gray-50 rounded-[1.25rem] lg:ml-1 mt-14 lg:mt-0 flex flex-col">
            <div className="hidden lg:block">
              <DesktopTopBar />
            </div>
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </LocationProvider>
    </OnboardingCheck>
  )
}