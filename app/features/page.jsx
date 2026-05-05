'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Nav from '@/app/components/Nav'
import RevealSection from '@/app/components/RevealSection'
import FinalCTA from '@/app/components/FinalCTA'
import Footer from '@/app/components/Footer'

const tocGroups = [
  {
    title: 'Scheduling',
    items: [
      { id: 'rota-generation', label: 'Rota Generation' },
      { id: 'manual-editing', label: 'Manual Editing' },
      { id: 'fairness-rules', label: 'Fairness Rules' },
    ],
  },
  {
    title: 'Staff Management',
    items: [
      { id: 'workspace', label: 'Team Workspace' },
      { id: 'availability', label: 'Availability Windows' },
      { id: 'employee-app', label: 'Employee App' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'reports', label: 'Reports & Payroll' },
      { id: 'inbox', label: 'Team Inbox' },
      { id: 'exports', label: 'CSV & PDF Export' },
    ],
  },
]

const allSectionIds = tocGroups.flatMap((g) => g.items.map((i) => i.id))

const CheckIcon = () => (
  <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

function Bullet({ children }) {
  return (
    <div className="flex items-start gap-3">
      <CheckIcon />
      <span className="text-gray-700">{children}</span>
    </div>
  )
}

function Eyebrow({ icon, children }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 border border-pink-100 rounded-full text-xs font-semibold text-pink-600 mb-5">
      {icon}
      {children}
    </div>
  )
}

function GroupHeader({ kicker, headline }) {
  return (
    <RevealSection>
      <div className="mb-12 pb-6 border-b border-gray-200">
        <p className="text-sm font-semibold uppercase tracking-wider text-pink-600 mb-2">{kicker}</p>
        <h2 className="font-cal text-3xl lg:text-4xl text-gray-900 tracking-tight">{headline}</h2>
      </div>
    </RevealSection>
  )
}

function ScreenshotPanel({ src, alt }) {
  return (
    <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      <Image src={src} alt={alt} width={800} height={600} className="w-full h-auto" />
    </div>
  )
}

function ToggleRow({ label, on, dim = false }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
      <span className={`text-sm font-medium ${dim ? 'text-gray-400' : 'text-gray-900'}`}>{label}</span>
      <div className={`w-10 h-6 rounded-full relative ${on ? 'bg-pink-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full ${on ? 'right-1' : 'left-1'}`} />
      </div>
    </div>
  )
}

function FairnessRulesCard() {
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Active rules</p>
      <div className="space-y-3">
        <ToggleRow label="Minimum 11 hours rest" on />
        <ToggleRow label="Even weekends" on />
        <ToggleRow label="Max 5 consecutive days" on />
        <ToggleRow label="No solo openings" on={false} dim />
      </div>
    </div>
  )
}

