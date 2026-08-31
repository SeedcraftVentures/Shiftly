'use client'

import Link from 'next/link'
import Nav from '@/app/components/Nav'
import RevealSection from '@/app/components/RevealSection'
import FaqItem from '@/app/components/FaqItem'
import FinalCTA from '@/app/components/FinalCTA'
import Footer from '@/app/components/Footer'
import CompanionChatMock from '@/app/components/CompanionChatMock'
import HeroCollage from '@/app/components/HeroCollage'
import ReportsMock from '@/app/components/ReportsMock'
import RulesMock from '@/app/components/RulesMock'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'

const sellingPoints = [
  'Set up in minutes',
  'Unlimited staff, one price',
  'A companion guides you',
  'Schedules staff will thank you for',
]

const fairnessRules = [
  'Contracted hours, every week',
  'No close then open shifts',
  'Even weekend rotation',
  'Rest between shifts',
  'Max days in a row',
  'Days off are kept',
]

const companionBullets = [
  'Enterprise level scheduling, for everyone',
  'Guided set up',
  'The numbers you need, one click away',
]

const manualBullets = [
  'Unlimited staff and teams',
  'Fair rotas in seconds',
  'Guided setup, plus a help chat',
  'Free staff apps for iPhone and Android',
  'Reports, pay and exports',
]

const aiBullets = [
  'Everything in Manual, plus:',
  'A companion to change and manage the rota',
  'Just ask in plain words, it runs the maths',
  'Teaches you the app as you use it',
  'Priority support',
]

const foundingBullets = [
  'Everything in the Companion plan',
  'First year £299, then £599 a year',
  'Keep the price as long as you stay',
  'For a testimonial and some feedback',
]

const compareRows = [
  { label: 'Fair rotas built by maths', them: 'some' },
  { label: 'A companion that teaches you', them: 'no' },
  { label: 'Unlimited staff, one flat price', them: 'no' },
  { label: 'Free staff apps for iPhone and Android', them: 'some' },
  { label: 'Reports and payroll built in', them: 'some' },
  { label: 'Set up with no demo call', them: 'no' },
  { label: 'Only what you actually need', them: 'no' },
]

const faqs = [
  {
    q: 'Is there really a free trial?',
    a: '7 days free, and no card. You get the full Companion the whole time, so you can build a month of rotas before you decide. After that it is £49 or £59 a month. Cancel anytime.'
  },
  {
    q: "What's the difference between the Manual and Companion plans?",
    a: 'Both give you unlimited staff and the same rota engine, and the rota is always built by maths. £49 Manual has the guided setup and a help chat. £59 adds the Companion: just ask in plain words to change the rota, clear a request, or check anything, and it does it for you and teaches you as you go. The companion is powered by AI, but it only helps you run things, it never writes the rota itself.'
  },
  {
    q: 'How do you make rotas fair?',
    a: 'We use maths, the same kind used to plan flights and hospital shifts. You set your rules, like contracted hours and rest between shifts. The maths keeps every rule, every week.'
  },
  {
    q: 'Who is Shiftly for?',
    a: 'UK pubs, restaurants, cafés and shops with 8 to 50 staff. If you lose your Sunday to the rota, Shiftly saves you the time and the arguments.'
  },
  {
    q: 'Do staff need to download anything?',
    a: 'There are free Shiftly apps for iPhone and Android, and a web app for any other phone. Staff see their rota, send their times, and ask for days off.'
  },
  {
    q: 'What is the Founding Member offer?',
    a: 'The first 200 businesses on the Companion plan get their first year for £299, down from £599, for a testimonial and some feedback. Stay a member and you keep that price. Once the 200 are gone, they are gone.'
  },
  {
    q: 'Can I run more than one team or shop?',
    a: 'Yes. Each shop has its own teams, staff, shifts and rules. Your first shop is included, each extra shop is £20 a month, and reports add up across them all.'
  }
]

