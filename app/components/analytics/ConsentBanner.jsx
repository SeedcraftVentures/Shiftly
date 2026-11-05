'use client'

// Lightweight cookie-consent banner for the PUBLIC marketing site. Appears only when
// PostHog is configured, no choice has been stored yet, and we are not on an excluded
// (authenticated) surface. Nothing is measured until the visitor clicks Accept.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { analyticsConfigured, isExcludedPath, readConsent, grantConsent, denyConsent } from './consent'

const PINK = '#FF1F7D'

export default function ConsentBanner() {
  const pathname = usePathname()
  // Start "decided" so the server render and first client render show nothing (no flash);
  // the effect reveals the banner only when a choice is genuinely outstanding.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!analyticsConfigured()) return
    if (isExcludedPath(pathname)) {
      setOpen(false)
      return
    }
    setOpen(readConsent() === null)
  }, [pathname])

  if (!open) return null

  const accept = () => {
    grantConsent()
    setOpen(false)
  }
  const decline = () => {
    denyConsent()
    setOpen(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-5 flex justify-center pointer-events-none">
      <div
        role="dialog"
        aria-label="Cookie choices"
        className="pointer-events-auto w-full max-w-xl bg-white rounded-xl border border-gray-200 p-5 sm:flex sm:items-center sm:gap-5"
        style={{ boxShadow: '0 10px 40px -12px rgba(0,0,0,0.22)' }}
      >
        <div className="flex-1">
          <p className="font-cal text-gray-900 text-base mb-1">A quick note on cookies</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            We use PostHog to understand how people use Shiftly so we can make it better. It only
            sets analytics cookies if you accept, and it never runs inside your logged in dashboard.
            See our{' '}
            <Link href="/privacy" className="font-medium underline" style={{ color: PINK }}>
              privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
          <button
            type="button"
            onClick={decline}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{ background: PINK, boxShadow: '0 6px 16px -6px rgba(255,31,125,0.5)' }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
