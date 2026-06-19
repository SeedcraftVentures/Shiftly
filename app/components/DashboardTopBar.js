'use client'

import NotificationBell from '@/app/components/NotificationBell'

export default function DashboardTopBar() {
  // Account/profile now lives bottom-left in the nav (Notion pattern), so the top
  // bar carries just notifications.
  return (
    <div className="flex items-center justify-end px-6 py-4">
      <div className="flex items-center bg-pink-50 border border-pink-100 rounded-full px-1.5 py-1">
        <NotificationBell variant="topbar" />
      </div>
    </div>
  )
}