'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const NOTIFICATION_ICONS = {
  rota_published: '📅',
  request_approved: '✅',
  request_rejected: '❌',
  swap_available: '🔄',
  swap_picked_up: '🤝',
  cover_needed: '🆘',
  cover_picked_up: '🙌',
  announcement: '📢',
  escalation: '⚠️',
}

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ variant = 'desktop' }) {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=30')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user, fetchNotifications])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Close panel on outside click or Escape key
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  const markRead = async (id) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  const isTopbar = variant === 'topbar'
  const isEmployee = variant === 'employee'

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) fetchNotifications()
        }}
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
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {!isTopbar && (
            <div className="sm:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          )}

          <div className={`z-50 ${
            isTopbar
              ? 'absolute top-full right-0 mt-2 w-96'
              : isEmployee
              ? 'fixed inset-x-0 top-14 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-96 sm:mt-2'
              : 'fixed top-0 right-0 sm:absolute sm:top-full sm:right-0 sm:w-96 sm:mt-2'
          }`}>
            <div className={`bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden ${
              isTopbar
                ? 'rounded-2xl max-h-[70vh]'
                : 'h-screen sm:h-auto sm:max-h-[80vh] sm:rounded-2xl'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 font-cal">Notifications</h2>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-medium hover:underline text text-pink-500"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No notifications yet</p>
                    <p className="text-gray-400 text-xs mt-1">You'll see updates here when things happen</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => {
                          if (!notif.read) markRead(notif.id)
                        }}
                        className={`w-full text-left px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          !notif.read ? 'bg-pink-50/50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {NOTIFICATION_ICONS[notif.type] || '🔔'}
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
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}