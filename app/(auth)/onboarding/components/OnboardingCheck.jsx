'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
// import { useUser } from '@/app/lib/authless'
import { USER_TYPE } from '@/app/lib/constants'

export default function OnboardingCheck({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoaded, user } = useUser()
  const [checking, setChecking] = useState(true)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const isOnboardingPage = pathname === '/onboarding'

    // Wait for Clerk to load — stay on spinner
    if (!isLoaded) return
    
    // If no user (logged out somehow), let Clerk middleware handle it
    if (!user) {
      setChecking(false)
      setShouldShow(true)
      return
    }

    const checkAccess = async () => {
      try
      {
        const typeResponse = await fetch('/api/auth/user-type')
        const { userType } = await typeResponse.json()
        console.log(userType);

        if (userType == USER_TYPE.staff) {
          router.replace('/employee')
          return
        }
        // TODO: Handle payroll users
        else if (userType == USER_TYPE.manager) {
          // Step 2: User is a manager — check onboarding status
          const response = await fetch('/api/organization')
          if (response.ok) {
            const organization = await response.json()

            if (isOnboardingPage && organization.onboarding_completed) {
              router.replace('/dashboard')
              return
            }

            if (!isOnboardingPage && !organization.onboarding_completed) {
              router.replace('/onboarding')
              return
            }

            setShouldShow(true)
          } else {
            setShouldShow(true)
          }
        }
      } catch (error) {
        console.error('Error checking access:', error)
        setShouldShow(true)
      } finally {
        setChecking(false)
      }
    }

    checkAccess()
  }, [isLoaded, user, pathname, router])

  if (checking || !shouldShow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}