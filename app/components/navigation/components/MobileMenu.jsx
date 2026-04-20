'use client'

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import LocationSwitcher from './LocationSwitcher'
import NavItemList from './NavItemList'
import { TeamIcon } from '@/app/lib/icons'

export default function MobileMenu({ open, onClose, isStaff }) {
  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      <div
        className={`lg:hidden fixed top-16 left-0 bottom-0 w-72 accent-bg-color z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <LocationSwitcher />
          <NavItemList mobile />
        </div>

        <div className="p-4 border-t border-white/20 space-y-3">
          <OrganizationSwitcher
            hidePersonal={true}
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
                organizationSwitcherTrigger:
                  'w-full px-3 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors',
              },
            }}
          />

          <div className="flex items-center space-x-3 px-2">
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'w-9 h-9' } }}
            >
              {isStaff && (
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Switch to staff view"
                    labelIcon={<TeamIcon />}
                    href="/my"
                  />
                </UserButton.MenuItems>
              )}
            </UserButton>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">Account</p>
              <p className="text-white/60 text-xs truncate">Manage profile</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}