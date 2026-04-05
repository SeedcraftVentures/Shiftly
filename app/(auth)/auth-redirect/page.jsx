'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
// import { useUser } from '@/app/lib/authless'
import { useRouter } from 'next/navigation'

export default function AuthRedirectPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [status, setStatus] = useState('Checking your account...')

  useEffect(() => {
    if (!isLoaded) return
    
    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }

    const checkUserType = async () => {
      try {
        setStatus('Finding your dashboard...')
        
        const response = await fetch('/api/auth/user-type')
        const data = await response.json()

        if (data.type === 'employee') {
          setStatus('Welcome back! Redirecting to your schedule...')
          setTimeout(() => router.push('/employee'), 500)
        } else {
          setStatus('Welcome back! Redirecting to your dashboard...')
          setTimeout(() => router.push('/dashboard'), 500)
        }
      } catch (error) {
        console.error('Error checking user type:', error)
        router.push('/dashboard')
      }
    }

    checkUserType()
  }, [isLoaded, isSignedIn, router])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </main>
  )
}