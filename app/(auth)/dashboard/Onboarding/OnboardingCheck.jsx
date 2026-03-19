'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function OnboardingCheck({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoaded, user } = useUser()
  const [checking, setChecking] = useState(true)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    // Wait for Clerk to load — stay on spinner
    if (!isLoaded) return
    
    // If no user (logged out somehow), let Clerk middleware handle it
    if (!user) {
      setChecking(false)
      setShouldShow(true)
      return
    }

    // Don't redirect if already on onboarding page
    if (pathname === '/onboarding') {
      setShouldShow(true)
      setChecking(false)
      return
    }

    const checkAccess = async () => {
      try {
        // Step 1: Check if user is an employee — redirect before showing ANY manager UI
        const cacheKey = `shiftly_user_type_${user.id}`
        const cachedType = localStorage.getItem(cacheKey)

        if (cachedType === 'employee') {
          router.replace('/employee')
          return // Stay on spinner forever — redirect will unmount us
        }

        // If no cache, check the API
        if (!cachedType) {
          const typeResponse = await fetch('/api/auth/user-type')
          const typeData = await typeResponse.json()

          if (typeData.type === 'employee') {
            localStorage.setItem(cacheKey, 'employee')
            router.replace('/employee')
            return // Stay on spinner
          }

          // Cache as manager so we skip this check next time
          if (typeData.type === 'manager' || typeData.type === 'new') {
            localStorage.setItem(cacheKey, 'manager')
          }
        }

        // Step 2: User is a manager — check onboarding status
        const response = await fetch('/api/teams')
        if (response.ok) {
          const teams = await response.json()
          const defaultTeam = teams.find(t => t.is_default) || teams[0]

          if (!defaultTeam?.onboarding_completed) {
            router.push('/onboarding')
            return
          }

          setShouldShow(true)
        } else {
          setShouldShow(true)
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