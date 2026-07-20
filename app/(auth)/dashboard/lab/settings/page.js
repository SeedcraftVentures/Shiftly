'use client'

import { useTheme, LabCanvas, Card, Btn, Switch, Icon, Ic, ThemeToggle, FONT, EASE } from '../_apple/kit'
import { useState } from 'react'

// ════════════════════════════════════════════════════════════════════════════
//  SETTINGS — UX SANDBOX v1 (Apple-esque · mock data only)
//  Home of the Appearance / dark-mode control. The choice persists globally,
//  so flipping it here re-themes every other lab page (dashboard, shifts…).
// ════════════════════════════════════════════════════════════════════════════

function Row({ T, title, sub, control, top }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', borderTop: top ? `1px solid ${T.hair}` : 'none' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: T.muted, marginTop: 3, letterSpacing: '-0.01em', lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {control}
    </div>
  )
}
function Group({ T, label, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', margin: '0 4px 12px' }}>{label}</div>
      <Card T={T} pad={0} style={{ overflow: 'hidden' }}>{children}</Card>
    </div>
  )
}

export default function SettingsLab() {
  const { theme, setTheme, T } = useTheme()
  const [emailNudges, setEmailNudges] = useState(true)
  const [autoPublish, setAutoPublish] = useState(false)

  return (
    <LabCanvas T={T} theme={theme} setTheme={setTheme} note="settings · mock data" maxWidth={760}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Settings</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: '6px 0 0', letterSpacing: '-0.01em' }}>Manage how Shiftly looks and works for you.</p>
      </div>

      <Group T={T} label="Appearance">
        <Row T={T}
          title="Theme"
          sub="Choose a light or dark interface. Applies across the whole app."
          control={<ThemeToggle theme={theme} setTheme={setTheme} T={T} />}
        />
      </Group>

      <Group T={T} label="Location">
        <Row T={T} title="Active location" sub="Camden Roastery" control={<Btn T={T} size="sm">Switch</Btn>} />
        <Row T={T} top title="Opening hours" sub="Mon–Fri 9am–5pm · Sat 10am–4pm · Sun closed" control={<Btn T={T} size="sm">Edit</Btn>} />
      </Group>

      <Group T={T} label="Notifications">
        <Row T={T} title="Email nudges" sub="Reminders to publish next week's rota in good time." control={<Switch T={T} on={emailNudges} onClick={() => setEmailNudges(v => !v)} />} />
        <Row T={T} top title="Auto-publish drafts" sub="Publish generated rotas automatically once they're complete." control={<Switch T={T} on={autoPublish} onClick={() => setAutoPublish(v => !v)} />} />
      </Group>

      <Group T={T} label="Account">
        <Row T={T} title="Andre Lemaitre" sub="andrelemaitre30@gmail.com" control={<Btn T={T} size="sm">Manage</Btn>} />
        <Row T={T} top title="Subscription" sub="Pro · billed annually" control={<Btn T={T} size="sm">Billing</Btn>} />
      </Group>

      <p style={{ fontSize: 12.5, color: T.faint, textAlign: 'center', marginTop: 8, letterSpacing: '-0.01em' }}>
        In the real app the theme toggle lives here — the thin bar toggle above is only a sandbox convenience for reviewing pages.
      </p>
    </LabCanvas>
  )
}
