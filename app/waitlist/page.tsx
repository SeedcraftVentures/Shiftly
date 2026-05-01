'use client'

import { Waitlist } from '@clerk/nextjs'
import Link from 'next/link'
import ShiftlyLogo from '@/app/components/ShiftlyLogo'

export default function WaitlistPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-white">
      {/* Soft pink wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-50/50 via-white to-white pointer-events-none" />

      {/* Header */}
      <header className="px-6 lg:px-8 py-6 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <ShiftlyLogo variant="default" size="md" showPillbox={false} />
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Pre-form copy */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FF1F7D' }} />
              <span className="text-xs font-semibold text-pink-700">200 LTD spots · Launching soon</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-cal text-gray-900 tracking-tight mb-3">
              Join the waitlist
            </h1>
            <p className="text-gray-500 leading-relaxed">
              Be first in line when Lifetime Deal pricing opens. We'll email you the moment your spot is ready.
            </p>
          </div>

          {/* Clerk Waitlist component */}
          <Waitlist
            appearance={{
              variables: {
                colorPrimary: '#FF1F7D',
                colorText: '#111827',
                colorTextSecondary: '#6B7280',
                colorBackground: '#FFFFFF',
                colorInputBackground: '#FFFFFF',
                colorInputText: '#111827',
                borderRadius: '0.75rem',
                fontFamily: 'inherit',
              },
              elements: {
                rootBox: 'w-full',
                card: 'shadow-xl border border-gray-200 rounded-2xl',
                headerTitle: 'font-cal',
                headerSubtitle: 'text-gray-500',
                formButtonPrimary:
                  'bg-pink-600 hover:bg-pink-700 normal-case text-sm font-semibold tracking-normal',
                formFieldInput:
                  'border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent',
                footerAction__signIn: 'text-pink-600 hover:text-pink-700',
                footerActionLink: 'text-pink-600 hover:text-pink-700',
              },
            }}
          />

          <p className="text-center text-xs text-gray-400 mt-6">
            No spam, ever. We only email when your invite is ready.
          </p>
        </div>
      </main>
    </div>
  )
}