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

export default function Nav({ currentPage = null }) {
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
    <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" onClick={closeMenus}>
            <ShiftlyLogo variant="default" size="md" showPillbox={false} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <div ref={featuresRef} className="relative">
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className={`px-4 py-2 font-medium transition-colors text-sm flex items-center gap-1.5 ${
                  featuresActive ? 'text-pink-600 font-semibold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Features
                <svg className={`w-3.5 h-3.5 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {featuresOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[680px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 grid grid-cols-3 gap-6">
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
              <a href={pricingHref} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
                Pricing
              </a>
            ) : (
              <Link href={pricingHref} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
                Pricing
              </Link>
            )}

            <Link href="/about" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
              About
            </Link>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            <Link
              href="/waitlist"
              className="px-5 py-2.5 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/20 transition-all text-sm ml-1 bg-pink-500"
            >
              Join Waitlist
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 space-y-2">
            <Link href="/features" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Features</Link>
            {currentPage === 'home' ? (
              <a href="#pricing" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Pricing</a>
            ) : (
              <Link href="/#pricing" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Pricing</Link>
            )}
            <Link href="/about" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">About</Link>
            <Link href="/waitlist" onClick={closeMenus} className="block w-full text-left px-4 py-2.5 font-medium rounded-lg text-white bg-pink-500">Join Waitlist</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
