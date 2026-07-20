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
    if (!isLoaded) return
    
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
        // Step 1: Check if user is an employee
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
          // If user-type API fails, continue to onboarding check
          // rather than silently letting through
        }

        // Step 2: Check onboarding status
        const response = await fetch('/api/teams')
        
        if (response.ok) {
          const teams = await response.json()
          const defaultTeam = teams.find(t => t.is_default) || teams[0]

          // Redirect to onboarding if:
          // - No teams exist at all
          // - Default team hasn't completed onboarding
          if (!defaultTeam || !defaultTeam.onboarding_completed) {
            router.replace('/onboarding')
            return
          }

          // All checks passed, show dashboard
          setShouldShow(true)
        } else {
          // API error, fail closed, send to onboarding
          // Better to re-onboard than to show a broken dashboard
          console.error('Teams API returned non-OK:', response.status)
          router.replace('/onboarding')
          return
        }
      } catch (error) {
        // Network error, fail closed, send to onboarding
        console.error('Error checking access:', error)
        router.replace('/onboarding')
        return
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