const Check = ({ color = '#FF1F7D', size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-figtree), system-ui, -apple-system, sans-serif" }}>
      <style jsx global>{`
        @keyframes shiftly-hero-rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .shiftly-hero-line {
          opacity: 0;
          animation: shiftly-hero-rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .shiftly-hero-line-1 { animation-delay: 0.1s; }
        .shiftly-hero-line-2 { animation-delay: 0.3s; }
      `}</style>

      <Nav currentPage="home" />

      {/* ═══════════ HERO ═══════════ */}
      <HeatGlow as="section" palette={SHIFTLY_PALETTE} className="relative px-6 lg:px-8 pt-32 lg:pt-40 pb-28 lg:pb-40">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-cal text-6xl sm:text-7xl lg:text-8xl text-white mb-8 leading-[1.0] tracking-tight" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.25)' }}>
            <span className="shiftly-hero-line shiftly-hero-line-1 block">Fair shifts</span>
            <span className="shiftly-hero-line shiftly-hero-line-2 block">in a couple of clicks.</span>
          </h1>

          <RevealSection delay={0.5}>
            <p className="text-lg lg:text-xl text-white max-w-2xl mx-auto leading-relaxed" style={{ textShadow: '0 1px 16px rgba(0,0,0,0.22)' }}>
              Shiftly builds fair work schedules and lets you manage your team, in a way anyone can pick up fast.
            </p>
          </RevealSection>

          <RevealSection delay={0.6}>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-pink-600 text-base font-semibold rounded-xl shadow-lg hover:bg-pink-50 hover:-translate-y-0.5 transition-all"
              >
                Start free today
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              <a href="#pricing" className="px-7 py-3.5 rounded-xl text-base font-semibold text-white border border-white/50 hover:bg-white/10 transition-all">
                See pricing
              </a>
            </div>
            <p className="text-sm text-white/85 mt-3">7 days free, no card. Cancel anytime.</p>
          </RevealSection>

          <RevealSection delay={0.75}>
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
              {sellingPoints.map((s) => (
                <div key={s} className="flex items-start gap-2.5 text-left">
                  <span className="mt-1 flex-shrink-0"><Check color="#ffffff" size={15} /></span>
                  <span className="text-base lg:text-lg text-white font-medium leading-snug" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>{s}</span>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>

        {/* Hero visual: faithful mock collage (screenshots to replace later) */}
        <div className="max-w-3xl mx-auto mt-20 lg:mt-24 px-2">
          <HeroCollage />
        </div>
      </HeatGlow>

      {/* ═══════════ COMPANION ═══════════ */}
      <section id="ai-companion" className="px-6 lg:px-8 py-20 lg:py-28 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
            <RevealSection>
              <div>
                <h2 className="font-cal text-4xl lg:text-6xl text-gray-900 leading-[1.05] tracking-tight mb-6">
                  Scheduled by maths.<br />Supported by AI.
                </h2>
                <p className="text-lg text-gray-500 leading-relaxed mb-4 max-w-xl">
                  Shiftly&apos;s companion doesn&apos;t write your rota. It helps you query, adapt and edit it, once it&apos;s built by a custom solver (the same kind airlines use to plan flights).
                </p>
                <p className="text-lg text-gray-500 leading-relaxed mb-6 max-w-xl">
                  Ask it to add cover for a busy Saturday, report your weekend payroll cost, or tell you which staff still have holiday to take. That info is always at your fingertips.
                </p>
                <div className="space-y-3 mb-8">
                  {companionBullets.map((line) => (
                    <div key={line} className="flex items-start gap-3">
                      <span className="w-6 h-6 mt-0.5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0"><Check /></span>
                      <span className="text-gray-700 leading-relaxed">{line}</span>
                    </div>
                  ))}
                </div>
                <a href="#pricing" className="inline-flex items-center gap-2 text-pink-600 font-semibold hover:gap-3 transition-all">
                  See the Companion plan
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </a>
              </div>
            </RevealSection>
            <RevealSection delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-4 bg-pink-100/50 rounded-[2rem] blur-3xl" />
                <div className="relative"><CompanionChatMock /></div>
              </div>
            </RevealSection>
          </div>

        </div>
      </section>

      {/* ═══════════ FAIRNESS (the big sell) ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <RevealSection>
              <div>
                <h2 className="font-cal text-4xl lg:text-6xl text-gray-900 leading-[1.05] tracking-tight mb-6">
                  A rota that can&apos;t be wrong.
                </h2>
                <p className="text-lg text-gray-500 leading-relaxed mb-4 max-w-xl">
                  This is the heart of Shiftly. You set the rules that matter to you, then the maths builds a rota that keeps every one. Not most weeks. Every week.
                </p>
                <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl">
                  So no one gets a close then an open. No one is short on their hours. And weekends are shared out fair, without you checking by hand.
                </p>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                  {fairnessRules.map((rule) => (
                    <div key={rule} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0"><Check /></span>
                      <span className="text-[15px] font-medium text-gray-800">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
            <RevealSection delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-4 bg-pink-100/40 rounded-[2rem] blur-3xl" />
                <div className="relative"><RulesMock /></div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════ REPORTS & PAYROLL ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <RevealSection className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-4 bg-pink-100/40 rounded-[2rem] blur-3xl" />
                <div className="relative"><ReportsMock /></div>
              </div>
            </RevealSection>
            <RevealSection delay={0.15} className="order-1 lg:order-2">
              <div>
                <h2 className="font-cal text-4xl lg:text-5xl text-gray-900 leading-[1.05] tracking-tight mb-6">
                  Know what the week costs, before it starts.
                </h2>
                <p className="text-lg text-gray-500 leading-relaxed mb-6 max-w-xl">
                  Every shift turns into hours and pay on its own. See what the week ahead costs, and the month too. It is clear, quick, and the kind of screen you actually like to look at.
                </p>
                <div className="space-y-3">
                  {['Labour cost by week, team and person', 'Pay worked out from the rota, no adding up', 'One click to a CSV for your accountant'].map((line) => (
                    <div key={line} className="flex items-start gap-3">
                      <span className="w-6 h-6 mt-0.5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0"><Check /></span>
                      <span className="text-gray-700 leading-relaxed">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════ WHY SHIFTLY (comparison) ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="max-w-3xl mb-12">
              <h2 className="font-cal text-4xl lg:text-5xl text-gray-900 leading-[1.05] tracking-tight">
                Everything you need and nothing that you don&apos;t.
              </h2>
              <p className="text-lg text-gray-500 mt-6 leading-relaxed">
                We build only what you need to run your place, and we do it so well that scheduling has never been this easy.
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={0.1}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              {/* header */}
              <div className="grid grid-cols-[1fr_92px_92px] sm:grid-cols-[1fr_120px_120px] bg-gray-50 border-b border-gray-200">
                <div className="px-5 py-4 text-sm font-semibold text-gray-400">What you get</div>
                <div className="px-3 py-4 text-center text-sm font-bold text-pink-600">Shiftly</div>
                <div className="px-3 py-4 text-center text-sm font-semibold text-gray-400">Other tools</div>
              </div>
              {/* rows */}
              {compareRows.map((row, i) => (
                <div key={row.label} className={`grid grid-cols-[1fr_92px_92px] sm:grid-cols-[1fr_120px_120px] items-center ${i % 2 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <div className="px-5 py-4 text-[15px] text-gray-800">{row.label}</div>
                  <div className="px-3 py-4 flex justify-center">
                    <span className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center"><Check color="#ffffff" /></span>
                  </div>
                  <div className="px-3 py-4 flex justify-center text-gray-300">
                    {row.them === 'some' ? (
                      <span className="text-gray-400 text-lg leading-none">~</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" /></svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ PRICING (3 cards) ═══════════ */}
      <section id="pricing" className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="font-cal text-4xl lg:text-5xl text-gray-900 leading-[1.05] tracking-tight">
                One flat price. Add all the staff you like.
              </h2>
              <p className="text-lg text-gray-500 mt-5 max-w-xl mx-auto">
                No charge per person. Every plan comes with unlimited staff and teams.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {/* Manual */}
            <RevealSection>
              <div className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm h-full flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-pink-200">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Manual</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-cal text-4xl font-bold text-gray-900">£49</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Or £499 a year.</p>
                <div className="space-y-2.5 mb-7 flex-1">
                  {manualBullets.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-shrink-0"><Check color="#9CA3AF" /></span>
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/sign-up" className="block w-full py-3 rounded-xl font-semibold text-gray-700 text-center border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all">
                  Start free
                </Link>
              </div>
            </RevealSection>

            {/* Companion (recommended) */}
            <RevealSection delay={0.08}>
              <div className="group relative h-full md:-mt-3 transition-transform duration-300 hover:-translate-y-1.5">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-4 py-1 bg-pink-500 text-white rounded-full text-xs font-bold shadow-lg whitespace-nowrap">Recommended</span>
                <div className="relative bg-white border-2 border-pink-500 rounded-2xl p-7 pt-8 overflow-hidden h-full flex flex-col shadow-lg shadow-pink-100 transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-pink-200">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-pink-100/70 rounded-full blur-3xl" />
                  <div className="relative z-10 flex flex-col h-full">
                    <p className="text-sm font-semibold text-pink-600 uppercase tracking-wider mb-4">Companion</p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="font-cal text-4xl font-bold text-gray-900">£59</span>
                      <span className="text-gray-500 text-sm">/month</span>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">Or £599 a year.</p>
                    <div className="space-y-2.5 mb-7 flex-1">
                      {aiBullets.map((item) => (
                        <div key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex-shrink-0"><Check /></span>
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                    <Link href="/sign-up" className="block w-full py-3 rounded-xl font-semibold text-white text-center bg-pink-500 hover:bg-pink-600 hover:shadow-lg transition-all">
                      Start free
                    </Link>
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Founding (limited) */}
            <RevealSection delay={0.16}>
              <div className="group relative h-full transition-transform duration-300 hover:-translate-y-1.5">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-4 py-1 bg-white text-gray-900 border border-gray-200 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">Limited spaces</span>
                <div className="relative bg-gray-900 rounded-2xl p-7 pt-8 overflow-hidden h-full flex flex-col shadow-lg transition-shadow duration-300 group-hover:shadow-2xl">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
                  <div className="relative z-10 flex flex-col h-full">
                    <p className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-4">Founding Member</p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="font-cal text-4xl font-bold text-white">£299</span>
                      <span className="text-white/60 text-sm">first year</span>
                    </div>
                    <p className="text-white/60 text-sm mb-6">Then £599 a year. First 200 only.</p>
                    <div className="space-y-2.5 mb-7 flex-1">
                      {foundingBullets.map((item) => (
                        <div key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex-shrink-0"><Check color="#FF1F7D" /></span>
                          <span className="text-sm text-white/85">{item}</span>
                        </div>
                      ))}
                    </div>
                    <Link href="/sign-up" className="block w-full py-3 rounded-xl font-semibold text-gray-900 text-center bg-white hover:bg-pink-50 transition-all">
                      Claim a spot
                    </Link>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>

          <RevealSection>
            <p className="text-center text-sm text-gray-500 mt-10 max-w-xl mx-auto">
              Every plan starts with 7 days free, no card, with the companion on. Your first shop is included, each extra shop is £20 a month. Cancel anytime.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <div className="text-center mb-12">
              <h2 className="font-cal text-3xl lg:text-4xl text-gray-900 tracking-tight">
                Common questions
              </h2>
            </div>
          </RevealSection>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={faq.q} question={faq.q} answer={faq.a} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <FinalCTA subhead="Be the boss your team wants. Shiftly makes it the easy choice." />

      {/* ═══════════ FOOTER ═══════════ */}
      <Footer />
    </div>
  )
}
