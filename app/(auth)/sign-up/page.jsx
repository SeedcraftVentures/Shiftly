'use client'

import { useSignUp, useAuth } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const badWords = [
  'fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard', 'cunt', 'dick', 'cock', 
  'pussy', 'piss', 'nigger', 'fag', 'retard', 'slut', 'whore', 'penis', 
  'vagina', 'anus', 'butthole', 'poopy', 'poop', 'crap', 'turd', 'asshole',
  'motherfucker', 'bollocks', 'wanker', 'twat'
]

function containsBadWord(text) {
  if (!text) return false
  const lowerText = text.toLowerCase()
  return badWords.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lowerText)
  })
}

function isOnlyNumbersOrSymbols(text) {
  if (!text) return false
  return !/[a-zA-Z]/.test(text)
}

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  // Optional post-signup destination. The founding card sends people to
  // `?next=/checkout?plan=annual` so they go straight to paying, skipping the
  // trial. Only internal paths are honoured (no open redirect).
  const { isSignedIn } = useAuth()
  const getDest = () => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null
    return p && p.startsWith('/') && !p.startsWith('//') ? p : '/dashboard'
  }
  useEffect(() => { if (isSignedIn) router.replace(getDest()) }, [isSignedIn, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isLoaded) return

    const fullName = `${firstName} ${lastName}`.trim()

    // AUTH-02: Block bad words
    if (containsBadWord(fullName)) {
      setError('Please use an appropriate name')
      return
    }

    // AUTH-03: Block numbers/symbols only
    if (isOnlyNumbersOrSymbols(fullName)) {
      setError('Name must contain at least one letter')
      return
    }

    setError('')

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      })

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setVerifying(true)
    } catch (err) {
      console.error('Signup error:', err)
      setError(err.errors?.[0]?.message || 'Failed to sign up')
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    
    if (!isLoaded) return

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId })
        // Default: straight into the app (the no-card trial seeds on onboarding).
        // A `next` param (e.g. the founding card -> checkout) overrides this.
        router.push(getDest())
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError(err.errors?.[0]?.message || 'Invalid code')
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {!verifying ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
              <p className="text-gray-600">Start scheduling in minutes</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Clerk Smart CAPTCHA mounts here on signUp.create (custom flow).
                  Without it, Clerk warns and falls back to Invisible CAPTCHA. */}
              <div id="clerk-captcha" />

              <button
                type="submit"
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/sign-in" className="text-pink-600 hover:text-pink-700 font-semibold">
                  Sign in
                </a>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
              <p className="text-gray-600">Enter the code sent to {email}</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Verification code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center text-2xl tracking-widest"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Verify Email
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setVerifying(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}