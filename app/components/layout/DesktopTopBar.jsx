'use client'

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import BusinessDetailsPage from '@/app/components/layout/BusinessDetailsPage'
import { ClipboardIcon } from '@/app/lib/icons'
import NotificationBell from '@/app/components/ui/NotificationBell'
import { TeamIcon } from '@/app/lib/icons'

export default function DashboardTopBar({ isStaff }) {
  return (
    <div className="flex items-center justify-end px-6 py-3 gap-3">
      <OrganizationSwitcher
        hidePersonal={true}
        afterSelectOrganizationUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: 'flex items-center',
            organizationSwitcherTrigger:
              'px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700',
          },
        }}
      >
        <OrganizationSwitcher.OrganizationProfilePage
          label="Business Details"
          url="business"
          labelIcon={<ClipboardIcon className="w-4 h-4" />}
        >
          <BusinessDetailsPage />
        </OrganizationSwitcher.OrganizationProfilePage>
      </OrganizationSwitcher>

      <div className="flex items-center gap-1.5 bg-shiftly-pink-light border border-shiftly-pink-light rounded-full pl-2 pr-1 py-1">
        <NotificationBell variant="topbar" />
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
            },
          }}
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
      </div>
    </div>
  )
}