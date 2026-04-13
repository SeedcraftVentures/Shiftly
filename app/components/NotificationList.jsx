'use client'

import { NOTIFICATION_ICONS, DEFAULT_NOTIFICATION_ICON } from '@/app/lib/constants'
import { timeAgo } from '@/app/lib/utils/timeUtils'

function BellIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

export default function NotificationList({ notifications, loading, onMarkRead }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <BellIcon className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">No notifications yet</p>
        <p className="text-gray-400 text-xs mt-1">You&apos;ll see updates here when things happen</p>
      </div>
    )
  }

  return (
    <div>
      {notifications.map((notif) => (
        <button
          key={notif.id}
          onClick={() => { if (!notif.read) onMarkRead(notif.id) }}
          className={`w-full text-left px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
            !notif.read ? 'bg-pink-50/50' : ''
          }`}
        >
          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0 mt-0.5">
              {NOTIFICATION_ICONS[notif.type] || DEFAULT_NOTIFICATION_ICON}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {notif.title}
                </p>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-pink-500" />
                )}
              </div>
              {notif.message && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}