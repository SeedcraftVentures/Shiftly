'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import DesktopSidebar from './components/DesktopSidebar'
import MobileTopBar from './components/MobileTopBar'
import MobileMenu from './components/MobileMenu'

export default function NavigationSideBar({ isStaff }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [mobileMenuOpen])

  return (
    <>
      <MobileTopBar open={mobileMenuOpen} onToggle={() => setMobileMenuOpen(v => !v)} />
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} isStaff={isStaff} />
      <DesktopSidebar />
    </>
  )
}