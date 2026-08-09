'use client'

import { useState, useEffect } from 'react'
import { useTheme, Button } from '@/app/components/ui/kit'

// ── SetupCoach ────────────────────────────────────────────────────────────────
// The companion's final leg: after the onboarding flow drops a new manager on the
// rota builder (?setup=1), this docks bottom-right and walks them through
// generate -> review -> publish, then bows out for good. Collapsible to a bubble,
// dismissable, and it never comes back once setup is finished (localStorage).
const DONE_KEY = 'shiftly_setup_done'

export default function SetupCoach({ active, generating, hasResult, published, onGenerate }) {
  const { T } = useTheme()
  const [done, setDone] = useState(true) // assume done until we've checked storage (avoids a flash)
  const [open, setOpen] = useState(true)

  useEffect(() => { setDone(localStorage.getItem(DONE_KEY) === '1') }, [])

  const finish = () => { localStorage.setItem(DONE_KEY, '1'); setDone(true) }

  if (!active || done) return null

  const stage = published ? 'published' : generating ? 'generating' : hasResult ? 'review' : 'ready'
  const copy = {
    ready: {
      title: "You're all set up",
      body: "Hit build and I'll turn your minimum working week into a real schedule. It only takes a few seconds.",
    },
    generating: {
      title: 'Building your rota',
      body: 'Give it a few seconds while the scheduler wakes up.',
    },
    review: {
      title: 'How does it look?',
      body: "Everything's covered from your minimum week. To change anything: drag a shift onto someone else to reassign, tap the × to remove one, or use + to add more. When it looks right, hit Publish and your team sees it in their app.",
    },
    published: {
      title: 'Published, nice one',
      body: "Your team will see this in their app now. You can edit and republish any time. That's you set up and ready to go.",
    },
  }[stage]

  // Collapsed: a small bubble to re-open.
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Open setup assistant"
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 90, width: 52, height: 52, borderRadius: 999, background: T.pink, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 20, boxShadow: `0 8px 24px ${T.pink}55` }}>S</button>
    )
  }

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 90, width: 340, maxWidth: 'calc(100vw - 48px)', fontFamily: T.font, background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: T.shadowHover, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', borderBottom: `1px solid ${T.hair}` }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: T.pink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>S</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, flex: 1 }}>Setup assistant</span>
        <button onClick={() => setOpen(false)} aria-label="Minimise" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
          <span style={{ display: 'block', width: 12, height: 2, borderRadius: 2, background: T.faint }} />
        </button>
        <button onClick={finish} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 4 }}>×</button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, marginBottom: 6, letterSpacing: '-0.01em' }}>{copy.title}</div>
        <p style={{ fontSize: 13, color: T.body, lineHeight: 1.55, margin: 0 }}>{copy.body}</p>

        {stage === 'ready' && onGenerate && (
          <Button full size="sm" style={{ marginTop: 14 }} onClick={onGenerate}>Build my rota</Button>
        )}
        {stage === 'published' && (
          <Button full size="sm" style={{ marginTop: 14 }} onClick={finish}>Finish setup</Button>
        )}
        {stage === 'review' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: T.faint }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />Publish is in the bar above the rota.
          </div>
        )}
      </div>
    </div>
  )
}
