'use client'

import Link from 'next/link'
import RevealSection from '@/app/components/RevealSection'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'

export default function FinalCTA({ subhead = 'Give your team a rota they can count on, and give yourself your Sunday back.' }) {
  return (
    <HeatGlow as="section" palette={SHIFTLY_PALETTE} className="px-6 lg:px-8 py-24 lg:py-32 text-center">
      <div className="max-w-3xl mx-auto">
        <RevealSection>
          <h2 className="font-cal text-5xl lg:text-7xl text-white leading-[0.95] mb-8">
            Make every shift a good one.
          </h2>
          <p className="text-xl text-white/85 mb-10 max-w-xl mx-auto leading-relaxed">
            {subhead}
          </p>
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-pink-600 text-lg font-semibold rounded-xl shadow-lg hover:bg-pink-50 hover:-translate-y-0.5 transition-all"
          >
            Join the Waitlist
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </RevealSection>
      </div>
    </HeatGlow>
  )
}
