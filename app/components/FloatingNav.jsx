'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ShiftlyLogo from '@/app/components/ShiftlyLogo'

const featureGroups = [
  {
    title: 'Scheduling',
    items: [
      { name: 'Rota Generation', desc: 'Mathematically fair rotas in seconds', anchor: 'rota-generation' },
      { name: 'Manual Editing', desc: 'Tweak any shift in one click', anchor: 'manual-editing' },
      { name: 'Fairness Rules', desc: 'No clopenings, even weekends, max days', anchor: 'fairness-rules' },
    ]
  },
  {
    title: 'Staff Management',
    items: [
      { name: 'Team Workspace', desc: 'Profiles, hours, availability in one view', anchor: 'workspace' },
      { name: 'Availability Windows', desc: 'Exact times per day, not just AM/PM', anchor: 'availability' },
      { name: 'Employee App', desc: 'Staff see their rota on their phone', anchor: 'employee-app' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Reports & Payroll', desc: 'Hours, costs, and overtime at a glance', anchor: 'reports' },
      { name: 'Team Inbox', desc: 'Requests, announcements, alerts', anchor: 'inbox' },
      { name: 'CSV & PDF Export', desc: 'Send to your accountant in one click', anchor: 'exports' },
    ]
  }
]

// Shared glass treatment for the floating pills.
const GLASS = 'bg-white/70 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'

/**
 * FloatingNav — Seedcraft calling-card floating two-part nav.
 * Glass logo pill (left) + glass nav pill (middle) + solid pink CTA (right),
 * fixed and centred over the page content. Preserves the prior Nav behaviour:
 * features mega-menu, click-outside close, mobile overlay menu, and the
 * `currentPage` prop driving active state + pricing anchor target.
 */
export default function FloatingNav({ currentPage = null }) {
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const featuresRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (featuresRef.current && !featuresRef.current.contains(e.target)) {
        setFeaturesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const closeMenus = () => {
    setFeaturesOpen(false)
    setMobileMenuOpen(false)
  }

  const featuresActive = currentPage === 'features'
  const pricingHref = currentPage === 'home' ? '#pricing' : '/#pricing'

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-5xl">
      <div className="flex items-center justify-between gap-2">

        {/* ── Logo pill ── */}
        <Link
          href="/"
          onClick={closeMenus}
          aria-label="Shiftly home"
          className={`${GLASS} flex items-center rounded-full pl-3 pr-4 py-2 transition-shadow hover:shadow-[0_10px_36px_rgba(0,0,0,0.12)]`}
        >
          <ShiftlyLogo variant="default" size="sm" showPillbox={false} />
        </Link>

        {/* ── Nav pill (desktop) ── */}
        <div className={`hidden md:flex items-center gap-1 rounded-full px-2 py-1.5 ${GLASS}`}>
          <div ref={featuresRef} className="relative">
            <button
              onClick={() => setFeaturesOpen(!featuresOpen)}
              aria-expanded={featuresOpen}
              aria-haspopup="true"
              className={`px-4 py-2 font-medium transition-colors text-sm flex items-center gap-1.5 rounded-full ${
                featuresActive ? 'text-pink-600 font-semibold' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Features
              <svg className={`w-3.5 h-3.5 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {featuresOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[680px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 grid grid-cols-3 gap-6">
                {featureGroups.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.title}</p>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <Link
                          key={item.name}
                          href={`/features#${item.anchor}`}
                          onClick={closeMenus}
                          className="block group"
                        >
                          <p className="text-sm font-medium text-gray-900 group-hover:text-pink-600 transition-colors">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentPage === 'home' ? (
            <a href={pricingHref} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors text-sm rounded-full">
              Pricing
            </a>
          ) : (
            <Link href={pricingHref} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors text-sm rounded-full">
              Pricing
            </Link>
          )}

          <Link href="/about" className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors text-sm rounded-full">
            About
          </Link>
        </div>

        {/* ── Right cluster: mobile hamburger + CTA ── */}
        <div className="flex items-center gap-2">
          {/* Mobile menu button (glass circle) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            className={`md:hidden w-11 h-11 rounded-full flex items-center justify-center text-gray-700 ${GLASS}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>

          {/* CTA — same glass pill as the others, set apart with a pink outline
              so it reads as the action without going dark/heavy. Works on both
              the pink hero and the light sections you scroll past. */}
          <Link
            href="/waitlist"
            onClick={closeMenus}
            className="px-4 sm:px-5 py-2.5 rounded-full font-semibold transition-all text-sm whitespace-nowrap bg-white/70 backdrop-blur-md border-2 border-pink-500 text-pink-600 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:bg-white/90 hover:border-pink-600 hover:-translate-y-0.5"
          >
            Join Waitlist
          </Link>
        </div>
      </div>

      {/* ── Mobile overlay menu ── */}
      {mobileMenuOpen && (
        <div className={`md:hidden mt-2 rounded-2xl p-3 space-y-1 ${GLASS}`}>
          <Link href="/features" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-white/60">Features</Link>
          {currentPage === 'home' ? (
            <a href="#pricing" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-white/60">Pricing</a>
          ) : (
            <a href="/#pricing" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-white/60">Pricing</a>
          )}
          <Link href="/about" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-white/60">About</Link>
          <Link href="/waitlist" onClick={closeMenus} className="block w-full px-4 py-2.5 font-semibold rounded-xl text-center bg-white/70 border-2 border-pink-500 text-pink-600">Join Waitlist</Link>
        </div>
      )}
    </nav>
  )
}
