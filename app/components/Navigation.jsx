'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'
import NotificationBell from '@/app/components/NotificationBell'

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [businessName, setBusinessName] = useState(null)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // Fetch business name
  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const response = await fetch('/api/teams')
        if (response.ok) {
          const teams = await response.json()
          const defaultTeam = teams.find(t => t.is_default) || teams[0]
          if (defaultTeam?.business_name) {
            setBusinessName(defaultTeam.business_name)
          }
        }
      } catch (error) {
        console.error('Error fetching business name:', error)
      }
    }
    fetchBusinessName()
  }, [])

  const navItems = [
    { 
      id: 'nav-dashboard',
      name: 'Home', 
      path: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      id: 'nav-shifts',
      name: 'Shifts', 
      path: '/dashboard/shifts',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'nav-staff',
      name: 'Staff', 
      path: '/dashboard/staff',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
       id: 'nav-rules',
       name: 'Rules',
       path: '/dashboard/rules',
      icon: (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
    },
    { 
      id: 'nav-generate',
      name: 'Rota Builder', 
      path: '/dashboard/generate',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      dividerAfter: true
    },
    {
      id: 'nav-requests',
      name: 'Inbox', 
      path: '/dashboard/requests',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )
    },
    { 
      id: 'nav-payroll',
      name: 'Payroll', 
      path: '/dashboard/payroll',
      locked: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'nav-reports',
      name: 'Reports', 
      path: '/dashboard/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      dividerAfter: true
    },
    {
      id: 'nav-settings',
      name: 'Settings', 
      path: '/dashboard/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'nav-help',
      name: 'Help Centre', 
      path: '/dashboard/help',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  const NavLogo = ({ mobile = false }) => (
    <Link href="/dashboard" className="flex items-center space-x-2">
      <Image 
        src="/logo-white.svg" 
        alt="Shiftly" 
        width={mobile ? 32 : 36} 
        height={mobile ? 32 : 36}
        className="flex-shrink-0"
      />
      <span 
        className={`text-white font-semibold ${mobile ? 'text-xl' : 'text-2xl'}`}
        style={{ fontFamily: "'Cal Sans', sans-serif" }}
      >
        Shiftly
      </span>
    </Link>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#FF1F7D] flex items-center justify-between px-4 z-50">
        <div className="bg-white rounded-xl shadow-md px-4 py-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image 
              src="/logo.svg" 
              alt="Shiftly" 
              width={28} 
              height={28}
              className="flex-shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-[#FF1F7D] font-bold text-lg leading-tight mt-0.5" style={{ fontFamily: "'Cal Sans', sans-serif" }}>
                Shiftly
              </span>
              {businessName && (
                <span className="text-gray-600 text-xs -mt-0.5">{businessName}</span>
              )}
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-1">
          <NotificationBell variant="desktop" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 flex items-center justify-center text-white"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-out menu */}
      <div className={`lg:hidden fixed top-16 left-0 bottom-0 w-72 bg-[#FF1F7D] z-50 transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <div key={item.path}>
                <Link
                  id={`${item.id}-mobile`}
                  href={item.path}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${
                    isActive(item.path)
                      ? 'bg-white text-pink-600 shadow-lg'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.locked && (
                    <svg className={`w-4 h-4 ${isActive(item.path) ? 'text-pink-400' : 'text-white/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </Link>
                {item.dividerAfter && (
                  <div className="my-3 mx-4 border-t border-white/40" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
          <div className="flex items-center space-x-3 px-2">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">Account</p>
              <p className="text-white/60 text-xs truncate">Manage profile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-52 bg-[#FF1F7D] flex-col z-50 rounded-r-[2rem]">
        <div className="p-6">
          <div className="bg-white rounded-2xl shadow-lg px-5 py-3 mb-4">
            <Link href="/dashboard" className="flex items-center gap-2 justify-center">
              <Image 
                src="/logo.svg" 
                alt="Shiftly" 
                width={40} 
                height={40}
                className="flex-shrink-0"
              />
              <span 
                className="text-[#FF1F7D] font-bold text-2xl mt-0.5"
                style={{ fontFamily: "'Cal Sans', sans-serif" }}
              >
                Shiftly
              </span>
            </Link>
          </div>
        </div>

        <div className="flex-1 px-3 py-4">
          {/* Business Name Card */}
          {businessName && (
            <div className="mb-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-0.5">Workspace</p>
              <p className="text-white font-medium text-sm truncate">{businessName}</p>
            </div>
          )}

          <div className="space-y-1">
            {navItems.map((item) => (
              <div key={item.path}>
                <Link
                  id={item.id}
                  href={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? 'bg-white text-pink-600 shadow-lg'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  {item.locked && (
                    <svg className={`w-4 h-4 ${isActive(item.path) ? 'text-pink-400' : 'text-white/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </Link>
                {item.dividerAfter && (
                  <div className="my-3 mx-4 border-t border-white/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}