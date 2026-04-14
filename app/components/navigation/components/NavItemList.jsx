'use client'

import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '../config/navItems'
import NavItem from './NavItem'
import { useLocationContext } from '@/app/lib/contexts/LocationContext'

export default function NavItemList({ mobile = false }) {
  const pathname = usePathname()
  const { currentLocationId } = useLocationContext()

  const resolveHref = (item) => {
    if (!item.locationScoped) return item.path
    if (!currentLocationId) return '#'
    return `/dashboard/${currentLocationId}${item.path}`
  }

  const isActive = (item) => {
    const href = resolveHref(item)
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="space-y-1">
      {NAV_ITEMS.map(item => (
        <div key={item.id}>
          <NavItem item={{ ...item, path: resolveHref(item) }} isActive={isActive(item)} mobile={mobile} />
          {item.dividerAfter && <div className="my-3 mx-4 border-t border-white/40" />}
        </div>
      ))}
    </div>
  )
}