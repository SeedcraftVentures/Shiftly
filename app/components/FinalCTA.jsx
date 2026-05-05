'use client'

import Link from 'next/link'
import RevealSection from '@/app/components/RevealSection'

export default function FinalCTA({ subhead = 'Stop solving the rota with a spreadsheet. Start running the place.' }) {
  return (
    <section className="px-6 lg:px-8 py-24 lg:py-32 bg-gray-900 text-white text-center relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255, 31, 125, 0.18) 0%, transparent 60%)' }}
      />
      <div className="max-w-3xl mx-auto relative z-10">
        <RevealSection>
          <h2 className="font-cal text-5xl lg:text-7xl leading-[0.95] mb-8">
            Make every shift a <span className="text-pink-500">good one.</span>
          </h2>
          <p className="text-xl text-white/65 mb-10 max-w-xl mx-auto leading-relaxed">
            {subhead}
          </p>
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-2 px-8 py-4 bg-pink-500 text-white text-lg font-semibold rounded-xl hover:shadow-xl hover:shadow-pink-500/30 transition-all"
          >
            Join the Waitlist
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </RevealSection>
      </div>
    </section>
  )
}
