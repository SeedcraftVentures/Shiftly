'use client'

import { UserButton } from '@clerk/nextjs'
import NotificationBell from '@/app/components/NotificationBell'

export default function DashboardTopBar() {
  return (
    <div className="flex items-center justify-end px-6 py-3">
      <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-100 rounded-full pl-2 pr-1 py-1">
        <NotificationBell variant="topbar" />
        <UserButton 
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      </div>
    </div>
  )
}