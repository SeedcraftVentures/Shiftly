'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

// Employee router + passthrough. Employees are sent to their own app; everyone
// else (managers, and brand-new accounts with no data yet) drops straight into
// the dashboard. First-run setup is no longer a separate route: the in-app
// SetupCompanion, mounted in the dashboard layout, guides new managers in place.
export default function OnboardingCheck({ children }) {
  const router = useRouter()
  const { isLoaded, user } = useUser()
  const [checking, setChecking] = useState(true)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    if (!user) {
      setChecking(false)
      setShouldShow(true)
      return
    }

    const checkAccess = async () => {
      try {
        // Is this an employee? If so, route them to their own app.
        const cacheKey = `shiftly_user_type_${user.id}`
        const cachedType = localStorage.getItem(cacheKey)

        if (cachedType === 'employee') {
          router.replace('/employee')
          return
        }

        if (!cachedType) {
          const typeResponse = await fetch('/api/auth/user-type')
          if (typeResponse.ok) {
            const typeData = await typeResponse.json()

            if (typeData.type === 'employee') {
              localStorage.setItem(cacheKey, 'employee')
              router.replace('/employee')
              return
            }

            if (typeData.type === 'manager' || typeData.type === 'new') {
              localStorage.setItem(cacheKey, 'manager')
            }
          }
          // If the user-type API fails, fall through to the dashboard rather
          // than block a manager out of their own app.
        }

        // Manager (or new) -> show the dashboard. The SetupCompanion handles
        // first-run setup in place; no redirect.
        setShouldShow(true)
      } catch (error) {
        console.error('Error checking user type:', error)
        setShouldShow(true) // fail open to the dashboard, never strand a manager
      } finally {
        setChecking(false)
      }
    }

    checkAccess()
  }, [isLoaded, user, router])

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