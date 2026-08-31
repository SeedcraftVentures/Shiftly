'use client'

import { useRouter } from 'next/navigation'
import { useEntitlement } from '@/app/hooks/useEntitlement'
import { useTheme } from '@/app/components/ui/kit'

const ACCENT = '#FF1F7D'

// Thin, in-flow trial banner across the top of the dashboard content. Not sticky:
// it scrolls away with the page (unlike the old fixed pill). Renders nothing
// unless the manager is inside their no-card trial. The post-trial paywall lives
// in TrialGate; this is only the gentle countdown + subscribe nudge.
export default function TrialBanner() {
  const { T } = useTheme()
  const router = useRouter()
  const { loading, isTrialing, daysLeft } = useEntitlement()

  if (loading || !isTrialing || daysLeft <= 0) return null

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 18px',
        background: `${ACCENT}12`,
        borderBottom: `1px solid ${T.border}`,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        fontFamily: T.font,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 99, background: ACCENT, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
        {daysLeft} day{daysLeft === 1 ? '' : 's'} left in your free trial.
      </span>
      <button
        onClick={() => router.push('/checkout')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, fontSize: 13, fontWeight: 700, color: ACCENT, padding: 0 }}
      >
        Subscribe
      </button>
    </div>
  )
}
