'use client'

import Link from 'next/link'
import { LockClosedIcon } from '@/app/lib/icons'

export default function NavItem({ item, isActive, mobile = false }) {
  const Icon = item.icon
  return (
    <Link
      id={`${item.id}${mobile ? '-mobile' : ''}`}
      href={item.path}
      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        isActive
          ? 'bg-white text-shiftly-pink shadow-lg'
          : 'text-white/90 hover:bg-white/10 hover:text-white'
      }`}
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5" />
        <span className={`font-medium${mobile ? '' : ' text-sm'}`}>{item.name}</span>
      </div>
      {item.locked && (
        <LockClosedIcon className={`w-4 h-4 ${isActive ? 'text-shiftly-pink-light' : 'text-white/50'}`} />
      )}
    </Link>
  )
}