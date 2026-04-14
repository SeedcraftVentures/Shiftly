'use client'

import Link from 'next/link'
import Image from 'next/image'
import NotificationBell from '@/app/components/ui/NotificationBell'
import { CloseIcon, MenuIcon } from '@/app/lib/icons'

export default function MobileTopBar({ open, onToggle }) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 accent-bg-color flex items-center justify-between px-4 z-50">
      <div className="bg-white rounded-xl shadow-md px-4 py-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Shiftly" width={28} height={28} className="flex-shrink-0" />
          <span className="font-cal accent-text-colour font-bold text-lg leading-tight mt-0.5">
            Shiftly
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell variant="desktop" />
        <button
          onClick={onToggle}
          className="w-10 h-10 flex items-center justify-center text-white"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </div>
    </div>
  )
}