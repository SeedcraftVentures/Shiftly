// Shared PostHog + consent helpers for the PUBLIC marketing site.
//
// Hard rules this file enforces (see tasks/todo.md):
//  - PostHog is configured only when a real project key (phc_...) is present, so the
//    site and the consent banner stay dormant until Andre adds the key.
//  - Nothing is captured and NO cookie is set until the visitor clicks Accept
//    (opted out by default). This keeps us on the right side of UK PECR.
//  - The authenticated dashboard is an excluded surface: PostHog must never
//    initialise or record there, so customer staff data is never sent to a third party.
import posthog from 'posthog-js'

export const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
export const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
export const CONSENT_KEY = 'shiftly_analytics_consent' // 'granted' | 'denied'

// Authenticated, PII-heavy surfaces. Analytics never touches these.
const EXCLUDED = ['/dashboard']

export function analyticsConfigured() {
  return typeof KEY === 'string' && KEY.startsWith('phc_')
}

export function isExcludedPath(path) {
  if (!path) return false
  return EXCLUDED.some((p) => path === p || path.startsWith(p + '/'))
}

export function readConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY)
  } catch {
    return null
  }
}

function writeConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value)
  } catch {}
}

let started = false

// Initialise PostHog once, opted OUT until the visitor consents: no capture, no cookie.
export function initPostHog() {
  if (started || !analyticsConfigured()) return
  started = true
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // captured manually on route change
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true, // no events until Accept
    opt_out_persistence_by_default: true, // no cookie until Accept
    session_recording: { maskAllInputs: true },
    loaded: (ph) => {
      if (readConsent() === 'granted') ph.opt_in_capturing()
    },
  })
}

export function grantConsent() {
  writeConsent('granted')
  if (!analyticsConfigured()) return
  initPostHog()
  try {
    posthog.opt_in_capturing() // turns on capture + persistence (sets the cookie now)
    posthog.capture('$pageview')
  } catch {}
}

export function denyConsent() {
  writeConsent('denied')
  try {
    posthog.opt_out_capturing()
  } catch {}
}
