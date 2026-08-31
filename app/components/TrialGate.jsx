'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useEntitlement } from '@/app/hooks/useEntitlement'
import { useTheme, Button } from '@/app/components/ui/kit'

const ACCENT = '#FF1F7D'

// Client-side entitlement gate for the manager dashboard. Two states:
//   trialExpired  -> a blocking full-screen paywall (data-preserved messaging +
//                    a route to /checkout, which owns the plan picker). This is
//                    the "don't lose your rotas" moment.
//   isTrialing    -> a slim, non-blocking countdown nudge toward /checkout.
// Fails open: while loading, or on any not-expired state, it renders nothing and
// the dashboard behaves normally. Staff are never seeded a trial, so they never
// see this (and their app doesn't mount it anyway).
export default function TrialGate() {
  const { T } = useTheme()
  const router = useRouter()
  const { signOut } = useAuth()
  // Only the paywall lives here now. The in-trial countdown is a non-sticky
  // banner (TrialBanner) rendered in the dashboard content flow.
  const { loading, trialExpired } = useEntitlement()

  if (loading) return null

  if (trialExpired) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(10,10,12,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: 460, background: T.cardSolid, borderRadius: 16,
            border: `1px solid ${T.border}`, boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
            padding: '32px 28px', textAlign: 'center',
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ACCENT}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: T.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Your free trial has ended
          </h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, color: T.body, margin: '0 0 22px' }}>
            Your rotas, staff and settings are all saved. Subscribe to pick up right where you left off.
          </p>
          <Button full arrow onClick={() => router.push('/checkout')}>See plans and subscribe</Button>
          <button
            onClick={async () => { await signOut(); router.push('/') }}
            style={{ marginTop: 14, background: 'none', border: 'none', color: T.muted, fontFamily: T.font, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Log out
          </button>
        </div>
      </div>
    )
  }

  return null
}
