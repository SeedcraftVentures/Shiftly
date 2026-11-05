'use client'

// Vercel Web Analytics, scoped to the PUBLIC marketing site. It is cookieless and
// collects only aggregate pageviews (path, referrer, UTM, country/device), so it needs
// no consent banner. We still keep it OFF the authenticated dashboard, both to honour the
// privacy policy ("analytics don't run inside your logged-in dashboard") and to spend the
// free event budget only where it's useful. Collection happens on Vercel deployments;
// locally it no-ops.
import { usePathname } from 'next/navigation'
import { Analytics } from '@vercel/analytics/react'
import { isExcludedPath } from './consent'

export default function MarketingAnalytics() {
  const pathname = usePathname()
  if (isExcludedPath(pathname)) return null
  return <Analytics />
}