function AvailabilityCard() {
  const days = [
    { day: 'Mon', value: '9:00 - 17:00', tone: 'normal' },
    { day: 'Tue', value: 'Unavailable', tone: 'mute' },
    { day: 'Wed', value: '14:00 - 23:00', tone: 'normal' },
    { day: 'Thu', value: '14:00 - 23:00', tone: 'normal' },
    { day: 'Fri', value: '17:00 - 02:00', tone: 'normal' },
    { day: 'Sat', value: 'All day', tone: 'highlight' },
    { day: 'Sun', value: 'Unavailable', tone: 'mute' },
  ]
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Sarah Hutchinson · Availability</p>
      <div className="space-y-2">
        {days.map((d) => {
          const wrapClass =
            d.tone === 'highlight'
              ? 'bg-pink-50 rounded-lg border border-pink-200'
              : 'bg-white rounded-lg border border-gray-200'
          const valueClass =
            d.tone === 'highlight'
              ? 'text-sm text-pink-600 font-medium'
              : d.tone === 'mute'
                ? 'text-sm text-gray-400 italic'
                : 'text-sm text-gray-500'
          return (
            <div key={d.day} className={`flex items-center justify-between p-3 ${wrapClass}`}>
              <span className="text-sm text-gray-700 font-medium">{d.day}</span>
              <span className={valueClass}>{d.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InboxCard() {
  const requests = [
    { initials: 'SH', avatar: 'bg-pink-500', name: 'Sarah H.', body: 'Swap Friday close → Tom', verdict: 'works' },
    { initials: 'JM', avatar: 'bg-gray-900', name: 'James M.', body: 'Day off: Tuesday 14th', verdict: 'works' },
    { initials: 'EP', avatar: 'bg-gray-500', name: 'Emma P.', body: 'Swap Sat open → Liam', verdict: 'breaks' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
        <p className="font-cal text-xl font-semibold text-gray-900">Requests</p>
        <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-semibold">3 pending</span>
      </div>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.initials} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className={`w-10 h-10 rounded-full ${r.avatar} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
              {r.initials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{r.name}</p>
              <p className="text-xs text-gray-500">{r.body}</p>
            </div>
            {r.verdict === 'works' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Works
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Breaks rule
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ExportTiles() {
  const downloadIcon = (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
  const csvIcon = (
    <svg className="w-6 h-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-7 4h8a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0011.586 3H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
  const pdfIcon = (
    <svg className="w-6 h-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
  const tiles = [
    { icon: csvIcon, name: 'rota-week-12.csv', sub: 'For Xero, Sage, QuickBooks' },
    { icon: pdfIcon, name: 'rota-week-12.pdf', sub: 'Wall-ready, branded' },
  ]
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8">
      <div className="space-y-3">
        {tiles.map((t) => (
          <div
            key={t.name}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-pink-300 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">{t.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500">{t.sub}</p>
            </div>
            {downloadIcon}
          </div>
        ))}
      </div>
    </div>
  )
}

function PhoneFrame({ src, alt }) {
  return (
    <div className="flex justify-center">
      <div className="w-[280px]">
        <div className="bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl">
          <div className="bg-white rounded-[2rem] overflow-hidden">
            <Image src={src} alt={alt} width={390} height={844} className="w-full h-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeaturesPage() {
  const [activeId, setActiveId] = useState(allSectionIds[0])

  useEffect(() => {
    const update = () => {
      const scrollPos = window.scrollY + 120
      let current = allSectionIds[0]
      for (const id of allSectionIds) {
        const el = document.getElementById(id)
        if (el && scrollPos >= el.offsetTop) current = id
      }
      setActiveId(current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  // Eyebrow icons
  const lightning = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
  const pencil = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
  const shield = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
  const team = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
  const clock = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
  const phone = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
  const chart = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
  const inbox = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
    </svg>
  )
  const download = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}>
      <Nav currentPage="features" />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative px-6 lg:px-8 pt-20 lg:pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50/60 via-white to-white" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <RevealSection>
            <p className="text-sm font-semibold uppercase tracking-wider text-pink-600 mb-4">Features</p>
            <h1 className="font-cal text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-6 leading-[1.0] tracking-tight">
              Everything Shiftly does, <span className="text-pink-500">in detail.</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Nine tools, one tight workflow. Built so you set up once and run rotas forever.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ CONTENT WITH STICKY TOC ═══════════ */}
      <div className="px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[240px_1fr] gap-16">

          {/* Sticky side TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">On this page</p>
              {tocGroups.map((group) => (
                <div key={group.title} className="mb-6">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">{group.title}</p>
                  <div className="space-y-2.5">
                    {group.items.map((item) => {
                      const isActive = activeId === item.id
                      return (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          aria-current={isActive ? 'location' : undefined}
                          className={`toc-link block text-sm transition-colors ${
                            isActive ? 'active' : 'text-gray-500 hover:text-pink-600'
                          }`}
                        >
                          {item.label}
                        </a>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="space-y-32">

            {/* ═══ GROUP 1: SCHEDULING ═══ */}
            <div>
              <GroupHeader kicker="Group 01 · Scheduling" headline="The rota itself." />

              {/* Rota Generation */}
              <section id="rota-generation" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24 scroll-mt-24">
                <RevealSection>
                  <div>
                    <Eyebrow icon={lightning}>Constraint Satisfaction</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Rota Generation</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      Hit generate. Shiftly builds a full week&apos;s rota in seconds, with every contracted hour met, every rule respected, and shifts distributed evenly across your team.
                    </p>
                    <div className="space-y-3">
                      <Bullet>Contracted hours met to the minute</Bullet>
                      <Bullet>Multi-week generation with rotation across staff</Bullet>
                      <Bullet>Pre-generation check warns you if coverage gaps exist</Bullet>
                      <Bullet>Approve to publish; staff see it in their app instantly</Bullet>
                    </div>
                  </div>
                </RevealSection>
                <RevealSection delay={0.15}>
                  <ScreenshotPanel src="/screenshots/rota.png" alt="Generated weekly rota" />
                </RevealSection>
              </section>

              {/* Manual Editing */}
              <section id="manual-editing" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24 scroll-mt-24">
                <RevealSection className="order-2 lg:order-1">
                  <ScreenshotPanel src="/screenshots/rota-grid.png" alt="Cell editing close-up" />
                </RevealSection>
                <RevealSection delay={0.15} className="order-1 lg:order-2">
                  <div>
                    <Eyebrow icon={pencil}>Full Manual Control</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Manual Editing</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      The generated rota is your starting point, not your ceiling. Click any cell to add, edit, reassign, or remove a shift. Override the maths whenever the day demands it.
                    </p>
                    <div className="space-y-3">
                      <Bullet>Click any cell to assign or reassign</Bullet>
                      <Bullet>Visual flags when manual edits break a rule</Bullet>
                      <Bullet>Add unscheduled cover or swap shifts in one click</Bullet>
                      <Bullet>Re-run generation any time to start fresh</Bullet>
                    </div>
                  </div>
                </RevealSection>
              </section>

              {/* Fairness Rules */}
              <section id="fairness-rules" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center scroll-mt-24">
                <RevealSection>
                  <div>
                    <Eyebrow icon={shield}>Configurable Rules</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Fairness Rules</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      You decide what fair means for your team. Toggle rules on, set the thresholds, and Shiftly enforces them mathematically every time you generate.
                    </p>
                    <div className="space-y-3">
                      <Bullet>Minimum rest between shifts (no clopenings)</Bullet>
                      <Bullet>Even weekend distribution across the team</Bullet>
                      <Bullet>Maximum consecutive working days</Bullet>
                      <Bullet>Role-based shift coverage (kitchen, bar, FoH)</Bullet>
                    </div>
                  </div>
                </RevealSection>
                <RevealSection delay={0.15}>
                  <FairnessRulesCard />
                </RevealSection>
              </section>
            </div>

            {/* ═══ GROUP 2: STAFF MANAGEMENT ═══ */}
            <div>
              <GroupHeader kicker="Group 02 · Staff Management" headline="Your team, one view." />

              {/* Workspace */}
              <section id="workspace" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24 scroll-mt-24">
                <RevealSection>
                  <div>
                    <Eyebrow icon={team}>Team Management</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Team Workspace</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      Every staff member&apos;s contracted hours, role, and availability in one clean view. See whether your team can cover your shifts before you generate, not after.
                    </p>
                    <div className="space-y-3">
                      <Bullet>Contracted hours, max hours, and role per person</Bullet>
                      <Bullet>Real-time hours comparison: capacity vs demand</Bullet>
                      <Bullet>Section tags (kitchen, bar, FoH) for filtering</Bullet>
                      <Bullet>Add or archive staff in seconds</Bullet>
                    </div>
                  </div>
                </RevealSection>
                <RevealSection delay={0.15}>
                  <ScreenshotPanel src="/screenshots/workspace.png" alt="Staff list view" />
                </RevealSection>
              </section>

              {/* Availability */}
              <section id="availability" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24 scroll-mt-24">
                <RevealSection className="order-2 lg:order-1">
                  <AvailabilityCard />
                </RevealSection>
                <RevealSection delay={0.15} className="order-1 lg:order-2">
                  <div>
                    <Eyebrow icon={clock}>Precise to the Minute</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Availability Windows</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      Real life isn&apos;t AM and PM. School pickup at 3:15. The other job that finishes at 6. Set exact time windows per day per staff member, and the rota respects them.
                    </p>
                    <div className="space-y-3">
                      <Bullet>Different windows for every day of the week</Bullet>
                      <Bullet>Set unavailable days, all-day, or precise windows</Bullet>
                      <Bullet>Staff can update from their app; manager approves</Bullet>
                      <Bullet>Set once, and it carries forever until they change it</Bullet>
                    </div>
                  </div>
                </RevealSection>
              </section>

              {/* Employee App */}
              <section id="employee-app" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center scroll-mt-24">
                <RevealSection>
                  <div>
                    <Eyebrow icon={phone}>Mobile-First</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Employee App</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      Staff see their rota, submit availability, and request time off from their phone. No app store download. Works on any device as a web app.
                    </p>
                    <div className="space-y-3">
                      <Bullet>View upcoming shifts and full week schedule</Bullet>
                      <Bullet>Submit availability changes and time off requests</Bullet>
                      <Bullet>Request shift swaps, pre-checked against your rules</Bullet>
                      <Bullet>Receive announcements and shift change alerts</Bullet>
                    </div>
                  </div>
                </RevealSection>
                <RevealSection delay={0.15}>
                  <PhoneFrame src="/screenshots/employee.png" alt="Employee app showing upcoming shifts" />
                </RevealSection>
              </section>
            </div>

            {/* ═══ GROUP 3: OPERATIONS ═══ */}
            <div>
              <GroupHeader kicker="Group 03 · Operations" headline="Run the day, not the spreadsheet." />

              {/* Reports */}
              <section id="reports" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24 scroll-mt-24">
                <RevealSection>
                  <div>
                    <Eyebrow icon={chart}>Costs &amp; Hours</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Reports &amp; Payroll</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      Total hours, regular vs overtime, and labour costs per week. Know what the rota costs before the week starts, not when payroll lands.
                    </p>
                    <div className="space-y-3">
                      <Bullet>Weekly labour cost breakdown by staff and role</Bullet>
                      <Bullet>Regular vs overtime hours, surfaced live</Bullet>
                      <Bullet>Password-protected payroll section for security</Bullet>
                      <Bullet>Compare week to week to spot drift</Bullet>
                    </div>
                  </div>
                </RevealSection>
                <RevealSection delay={0.15}>
                  <ScreenshotPanel src="/screenshots/reports.png" alt="Reports and payroll view" />
                </RevealSection>
              </section>

              {/* Inbox */}
              <section id="inbox" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24 scroll-mt-24">
                <RevealSection className="order-2 lg:order-1">
                  <InboxCard />
                </RevealSection>
                <RevealSection delay={0.15} className="order-1 lg:order-2">
                  <div>
                    <Eyebrow icon={inbox}>Pre-Checked Requests</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">Team Inbox</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      Every swap, day off, and availability change in one place, pre-checked against your rules. Tap yes if it works. Tap no if it doesn&apos;t. The maths is done before you decide.
                    </p>
                    <div className="space-y-3">
                      <Bullet>Swap requests automatically validated against rules</Bullet>
                      <Bullet>Day-off requests checked against coverage</Bullet>
                      <Bullet>Approve or decline with one tap</Bullet>
                      <Bullet>Send announcements to the whole team or a section</Bullet>
                    </div>
                  </div>
                </RevealSection>
              </section>

              {/* Exports */}
              <section id="exports" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center scroll-mt-24">
                <RevealSection>
                  <div>
                    <Eyebrow icon={download}>One-Click Export</Eyebrow>
                    <h3 className="font-cal text-3xl lg:text-4xl text-gray-900 mb-4 tracking-tight">CSV &amp; PDF Export</h3>
                    <p className="text-lg text-gray-500 leading-relaxed mb-6">
                      Send your accountant the numbers in the format they want. CSV for the books. PDF for the records. No copy-paste. No reformatting.
                    </p>
                    <div className="space-y-3">
                      <Bullet>CSV export ready for Xero, Sage, QuickBooks, and PayFit</Bullet>
                      <Bullet>Branded PDF rota for printed wall posting</Bullet>
                      <Bullet>Custom date ranges and per-staff filters</Bullet>
                      <Bullet>Email export directly to accountant from Shiftly</Bullet>
                    </div>
                  </div>
                </RevealSection>
                <RevealSection delay={0.15}>
                  <ExportTiles />
                </RevealSection>
              </section>
            </div>

          </main>
        </div>
      </div>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <FinalCTA subhead="Set up once. Generate forever. Run the day." />

      {/* ═══════════ FOOTER ═══════════ */}
      <Footer />
    </div>
  )
}
