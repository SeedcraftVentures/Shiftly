'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, Card, Button, Icon, Ic } from '@/app/components/ui/kit'

// ── LeaveNudge ────────────────────────────────────────────────────────────────
// The operational reminder that gets missed: unused holiday near the year end.
// Computed live from /api/reports/leave (no DB writes, no dependency on the inbox
// system), shows on the dashboard when the holiday year is within 8 weeks and
// staff still have days owed. Dismissible per holiday year (re-appears next year).
export default function LeaveNudge() {
  const { T } = useTheme()
  const router = useRouter()
  const [leave, setLeave] = useState(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    fetch('/api/reports/leave')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.summary) return
        setLeave(d)
        setDismissed(localStorage.getItem(`shiftly_leave_nudge_${d.yearStart}`) === '1')
      })
      .catch(() => {})
  }, [])

  if (!leave) return null
  const show = leave.weeksToEnd <= 8 && leave.summary.staffWithUnused > 0
  if (!show || dismissed) return null

  const dismiss = () => { localStorage.setItem(`shiftly_leave_nudge_${leave.yearStart}`, '1'); setDismissed(true) }
  const yearEnd = (() => { try { return new Date(leave.yearEnd + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return leave.yearEnd } })()
  const n = leave.summary.staffWithUnused

  return (
    <Card pad={18} style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 14, background: T.pink + '0C', border: `1px solid ${T.pink}30` }}>
      <span style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: T.pink + '1A', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={Ic.calendar} size={18} stroke={1.9} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>Unused holiday before the year ends</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>{n} of your team {n === 1 ? 'has' : 'have'} holiday to use before {yearEnd} ({leave.weeksToEnd} week{leave.weeksToEnd === 1 ? '' : 's'} away), {leave.summary.totalUnusedDays} days owed in total. Prompt them to book it in.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <Button size="sm" onClick={() => router.push('/dashboard/reports')}>View in Reports</Button>
          <Button size="sm" variant="secondary" onClick={dismiss}>Dismiss</Button>
        </div>
      </div>
    </Card>
  )
}
