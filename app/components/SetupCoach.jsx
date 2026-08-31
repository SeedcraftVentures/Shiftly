'use client'

import { useState, useEffect } from 'react'
import { useTheme, Button } from '@/app/components/ui/kit'

// ── SetupCoach ────────────────────────────────────────────────────────────────
// The companion's final leg: after onboarding drops a new manager on the rota
// builder (?setup=1), this docks bottom-right and walks them through
// generate -> review -> publish, then bows out for good. The review stage is
// compliance-aware: it reads the builder's live checks and tells the manager
// exactly what to look at (keyholder gaps, people under contract, relaxed/skipped
// teams) and how to fix it by hand, framing the result as a baseline to flex, not
// a finished rota. Collapsible, dismissable, never returns once finished.
const DONE_KEY = 'shiftly_setup_done'

export default function SetupCoach({ active, generating, hasResult, published, onGenerate, compliance = [], contractIssues = [], relaxed = [], skipped = [] }) {
  const { T } = useTheme()
  const [done, setDone] = useState(true) // assume done until we've checked storage (avoids a flash)
  const [open, setOpen] = useState(true)

  useEffect(() => { setDone(localStorage.getItem(DONE_KEY) === '1') }, [])

  const finish = () => { localStorage.setItem(DONE_KEY, '1'); setDone(true) }

  if (!active || done) return null

  const stage = published ? 'published' : generating ? 'generating' : hasResult ? 'review' : 'ready'

  // Build the specific "worth a look" list from the builder's live compliance.
  const issues = []
  const kh = compliance.find((c) => c.key === 'keyholder' && !c.ok)
  if (kh) issues.push({ t: 'Keyholder cover', d: `${kh.detail}. Put someone who can lock up on those shifts, or mark a team member as a keyholder in Staff.` })
  if (contractIssues.length) {
    const names = [...new Set(contractIssues.map((i) => i.staff_name))]
    issues.push({ t: 'Contracted hours', d: `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''} ${names.length === 1 ? 'is' : 'are'} under contract. The baseline has fewer shifts than their hours, so add a shift on a quieter day with + (two on a day is fine) and the bars on the right fill up.` })
  }
  if (relaxed?.length) issues.push({ t: 'Rules relaxed', d: `I eased a couple of rules to build ${relaxed.join(', ')}. Fine for a first pass; add staff or availability to tighten it.` })
  if (skipped?.length) issues.push({ t: "Couldn't build a team", d: `${skipped.map((s) => s.teamName || s.team).filter(Boolean).join(', ')} did not build. Add staff or lower the minimum, then build again.` })
  for (const c of compliance) { if (c.key !== 'keyholder' && !c.ok && c.detail) issues.push({ t: c.label, d: c.detail }) }

  const copy = {
    ready: { title: "You're all set up", body: "Hit build and I'll turn your minimum working week into a real schedule. It only takes a few seconds." },
    generating: { title: 'Building your rota', body: 'Give it a few seconds while the scheduler wakes up.' },
    review: { title: 'Your baseline is built', body: "This is a starting point, not the final rota. Have a quick look, tweak anything, then publish." },
    published: { title: 'Published, nice one', body: "Your team will see this in their app now. You can edit and republish any time. That's you set up and ready to go." },
  }[stage]

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Open setup assistant"
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 90, width: 52, height: 52, borderRadius: 999, background: T.pink, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 20, boxShadow: `0 8px 24px ${T.pink}55` }}>S</button>
    )
  }

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 90, width: 360, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', fontFamily: T.font, background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: T.shadowHover, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', borderBottom: `1px solid ${T.hair}` }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: T.pink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>S</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, flex: 1 }}>Setup assistant</span>
        <button onClick={() => setOpen(false)} aria-label="Minimise" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
          <span style={{ display: 'block', width: 12, height: 2, borderRadius: 2, background: T.faint }} />
        </button>
        <button onClick={finish} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 4 }}>×</button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto' }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, marginBottom: 6, letterSpacing: '-0.01em' }}>{copy.title}</div>
        <p style={{ fontSize: 13, color: T.body, lineHeight: 1.55, margin: 0 }}>{copy.body}</p>

        {stage === 'ready' && onGenerate && (
          <Button full size="sm" style={{ marginTop: 14 }} onClick={onGenerate}>Build my rota</Button>
        )}

        {stage === 'review' && (
          <>
            {issues.length > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase', margin: '16px 0 8px' }}>Worth a look</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {issues.map((it, i) => (
                    <div key={i} style={{ background: T.subtle, borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{it.t}</div>
                      <div style={{ fontSize: 12.5, color: T.body, lineHeight: 1.5 }}>{it.d}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: T.body, lineHeight: 1.55, margin: '12px 0 0' }}>It looks fully covered. Have a scan on the left, then publish.</p>
            )}

            <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5, marginTop: 14 }}>
              Edit anything: click a shift to change it, drag it onto someone else to reassign, x to remove, + to add. The compliance panel on the right updates as you go.
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: T.faint }}>
              When you're happy, hit Publish in the bar above.
            </div>
          </>
        )}

        {stage === 'published' && (
          <Button full size="sm" style={{ marginTop: 14 }} onClick={finish}>Finish setup</Button>
        )}
      </div>
    </div>
  )
}
