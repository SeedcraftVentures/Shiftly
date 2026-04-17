'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { Button } from '@/app/components/ui'

export default function PaymentPlaceholderPage() {
  const router = useRouter()
  const { setActive, isLoaded: orgsLoaded } = useOrganizationList()
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pending-onboarding')
        const json = await res.json()
        if (!json.payload) {
          router.replace('/onboarding')
          return
        }
        setPending(json.payload)
      } catch (err) {
        console.error(err)
        router.replace('/onboarding')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleDevSkip = async () => {
    setSaving(true)
    setError(null)
    try {
      // 1. Create the Clerk org + Supabase rows
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to complete onboarding')
      }

      const { organization_id } = await res.json()

      // 2. Activate the new org in the user's Clerk session
      if (setActive) {
        await setActive({ organization: organization_id })
      }

      // Full page navigation (not SPA push) ensures Clerk's session cookie
      // is sent with the fresh org_id claim on the very first request.
      window.location.href = '/dashboard'
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-shiftly-pink rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, var(--shiftly-pink-light) 0%, var(--gray-0) 50%, var(--team-purple-light) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--gray-0)',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          border: '1px solid var(--gray-100)',
          padding: '40px 44px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1 className="heading-page" style={{ marginBottom: 12 }}>
          One last step
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 24px' }}>
          Payment integration coming soon. In the meantime, you can skip this step for development.
        </p>

        <div
          style={{
            padding: 20,
            background: 'var(--gray-50)',
            borderRadius: 12,
            textAlign: 'left',
            marginBottom: 24,
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-600)',
            lineHeight: 1.6,
          }}
        >
          <strong>Saved:</strong> {pending?.organization_name}<br />
          Industry: {pending?.industry}<br />
          Teams: {pending?.teams?.length || 0}<br />
          Staff: {Object.values(pending?.staff_by_team || {}).flat().length}
        </div>

        {error && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--red-500)', margin: '0 0 12px' }}>
            {error}
          </p>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={handleDevSkip}
          disabled={saving || !orgsLoaded}
          style={{ width: '100%' }}
        >
          {saving ? 'Finishing setup…' : 'Skip payment (dev)'}
        </Button>
      </div>
    </div>
  )
}