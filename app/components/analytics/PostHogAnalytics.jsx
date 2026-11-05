'use client'

// Mounts on every page (it lives in the root layout) but is a no-op unless PostHog is
// configured, and it NEVER initialises or records on the authenticated dashboard.
// Pageviews are captured manually so query params (utm_source etc.) ride along for
// outreach attribution.
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { analyticsConfigured, isExcludedPath, readConsent, initPostHog } from './consent'

export default function PostHogAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialise once, and only off the excluded (authenticated) surface.
  useEffect(() => {
    if (!analyticsConfigured()) return
    if (isExcludedPath(window.location.pathname)) return
    initPostHog()
  }, [])

  // On every route change: capture a pageview on marketing pages (once consented), and
  // hard-stop any session recording the moment navigation enters an excluded surface.
  useEffect(() => {
    if (!analyticsConfigured()) return
    if (isExcludedPath(pathname)) {
      try {
        posthog.stopSessionRecording?.()
      } catch {}
      return
    }
    if (readConsent() !== 'granted') return
    try {
      posthog.capture('$pageview', { $current_url: window.location.href })
    } catch {}
  }, [pathname, searchParams])

  return null
}
