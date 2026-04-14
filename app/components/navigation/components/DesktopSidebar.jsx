'use client'

import ShiftlyLogo from './ShiftlyLogo'
import LocationSwitcher from './LocationSwitcher'
import NavItemList from './NavItemList'

export default function DesktopSidebar() {
  return (
    <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-52 accent-bg-color flex-col z-50 rounded-r-[2rem]">
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-lg px-5 py-3 mb-4">
          <ShiftlyLogo size="lg" />
        </div>
      </div>

      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <LocationSwitcher />
        <NavItemList />
      </div>
    </nav>
  )
}