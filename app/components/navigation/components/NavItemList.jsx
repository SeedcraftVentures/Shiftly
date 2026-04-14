'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '../config/navItems'
import NavItem from './NavItem'

export default function NavItemList({ mobile = false }) {
  const pathname = usePathname()

  const isActive = (path) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <div className="space-y-1">
      {NAV_ITEMS.map(item => (
        <div key={item.path}>
          <NavItem item={item} isActive={isActive(item.path)} mobile={mobile} />
          {item.dividerAfter && <div className="my-3 mx-4 border-t border-white/40" />}
        </div>
      ))}
    </div>
  )
}