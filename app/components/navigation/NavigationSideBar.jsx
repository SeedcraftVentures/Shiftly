'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import DesktopSidebar from './components/DesktopSidebar'
import MobileTopBar from './components/MobileTopBar'
import MobileMenu from './components/MobileMenu'

export default function NavigationSideBar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [mobileMenuOpen])

  return (
    <>
      <MobileTopBar open={mobileMenuOpen} onToggle={() => setMobileMenuOpen(v => !v)} />
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <DesktopSidebar />
    </>
  )
}