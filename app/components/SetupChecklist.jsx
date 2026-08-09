'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, Card, Icon, Ic } from '@/app/components/ui/kit'

// ── SetupChecklist ────────────────────────────────────────────────────────────
// After the companion FTUE, a few things still make the product whole: real pay
// (so payroll and reports work), inviting the team (so they self-serve), and
// publishing the first rota. This card tracks them and ticks each off on its own
// from live data, then disappears when everything's done or the manager dismisses
// it. Only shows once there's a team (i.e. setup has happened).
const DONE_KEY = 'shiftly_checklist_dismissed'

export default function SetupChecklist() {
  const { T } = useTheme()
  const router = useRouter()
  const [staff, setStaff] = useState(null)
  const [rotas, setRotas] = useState([])
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(DONE_KEY) === '1')
    Promise.all([
      fetch('/api/staff').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/rotas').then((r) => (r.ok ? r.json() : [])),
    ]).then(([s, r]) => { setStaff(Array.isArray(s) ? s : []); setRotas(Array.isArray(r) ? r : []) }).catch(() => setStaff([]))
  }, [])

  if (dismissed || staff === null || staff.length === 0) return null

  const items = [
    {
      key: 'pay',
      label: 'Add your team\'s pay',
      hint: 'So payroll and reports are accurate',
      done: staff.every((s) => (s.hourly_rate || 0) > 0),
      go: () => router.push('/dashboard/staff'),
    },
    {
      key: 'invite',
      label: 'Invite your team to the app',
      hint: 'Share your join code so they set their own availability',
      done: staff.some((s) => s.clerk_user_id),
      go: () => router.push('/dashboard/staff'),
    },
    {
      key: 'publish',
      label: 'Publish your first rota',
      hint: 'Your team sees it in their app straight away',
      done: rotas.some((r) => r.status === 'Published'),
      go: () => router.push('/dashboard/generate'),
    },
  ]

  const doneCount = items.filter((i) => i.done).length
  if (doneCount === items.length) return null // all sorted; nothing to show

  const dismiss = () => { localStorage.setItem(DONE_KEY, '1'); setDismissed(true) }

  return (
    <Card pad={20} style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>Finish setting up</div>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{doneCount} of {items.length} done. A couple of things to make it whole.</div>
        </div>
        <button onClick={dismiss} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Dismiss</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) => (
          <button
            key={it.key}
            onClick={it.done ? undefined : it.go}
            disabled={it.done}
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: it.done ? T.subtle : T.pink + '0A', border: `1px solid ${it.done ? T.hair : T.pink + '2E'}`, borderRadius: 12, padding: '11px 14px', cursor: it.done ? 'default' : 'pointer', fontFamily: T.font, width: '100%' }}
          >
            <span style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, background: it.done ? T.green : 'transparent', border: it.done ? 'none' : `2px solid ${T.pink}66`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {it.done && <Icon path={Ic.check} size={12} stroke={3} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: it.done ? T.muted : T.ink, textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</span>
              {!it.done && <span style={{ display: 'block', fontSize: 12, color: T.muted, marginTop: 1 }}>{it.hint}</span>}
            </span>
            {!it.done && <Icon path={Ic.chevron} size={16} stroke={2.2} color={T.faint} />}
          </button>
        ))}
      </div>
    </Card>
  )
}
