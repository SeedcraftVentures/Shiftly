'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui'

export default function PaymentPlaceholderPage() {
  const router = useRouter()
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)

  // Confirm the user has a pending onboarding before showing the payment step
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pending-onboarding')
        const json = await res.json()
        if (!json.payload) {
          // Nothing pending — they shouldn't be here
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
    // Dev-only: bypass payment and call the real provisioning endpoint.
    // In Phase 6 this goes away — the subscription webhook handles provisioning.
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      const err = await res.json()
      alert(err.error || 'Failed to complete onboarding')
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

        <Button variant="primary" size="md" onClick={handleDevSkip} style={{ width: '100%' }}>
          Skip payment (dev)
        </Button>
      </div>
    </div>
  )
}