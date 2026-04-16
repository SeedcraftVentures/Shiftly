import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import NavigationSideBar from '@/app/components/navigation/NavigationSideBar'
import DesktopTopBar from '@/app/components/layout/DesktopTopBar'
import { LocationProvider } from '@/app/lib/contexts/LocationContext'
import { getUserRoles } from '@/app/lib/server/getUserRoles'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { isManager, isStaff, hasOnboarded } = await getUserRoles(userId)

  // Not a manager → not allowed in /dashboard
  if (!isManager) {
    if (isStaff) redirect('/my')
    redirect('/onboarding')
  }

  // Manager but hasn't completed onboarding → send them back
  if (!hasOnboarded) redirect('/onboarding')

  return (
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
  )
}