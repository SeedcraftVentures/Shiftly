'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'
import NotificationBell from '@/app/components/NotificationBell'
import {
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  HelpIcon,
  HomeIcon,
  InboxIcon,
  LockClosedIcon,
  MenuIcon,
  PayrollIcon,
  ReportsIcon,
  RulesIcon,
  SettingsIcon,
  StaffIcon
} from '@/app/utils/icons'

export default function NavigationSideBar() {
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
      icon: HomeIcon
    },
    { 
      id: 'nav-shifts',
      name: 'Shifts', 
      path: '/dashboard/shifts',
      icon: ClockIcon
    },
    { 
      id: 'nav-staff',
      name: 'Staff', 
      path: '/dashboard/staff',
      icon: StaffIcon
    },
    {
       id: 'nav-rules',
       name: 'Rules',
       path: '/dashboard/rules',
      icon: RulesIcon,
    },
    { 
      id: 'nav-generate',
      name: 'Rota Builder', 
      path: '/dashboard/generate',
      icon: CalendarIcon,
      dividerAfter: true
    },
    {
      id: 'nav-requests',
      name: 'Inbox', 
      path: '/dashboard/requests',
      icon: InboxIcon
    },
    { 
      id: 'nav-payroll',
      name: 'Payroll', 
      path: '/dashboard/payroll',
      locked: true,
      icon: PayrollIcon
    },
    { 
      id: 'nav-reports',
      name: 'Reports', 
      path: '/dashboard/reports',
      icon: ReportsIcon,
      dividerAfter: true
    },
    {
      id: 'nav-settings',
      name: 'Settings', 
      path: '/dashboard/settings',
      icon: SettingsIcon
    },
    { 
      id: 'nav-help',
      name: 'Help Centre', 
      path: '/dashboard/help',
      icon: HelpIcon
    },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  const renderNavIcon = (Icon) => <Icon className="w-5 h-5" />

  const NavItemsDiv = ({ mobile = false }) => 
    <div className="space-y-1">
      {navItems.map((item) => (
        <div key={item.path}>
          <Link
            id={`${item.id}${mobile ? '-mobile' : ''}`}
            href={item.path}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
              isActive(item.path)
                ? 'bg-white text-pink-600 shadow-lg'
                : 'text-white/90 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              {renderNavIcon(item.icon)}
              <span className={`font-medium${mobile ? '' : ' text-sm'}`}>{item.name}</span>
            </div>
            {item.locked && (
              <LockClosedIcon className={`w-4 h-4 ${isActive(item.path) ? 'text-pink-400' : 'text-white/50'}`} />
            )}
          </Link>
          {item.dividerAfter && (
            <div className="my-3 mx-4 border-t border-white/40" />
          )}
        </div>
      ))}
    </div>

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 accent-bg-color flex items-center justify-between px-4 z-50">
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
              <span className="accent-text-colour font-bold text-lg leading-tight mt-0.5" style={{ fontFamily: "'Cal Sans', sans-serif" }}>
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
              <CloseIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-6 h-6" />
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
      <div className={`lg:hidden fixed top-16 left-0 bottom-0 w-72 accent-bg-color z-50 transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex-1 px-3 py-4">
          {NavItemsDiv({ mobile: true })}
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
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-52 accent-bg-color flex-col z-50 rounded-r-[2rem]">
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
                className="accent-text-colour font-bold text-2xl mt-0.5"
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

          {NavItemsDiv({})}
        </div>
      </nav>
    </>
  )
}