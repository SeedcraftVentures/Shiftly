'use client'

import FloatingNav from '@/app/components/FloatingNav'

/**
 * Nav, thin wrapper kept for backwards compatibility with existing importers
 * (`app/page.jsx`, `app/features/page.jsx`). The marketing nav is now the
 * Seedcraft calling-card floating two-part nav; see FloatingNav.
 */
export default function Nav({ currentPage = null }) {
  return <FloatingNav currentPage={currentPage} />
}
