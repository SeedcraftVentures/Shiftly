'use client'

import { useState, useRef } from 'react'
import { useNotifications } from '@/app/lib/hooks/useNotifications'
import { useOutsideClick } from '@/app/lib/hooks/useOutsideClick'
import { useEscapeKey } from '@/app/lib/hooks/useEscapeKey'
import NotificationList from './NotificationList'

const PANEL_POSITION = {
  topbar: 'absolute top-full right-0 mt-2 w-96',
  employee: 'fixed inset-x-0 top-14 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-96 sm:mt-2',
  desktop: 'fixed top-0 right-0 sm:absolute sm:top-full sm:right-0 sm:w-96 sm:mt-2',
}

const PANEL_SHELL = {
  topbar: 'rounded-2xl max-h-[70vh]',
  employee: 'h-screen sm:h-auto sm:max-h-[80vh] sm:rounded-2xl',
  desktop: 'h-screen sm:h-auto sm:max-h-[80vh] sm:rounded-2xl',
}

export default function NotificationBell({ variant = 'desktop' }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const { notifications, unreadCount, loading, refresh, markRead, markAllRead } = useNotifications()

  const close = () => setOpen(false)
  useOutsideClick(panelRef, close, open)
  useEscapeKey(close, open)

  const toggle = () => {
    setOpen((prev) => {
      if (!prev) refresh()
      return !prev
    })
  }

  const isTopbar = variant === 'topbar'

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggle}
        className={`relative p-2 rounded-lg transition-colors ${
          isTopbar
            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-shiftly-pink text-white rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {!isTopbar && (
            <div className="sm:hidden fixed inset-0 bg-black/40 z-40" onClick={close} />
          )}

          <div className={`z-50 ${PANEL_POSITION[variant]}`}>
            <div className={`bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden ${PANEL_SHELL[variant]}`}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 font-cal">Notifications</h2>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs font-medium hover:underline text-shiftly-pink">
                      Mark all read
                    </button>
                  )}
                  <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <NotificationList notifications={notifications} loading={loading} onMarkRead={markRead} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}