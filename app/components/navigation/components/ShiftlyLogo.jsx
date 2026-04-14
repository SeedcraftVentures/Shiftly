'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function ShiftlyLogo({ size = 'lg' }) {
  const isLg = size === 'lg'

  return (
    <Link href="/dashboard" className="flex items-center gap-2 justify-center">
      <Image
        src="/logo.svg"
        alt="Shiftly"
        width={isLg ? 40 : 28}
        height={isLg ? 40 : 28}
        className="flex-shrink-0"
      />
      <span className={`font-cal accent-text-colour font-bold mt-0.5 ${isLg ? 'text-2xl' : 'text-lg leading-tight'}`}>
        Shiftly
      </span>
    </Link>
  )
}