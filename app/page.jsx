'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ShiftlyLogo from '@/app/components/ShiftlyLogo'
import Footer from '@/app/components/Footer'



// ── Scroll fade-in hook ──
function useScrollReveal() {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

function RevealSection({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useScrollReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`
      }}
    >
      {children}
    </div>
  )
}

// ── Feature dropdown data ──
const featureGroups = [
  {
    title: 'Scheduling',
    items: [
      { name: 'Rota Generation', desc: 'Mathematically fair rotas in seconds', href: '#features' },
      { name: 'Manual Editing', desc: 'Click any cell to add, edit, or reassign shifts', href: '#features' },
      { name: 'Fairness Rules', desc: 'No clopening, even weekends, max consecutive days', href: '#rules' },
    ]
  },
  {
    title: 'Staff Management',
    items: [
      { name: 'Team Workspace', desc: 'Staff profiles, hours, and availability in one place', href: '#workspace' },
      { name: 'Availability Windows', desc: 'Exact time ranges per day, not just AM/PM', href: '#workspace' },
      { name: 'Employee App', desc: 'Staff view schedules and submit requests', href: '#employee-app' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Reports & Payroll', desc: 'Hours, costs, and overtime at a glance', href: '#reports' },
      { name: 'Team Inbox', desc: 'Requests, announcements, and alerts in one place', href: '#inbox' },
      { name: 'CSV & PDF Export', desc: 'Send to your accountant in one click', href: '#reports' },
    ]
  }
]

export default function LandingPage() {
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const featuresRef = useRef(null)

  // Close features dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (featuresRef.current && !featuresRef.current.contains(e.target)) {
        setFeaturesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setFeaturesOpen(false)
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white" style={{ scrollBehavior: 'smooth' }}>

      {/* ═══════════════════════ NAVIGATION ═══════════════════════ */}
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <ShiftlyLogo variant="default" size="md" showPillbox={false} />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {/* Features dropdown */}
              <div ref={featuresRef} className="relative">
                <button
                  onClick={() => setFeaturesOpen(!featuresOpen)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm flex items-center gap-1.5"
                >
                  Features
                  <svg className={`w-3.5 h-3.5 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Mega menu */}
                {featuresOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[680px] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 grid grid-cols-3 gap-6">
                    {featureGroups.map((group) => (
                      <div key={group.title}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.title}</p>
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => scrollTo(item.href.replace('#', ''))}
                              className="block text-left w-full group"
                            >
                              <p className="text-sm font-medium text-gray-900 group-hover:text-pink-600 transition-colors">{item.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => scrollTo('pricing')} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
                Pricing
              </button>
              <button onClick={() => scrollTo('how-it-works')} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
                How It Works
              </button>

              <div className="w-px h-6 bg-gray-200 mx-2" />

              <Link
                href="/waitlist"
                className="px-5 py-2.5 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/20 transition-all text-sm ml-1"
                style={{ background: '#FF1F7D' }}
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
              <button onClick={() => scrollTo('features')} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Features</button>
              <button onClick={() => scrollTo('pricing')} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Pricing</button>
              <button onClick={() => scrollTo('how-it-works')} className="block w-full text-left px-4 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">How It Works</button>
              <Link href="/waitlist" className="block w-full text-left px-4 py-2.5 font-medium rounded-lg text-white" style={{ background: '#FF1F7D' }}>Join Waitlist</Link>
            </div>
          )}
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative px-6 lg:px-8 pt-16 lg:pt-24 pb-0 overflow-hidden">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50/60 via-white to-white" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Launch badge */}
          <RevealSection>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-pink-50 border border-pink-200 rounded-full">
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-pink-700">Launching Summer 2026 · Waitlist Live</span>
            </div>
          </RevealSection>

          <RevealSection delay={0.05}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-6 leading-[1.08] font-cal tracking-tight">
              Your week's rota.
              <br />
              <span style={{ color: '#FF1F7D' }}>Done in seconds.</span>
            </h1>
          </RevealSection>

          <RevealSection delay={0.1}>
            <p className="text-lg lg:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Set your staff, shifts, and rules once. Shiftly generates mathematically fair schedules
              that respect every contracted hour, every availability window, every time.
            </p>
          </RevealSection>

          <RevealSection delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
              <Link
                href="/waitlist"
                className="px-8 py-4 text-white text-base font-semibold rounded-xl hover:shadow-xl hover:shadow-pink-500/20 transition-all"
                style={{ background: '#FF1F7D' }}
              >
                Join the Waitlist
              </Link>
              <button
                onClick={() => scrollTo('how-it-works')}
                className="px-8 py-4 text-gray-700 text-base font-semibold rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                See How It Works
              </button>
            </div>
          </RevealSection>
        </div>

        {/* Hero screenshot - the money shot */}
        <RevealSection delay={0.2} className="max-w-6xl mx-auto relative z-10">
          <div className="rounded-t-2xl shadow-2xl overflow-hidden border border-gray-200 border-b-0 bg-gray-100">
            {/* Browser chrome */}
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-white rounded-md px-4 py-1.5 text-xs text-gray-400 text-center border border-gray-200">
                  app.shiftly.so/dashboard/rota
                </div>
              </div>
            </div>
            <Image
              src="/screenshots/rota.png"
              alt="Shiftly rota builder showing a generated weekly schedule"
              width={1400}
              height={800}
              className="w-full h-auto"
              priority
            />
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════════ METRICS BAR ═══════════════════════ */}
      <section className="px-6 lg:px-8 py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '5 sec', label: 'Average rota generation time' },
              { value: '3-5 hrs', label: 'Saved per manager, per week' },
              { value: '100%', label: 'Contracted hours compliance' },
              { value: 'Zero', label: '"That\'s not fair" complaints' },
            ].map((stat, i) => (
              <RevealSection key={i} delay={i * 0.08}>
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 font-cal">{stat.value}</div>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PROBLEM SECTION ═══════════════════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider text-pink-600 mb-3">The problem</p>
              <h2 className="text-3xl lg:text-5xl text-gray-900 font-cal tracking-tight">
                Manual scheduling costs more than time
              </h2>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: 'Endless complaints',
                desc: '"Why do I always close?" "How come they never work weekends?" Perceived unfairness is the number one cause of staff friction.'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Hours wasted weekly',
                desc: 'Juggling availability, preferences, contracted hours, and shift coverage in a spreadsheet. Every. Single. Week.'
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ),
                title: 'Costly mistakes',
                desc: 'Under contracted hours? Legal issue. Close then open? Staff burnout. Double-booked? Customer service chaos.'
              }
            ].map((card, i) => (
              <RevealSection key={i} delay={i * 0.1}>
                <div className="bg-gray-50 rounded-2xl p-8 border border-pink-200 shadow-md shadow-pink-100/50 h-full hover:shadow-lg hover:shadow-pink-200/60 hover:-translate-y-1 transition-all duration-200">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-5 text-gray-700 border border-gray-200">
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-cal">{card.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FEATURES: ROTA BUILDER ═══════════════════════ */}
      <section id="features" className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider text-pink-600 mb-3">Features</p>
              <h2 className="text-3xl lg:text-5xl text-gray-900 font-cal tracking-tight">
                Everything you need to schedule smarter
              </h2>
            </div>
          </RevealSection>

          {/* Feature 1: Rota Generation */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-28">
            <RevealSection>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 border border-pink-100 rounded-full text-xs font-semibold text-pink-600 mb-5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Constraint Satisfaction
                </div>
                <h3 className="text-2xl lg:text-4xl text-gray-900 mb-4 font-cal tracking-tight">
                  Mathematically fair rotas, generated in seconds
                </h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Shiftly uses constraint satisfaction (the same maths behind airline crew scheduling)
                  to guarantee every staff member gets their contracted hours, nobody gets unfair weekend loading,
                  and no scheduling rule is ever broken.
                </p>
                <div className="space-y-3">
                  {['Contracted hours guaranteed to the minute', 'Click any cell to manually edit afterwards', 'Multi-week generation with staff rotation'].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
            <RevealSection delay={0.15}>
              <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <Image src="/screenshots/rota-grid.png" alt="Generated rota schedule" width={800} height={500} className="w-full h-auto" />
              </div>
            </RevealSection>
          </div>

          {/* Feature 2: Staff & Workspace */}
          <div id="workspace" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-28">
            <RevealSection delay={0.15} className="order-2 lg:order-1">
              <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <Image src="/screenshots/workspace.png" alt="Staff workspace" width={800} height={500} className="w-full h-auto" />
              </div>
            </RevealSection>
            <RevealSection className="order-1 lg:order-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 border border-pink-100 rounded-full text-xs font-semibold text-pink-600 mb-5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Team Management
                </div>
                <h3 className="text-2xl lg:text-4xl text-gray-900 mb-4 font-cal tracking-tight">
                  Your whole team, at a glance
                </h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Every staff member's contracted hours, max hours, role, and availability in one clean view.
                  Real-time hours comparison shows whether your team can cover your shifts before you generate.
                </p>
                <div className="space-y-3">
                  {['Exact availability time windows per day', 'Hours comparison: staff capacity vs shift demand', 'Invite staff to their own employee app'].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>

          {/* Feature 3: Reports */}
          <div id="reports" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-28">
            <RevealSection>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 border border-pink-100 rounded-full text-xs font-semibold text-pink-600 mb-5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Reports & Payroll
                </div>
                <h3 className="text-2xl lg:text-4xl text-gray-900 mb-4 font-cal tracking-tight">
                  Know your costs before the week starts
                </h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Total hours, regular vs overtime, and labour costs per week. Download CSV for your accountant
                  or PDF for your records. Payroll data locked behind a separate password for security.
                </p>
                <div className="space-y-3">
                  {['Weekly labour cost breakdown', 'CSV and PDF export for accountants', 'Password-protected payroll section'].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
            <RevealSection delay={0.15}>
              <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <Image src="/screenshots/reports.png" alt="Reports and payroll view" width={800} height={500} className="w-full h-auto" />
              </div>
            </RevealSection>
          </div>

          {/* Feature 4: Employee App + Inbox side by side */}
          <div id="employee-app" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <RevealSection delay={0.15} className="order-2 lg:order-1">
              <div className="flex justify-center">
                {/* Phone mockup with employee app screenshot */}
                <div className="w-[260px]">
                  <div className="bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl">
                    <div className="bg-white rounded-[2rem] overflow-hidden">
                      <Image src="/screenshots/employee.png" alt="Employee app showing upcoming shifts" width={390} height={844} className="w-full h-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>
            <RevealSection className="order-1 lg:order-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 border border-pink-100 rounded-full text-xs font-semibold text-pink-600 mb-5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  Employee App
                </div>
                <h3 className="text-2xl lg:text-4xl text-gray-900 mb-4 font-cal tracking-tight">
                  Your staff's rota, right in their pocket
                </h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Staff install Shiftly on their phone to view upcoming shifts, submit availability,
                  and request time off. No app store download needed. Works on any phone as a web app.
                </p>
                <div className="space-y-3">
                  {['View shifts and upcoming schedule', 'Submit availability and time-off requests', 'Receive announcements and alerts', 'Works on any phone (PWA, no download)'].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section id="how-it-works" className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider text-pink-600 mb-3">How it works</p>
              <h2 className="text-3xl lg:text-5xl text-gray-900 font-cal tracking-tight">
                Set up once. Generate forever.
              </h2>
              <p className="text-gray-500 mt-4 text-lg">Three steps to fair, balanced rotas every week</p>
            </div>
          </RevealSection>

          <div className="space-y-12">
            {[
              {
                step: '01',
                title: 'Add your team and shifts',
                desc: 'Enter staff members with their contracted hours, availability windows, and roles. Define your shift patterns with start and end times.'
              },
              {
                step: '02',
                title: 'Set your fairness rules',
                desc: 'No clopening shifts, even weekend distribution, maximum consecutive days, minimum rest between shifts. You decide what fair means.'
              },
              {
                step: '03',
                title: 'Generate, review, share',
                desc: 'Hit generate. Review the rota, make any manual tweaks, then approve. Staff see their schedule instantly in their app.'
              }
            ].map((item, i) => (
              <RevealSection key={i} delay={i * 0.1}>
                <div className="flex gap-6 items-start">
                  <div className="text-5xl font-bold text-pink-200 font-cal flex-shrink-0 w-20 text-right">{item.step}</div>
                  <div className="pt-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 font-cal">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ RULES SECTION ═══════════════════════ */}
      <section id="rules" className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider text-pink-600 mb-3">Fairness engine</p>
              <h2 className="text-3xl lg:text-5xl text-gray-900 font-cal tracking-tight">
                Rules your staff will thank you for
              </h2>
              <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto">
                Every rule is mathematically enforced. Not "best effort". Guaranteed.
              </p>
            </div>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'No clopening shifts', desc: 'Minimum hours between close and open' },
              { title: 'Even weekend distribution', desc: 'Nobody gets stuck with every Saturday' },
              { title: 'Contracted hours compliance', desc: 'Every hour guaranteed, every week' },
              { title: 'Max consecutive days', desc: 'Prevent burnout with forced rest days' },
              { title: 'Availability windows', desc: 'Exact times, not just AM/PM' },
              { title: 'Staff rotation', desc: 'Vary shift assignments across weeks' },
            ].map((rule, i) => (
              <RevealSection key={i} delay={i * 0.06}>
                <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-pink-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{rule.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{rule.desc}</p>
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <section id="pricing" className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-wider text-pink-600 mb-3">Pricing</p>
              <h2 className="text-3xl lg:text-5xl text-gray-900 font-cal tracking-tight">
                One price. Every feature. Forever.
              </h2>
              <p className="text-gray-500 mt-4 text-lg">No per-seat charges. No gated features. No surprises.</p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Lifetime Deal Card */}
            <RevealSection delay={0.05}>
              <div className="relative bg-gray-900 rounded-2xl p-8 text-white overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500 rounded-full text-xs font-bold mb-6">
                    🔥 LAUNCH SPECIAL · 200 SPOTS
                  </div>
                  <div className="mb-6">
                    <div className="text-5xl font-bold font-cal">$249</div>
                    <p className="text-gray-400 mt-1">One-time payment. Lifetime access.</p>
                  </div>
                  <div className="space-y-3 mb-8">
                    {['Every feature, forever', 'All future updates included', 'Unlimited staff and teams', 'Priority support', 'Lock in before prices rise'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-pink-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/waitlist"
                    className="block w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all hover:shadow-lg hover:shadow-pink-500/30"
                    style={{ background: '#FF1F7D' }}
                  >
                    Join Waitlist for LTD Access
                  </Link>
                </div>
              </div>
            </RevealSection>

            {/* Standard pricing */}
            <RevealSection delay={0.15}>
              <div className="bg-gray-50 rounded-2xl p-8 border border-pink-200 shadow-md shadow-pink-100/40 h-full flex flex-col">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Standard</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-900 font-cal">$49</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-400 mt-1">or $499/year (save 15%)</p>
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {['Every feature included', 'Unlimited staff and teams', 'Employee app included', '7-day free trial', 'Cancel anytime'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/waitlist"
                  className="block w-full py-3.5 rounded-xl font-semibold text-gray-700 text-center border border-gray-300 hover:bg-white hover:border-gray-400 transition-all"
                >
                  Join Waitlist
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl text-gray-900 font-cal tracking-tight">
                Common questions
              </h2>
            </div>
          </RevealSection>

          <div className="space-y-3">
            {[
              {
                q: 'How does Shiftly generate fair rotas?',
                a: 'We use constraint satisfaction solving, the same mathematical approach used for airline crew scheduling. It guarantees every rule is met, not "best effort" but mathematically proven. Contracted hours are met exactly, weekends distributed evenly, and no scheduling rules are ever broken.'
              },
              {
                q: 'What industries is Shiftly built for?',
                a: 'Retail and hospitality: pubs, restaurants, cafes, shops, and any business with shift workers. If you have 8+ staff and create weekly rotas, Shiftly will save you hours every week.'
              },
              {
                q: 'Can I still manually edit the rota after generation?',
                a: 'Absolutely. Click any cell to add, edit, reassign, or delete shifts. The generated rota is a starting point. You have full control to tweak anything before sharing with your team.'
              },
              {
                q: 'Do my staff need to create accounts?',
                a: 'You invite them via email. They create a simple account and can then view their shifts, submit availability, and make requests from their phone. No app store download needed, it works as a web app.'
              },
              {
                q: 'What happens after the Lifetime Deal spots sell out?',
                a: 'Standard pricing is $49/month or $499/year. The LTD at $249 is a one-time payment that locks in every feature forever, including all future updates. Once the 200 spots are gone, they are gone.'
              },
              {
                q: 'Can I use Shiftly for multiple teams or locations?',
                a: 'Yes. Create as many teams as you need within your workspace. Each team has its own staff, shifts, and rules. Reports roll up across all teams.'
              }
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <Footer />
    </div>
  )
}

// ── FAQ Accordion Item ──
function FaqItem({ question, answer, delay = 0 }) {
  const [open, setOpen] = useState(false)
  const [ref, isVisible] = useScrollReveal()

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-left"
      >
        <span className="font-medium text-gray-900 text-sm pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 py-4 text-sm text-gray-500 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}