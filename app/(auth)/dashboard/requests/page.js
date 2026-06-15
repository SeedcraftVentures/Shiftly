'use client'

import { T, Card } from '@/app/components/ui/kit'

// Inbox is gated for the pilot — the employee app (requests, swaps, announcements)
// isn't part of this release. Shown as "coming soon" rather than exposing half-wired flows.
export default function InboxPage() {
  return (
    <div style={{ fontFamily: T.font, maxWidth: 640, margin: '0 auto', padding: '28px 28px 56px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, margin: '0 0 4px', letterSpacing: -0.3 }}>Inbox</h1>
      <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 24px' }}>Staff requests, shift swaps and announcements.</p>

      <Card pad={40} style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px', background: T.pink + '14', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <p style={{ fontSize: 17, fontWeight: 800, color: T.ink, margin: '0 0 6px' }}>Coming soon</p>
        <p style={{ fontSize: 13.5, color: T.muted, margin: '0 auto', maxWidth: 380, lineHeight: 1.55 }}>
          The Inbox arrives with the staff app — your team will request time off, swap shifts and read announcements here. For now, build and publish rotas and share them with your team.
        </p>
      </Card>
    </div>
  )
}
