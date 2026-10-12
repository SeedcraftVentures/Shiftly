'use client'

import { useState, useEffect } from 'react'
import { Card, Button, useTheme } from '@/app/components/ui/kit'

// Shown to a brand-new FOUNDING member (tagged ?founding=1 on the post-checkout redirect)
// so they book their free in-person setup right away. Persists via localStorage so it
// survives navigation until they book or dismiss it, rather than only on the redirect.
const KEY = 'shiftly_founding_setup_pending'
const BOOKING_URL = 'https://calendar.app.google/GTCQtKmBgThw2u2T9'

export default function FoundingSetupBanner() {
  const { T } = useTheme()
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('founding') === '1') localStorage.setItem(KEY, '1')
      setShow(localStorage.getItem(KEY) === '1')
    } catch {}
  }, [])

  if (!show) return null

  const dismiss = () => { try { localStorage.removeItem(KEY) } catch {}; setShow(false) }
  const book = () => { try { window.open(BOOKING_URL, '_blank', 'noopener,noreferrer') } catch {}; dismiss() }

  return (
    <Card solid pad={20} style={{ marginBottom: 18, border: `1px solid ${T.pink}33`, background: T.pink + '0E' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 4, letterSpacing: '-0.01em' }}>Welcome, founding member</div>
          <div style={{ fontSize: 13, color: T.body, lineHeight: 1.55 }}>
            Your free in-person setup is included. If you are in central Scotland (Edinburgh, Glasgow, Dundee, Perth, Stirling and nearby), pick a time and I will come and set it up with you.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Button size="sm" onClick={book}>Book a setup visit</Button>
          <button onClick={dismiss} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: T.font }}>Not now</button>
        </div>
      </div>
    </Card>
  )
}
