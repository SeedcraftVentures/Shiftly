'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, useTheme } from '@/app/components/ui/kit'

// Persistent "add your team's pay" reminder. Missing pay silently breaks reports and the
// companion's costing, and the old setup checklist was dismiss-forever so the prompt could
// vanish before pay was ever set. This reappears each new session (sessionStorage) until
// every person has pay, then it stops on its own.
const KEY = 'shiftly_wages_nudge_dismissed'

const hasPay = (s) => {
  const basis = s.pay_basis || 'hourly'
  if (basis === 'hourly') return (s.hourly_rate || 0) > 0
  return (s.annual_salary || 0) > 0 // salary / annualised
}

export default function WagesNudge({ staff }) {
  const { T } = useTheme()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(KEY) === '1') } catch {}
  }, [])

  if (!Array.isArray(staff) || staff.length === 0 || dismissed) return null
  const missing = staff.filter((s) => !hasPay(s))
  if (missing.length === 0) return null

  const dismiss = () => { try { sessionStorage.setItem(KEY, '1') } catch {}; setDismissed(true) }

  return (
    <Card solid pad={18} style={{ marginBottom: 18, border: `1px solid ${T.amber}44`, background: T.amber + '12' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink, marginBottom: 3, letterSpacing: '-0.01em' }}>Add your team&apos;s pay</div>
          <div style={{ fontSize: 12.5, color: T.body, lineHeight: 1.5 }}>
            {missing.length} {missing.length === 1 ? 'person has' : 'people have'} no pay set yet. Your reports and costs need it to be right. Add it on the Staff page.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Button size="sm" onClick={() => router.push('/dashboard/staff')}>Add pay</Button>
          <button onClick={dismiss} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: T.font }}>Later</button>
        </div>
      </div>
    </Card>
  )
}
