'use client'

import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/app/components/Nav'
import RevealSection from '@/app/components/RevealSection'
import FaqItem from '@/app/components/FaqItem'
import FinalCTA from '@/app/components/FinalCTA'
import Footer from '@/app/components/Footer'
import CompanionChatMock from '@/app/components/CompanionChatMock'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'

const pillarOneRules = [
  'Contracted hours, every week',
  'No close-then-open shifts',
  'Even weekend rotation',
  'Minimum rest between shifts',
  'Maximum consecutive days',
  'Availability windows respected',
]

const pillarTwoLines = [
  'You open up, and the right people are already on.',
  "Nobody's texting to swap. Nobody's left short.",
  "It's busy, it's grand, and it all just works.",
  'You lock up on time and head home.',
]

const manualBullets = [
  'Unlimited staff and teams',
  'Mathematically fair rotas in seconds',
  'Guided setup companion and Q&A help',
  'Free staff apps for iPhone and Android',
  'Reports, payroll and exports',
]

const aiBullets = [
  'Everything in Manual, plus:',
  'An AI assistant to query, adapt and manage it all',
  'Ask for changes in plain English, it runs the maths',
  'Teaches you the app as you use it',
  'Priority support',
]

const faqs = [
  {
    q: 'Is there really a free trial?',
    a: 'Yes. 7 days free, with no card required. You get the full AI companion for the whole trial, so you can build a month of rotas before you decide. After that it is £49 or £59 a month, and you can cancel anytime.'
  },
  {
    q: "What's the difference between the £49 and £59 plans?",
    a: 'Both give you unlimited staff and the exact same scheduling engine. The rota is always built by fair maths, not AI. £49 Manual includes the guided setup companion and a Q&A helper that answers "how do I". £59 adds an AI companion that helps you run the whole thing: ask in plain English to adjust the rota, manage requests, or query anything, and it drives the scheduler for you and teaches you as you go.'
  },
  {
    q: 'How does Shiftly actually make rotas fair?',
    a: 'We use constraint satisfaction, the same maths used to schedule airline crews, exam timetables, and hospital theatres. Every rule you set, contracted hours, weekend rotation, rest periods, is built right into the maths, so it actually holds, week after week.'
  },
  {
    q: 'Who is Shiftly built for?',
    a: 'UK hospitality and retail businesses with 8 to 50 staff. Pubs, restaurants, cafés, shops. If you spend Sunday nights rebuilding the rota, Shiftly will save you the time and the arguments.'
  },
  {
    q: 'Do staff need to download anything?',
    a: 'There are free Shiftly apps for iPhone and Android, and a web app for any other device. Staff see their rota, submit availability, and request time off from their phone.'
  },
  {
    q: 'What is the Founding Member offer?',
    a: 'The first 200 businesses on the AI plan get their first year for £299, down from £599, in exchange for a testimonial and a bit of feedback. Stay a member and you keep that price. Once the 200 are gone, they are gone.'
  },
  {
    q: 'Can I run multiple teams or locations?',
    a: 'Yes. Each location has its own teams (kitchen, bar, front of house), each with its own staff, shifts and rules. Your first location is included, each extra location is £20 a month, and reports roll up across all your teams.'
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Cal Sans Text', var(--font-figtree), system-ui, sans-serif" }}>
      <style jsx global>{`
        @keyframes shiftly-hero-rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .shiftly-hero-line {
          opacity: 0;
          animation: shiftly-hero-rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .shiftly-hero-line-1 { animation-delay: 0.15s; }
        .shiftly-hero-line-2 { animation-delay: 0.35s; }
        .shiftly-hero-line-3 { animation-delay: 0.55s; }

        @keyframes shiftly-pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .shiftly-pulse-soft {
          animation: shiftly-pulse-soft 2s infinite;
        }
      `}</style>

      <Nav currentPage="home" />

      {/* ═══════════ HERO ═══════════ */}
      <HeatGlow as="section" palette={SHIFTLY_PALETTE} className="relative px-6 lg:px-8 pt-28 lg:pt-36 pb-0">
        <div className="max-w-5xl mx-auto text-center">
          <RevealSection>
            <div className="inline-flex items-center gap-2 mb-7 px-4 py-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full shiftly-pulse-soft" />
              <span className="text-sm font-medium text-white">Now live · 7 days free, no card</span>
            </div>
          </RevealSection>

          <h1 className="font-cal text-6xl sm:text-7xl lg:text-8xl text-white mb-8 leading-[1.0] tracking-tight">
            <span className="shiftly-hero-line shiftly-hero-line-1 block">Fairness, built in.</span>
            <span className="shiftly-hero-line shiftly-hero-line-2 block">Good shifts, on repeat.</span>
          </h1>

          <RevealSection delay={0.7}>
            <p className="text-lg lg:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Shiftly is the rota tool for pubs, restaurants and shops. Tell it how your week runs, and it&apos;ll put together a fair rota in seconds, the kind your team can actually plan their life around.
            </p>
          </RevealSection>

          {/* Primary CTAs */}
          <RevealSection delay={0.8}>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-pink-600 text-base font-semibold rounded-xl shadow-lg hover:bg-pink-50 hover:-translate-y-0.5 transition-all"
              >
                Start free
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              <a
                href="#pricing"
                className="px-7 py-3.5 rounded-xl text-base font-semibold text-white border border-white/40 hover:bg-white/10 transition-all"
              >
                See pricing
              </a>
            </div>
            <p className="text-sm text-white/75 mt-3">7 days free, no card. Cancel anytime.</p>
          </RevealSection>

          {/* Stat strip, relocated from the standalone metrics bar, on the gradient */}
          <RevealSection delay={0.95}>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-white/90">
              {[
                { value: 'Seconds', label: 'From hit generate to finished rota' },
                { value: '100%', label: 'Contracted hours, every week' },
                { value: 'Unlimited', label: 'Staff and teams, one flat price' },
                { value: 'Zero', label: 'Per-seat charges, ever' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-cal text-3xl lg:text-4xl text-white">{stat.value}</div>
                  <p className="text-sm text-white/75 mt-1 leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>

        {/* hero shot renders instantly (no scroll-reveal). It is above the fold and
            the LCP element, so it should paint immediately, not fade in after ~1s */}
        <div className="max-w-6xl mx-auto mt-16">
          <div className="rounded-t-2xl shadow-2xl overflow-hidden border border-white/20 border-b-0 bg-gray-100">
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
              src="/screenshots/hero-new.png"
              alt="Shiftly rota builder showing a generated weekly schedule"
              width={1400}
              height={853}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </HeatGlow>

      {/* ═══════════ PAIN SECTION ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-4">Sound familiar?</p>
              <h2 className="font-cal text-4xl lg:text-6xl text-gray-900 leading-[1.05] max-w-3xl mx-auto tracking-tight">
                You finish the rota. Then the messages start.
              </h2>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-12">
            {[
              'Why am I always on the close?',
              'I booked that Saturday off ages ago.',
              'Can I not get a bit of variety?',
            ].map((quote, i) => (
              <RevealSection key={quote} delay={i * 0.1}>
                <div className="p-7 bg-white border border-gray-200 shadow-sm rounded-2xl text-xl font-medium italic text-gray-800">
                  <span className="text-pink-500 text-3xl leading-none mr-1 not-italic">&ldquo;</span>{quote}
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection>
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-lg text-gray-500 leading-relaxed">
                A spreadsheet can&apos;t hold everyone&apos;s hours, days off and little asks in its head all at once. So things slip, and it&apos;s your team that feels it, even when you&apos;ve done your best by them.
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ PILLAR 1 · FAIRNESS, BUILT IN ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="max-w-3xl mb-16">
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-3">Fairness, built in</p>
              <h2 className="font-cal text-4xl lg:text-6xl text-gray-900 leading-[1.05] tracking-tight">
                A rota that can&apos;t be wrong.
              </h2>
              <p className="text-lg lg:text-xl text-gray-500 mt-6 leading-relaxed">
                Shiftly uses constraint satisfaction, the same maths that schedules airline crews, exam timetables, and hospital theatres. You set the rules, and the maths makes sure every rule holds, every week, without exception. No AI, no guesswork.
              </p>
            </div>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto mb-12">
            {pillarOneRules.map((rule, i) => (
              <RevealSection key={rule} delay={i * 0.05}>
                <div className="flex items-center gap-4 px-6 py-4 bg-white border border-gray-200 rounded-full font-medium text-gray-900 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <span className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 4" stroke="#FF1F7D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {rule}
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection>
            <div className="max-w-3xl mx-auto">
              <div className="px-7 py-6 bg-pink-50 border-l-4 border-pink-500 rounded-2xl text-lg text-gray-900 leading-relaxed">
                <strong className="font-bold">You decide what fair looks like for your place.</strong> Shiftly just makes sure the rota actually sticks to it, every week, without you having to sit and check.
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ PILLAR 2 · MAKE EVERY SHIFT A GOOD ONE ═══════════ */}
      <section id="pillar-2" className="px-6 lg:px-8 py-24 lg:py-32 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <RevealSection>
            <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-4">Make every shift a good one</p>
            <h2 className="font-cal text-4xl lg:text-6xl text-gray-900 leading-[1.05] mb-12 tracking-tight">
              What a good shift <span className="text-pink-500">looks like.</span>
            </h2>
          </RevealSection>

          <RevealSection delay={0.15}>
            <div className="space-y-4 text-2xl lg:text-3xl text-gray-800 leading-relaxed mb-12 font-normal">
              {pillarTwoLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </RevealSection>

          <RevealSection delay={0.4}>
            <p className="text-xl text-gray-500 italic">Honestly, that&apos;s the whole point.</p>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ PILLAR 3 · THE BOSS WORTH WORKING FOR ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
            <RevealSection>
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-3">Looking after your people</p>
              <h2 className="font-cal text-4xl lg:text-5xl text-gray-900 leading-[1.05] mb-6 tracking-tight">
                The team that stays.
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-4">
                There&apos;s good research behind this. Harvard&apos;s Shift Project found that people whose shifts kept getting cancelled or chopped about were nearly twice as likely to leave.
              </p>
              <p className="text-lg text-gray-500 leading-relaxed mb-4">
                Give folks a rota they can plan a life around and they tend to stick with you. They learn the regulars, they cover for each other, and your good people stop drifting off to the place down the road.
              </p>
              <p className="text-lg text-gray-900 font-medium leading-relaxed">
                Look after the rota, and it quietly looks after your team for you.
              </p>
            </RevealSection>

            <RevealSection delay={0.15}>
              <div className="relative bg-white border border-gray-200 rounded-3xl p-10 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-60 h-60 bg-pink-100/70 rounded-full blur-3xl" />
                <div className="relative z-10 space-y-6">
                  <div className="pb-6 border-b border-gray-100">
                    <div className="font-cal text-5xl font-bold text-gray-300 mb-1">42%</div>
                    <p className="text-sm text-gray-500">Left, when shifts kept getting cancelled</p>
                  </div>
                  <div className="pb-6 border-b border-gray-100">
                    <div className="font-cal text-5xl font-bold text-pink-500 mb-1">24%</div>
                    <p className="text-sm text-gray-500">Left, with steady, fair rotas</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Source: The Shift Project, Schneider &amp; Harknett, Harvard Kennedy School / UCSF. Six-month turnover among US retail and food-service workers (2018).
                    </p>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════ AI COMPANION ═══════════ */}
      <section id="ai-companion" className="px-6 lg:px-8 py-20 lg:py-28 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
            <RevealSection>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 border border-pink-100 rounded-full text-xs font-semibold text-pink-600 mb-5">
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full" /> New · AI companion
                </div>
                <h2 className="font-cal text-4xl lg:text-6xl text-gray-900 leading-[1.05] tracking-tight mb-6">
                  The rota is maths.<br />The help is AI.
                </h2>
                <p className="text-lg lg:text-xl text-gray-500 leading-relaxed mb-6 max-w-xl">
                  Your rota is never written by a chatbot. The same fair maths builds it every time, so it is always correct. The £59 companion sits on top: ask in plain English to add cover, move hours around, or clear a request, and it makes the change, runs the scheduler, and shows you the result. It teaches you as you go, so you learn Shiftly just by using it.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    'The scheduling is always mathematical, never guessed by AI',
                    'Ask in plain English to add cover, adjust hours, or clear a request',
                    'It makes the change, runs the maths, and shows you the result',
                    'It teaches you while you use it, so setup is the tutorial',
                    'Nothing publishes without your say-so. You always approve',
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-3">
                      <span className="w-6 h-6 mt-0.5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="#FF1F7D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span className="text-gray-700 leading-relaxed">{line}</span>
                    </div>
                  ))}
                </div>
                <a href="#pricing" className="inline-flex items-center gap-2 text-pink-600 font-semibold hover:gap-3 transition-all">
                  See the AI plan
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

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-3">Pricing</p>
              <h2 className="font-cal text-4xl lg:text-5xl text-gray-900 leading-[1.05] tracking-tight">
                Simple pricing. Unlimited staff.
              </h2>
              <p className="text-lg text-gray-500 mt-5 max-w-xl mx-auto">
                Tools like 7shifts and Homebase charge per employee, so your bill climbs every time you hire. Shiftly is one flat price, unlimited staff and teams, on both plans.
              </p>
            </div>
          </RevealSection>

          {/* Founding Member scarcity band */}
          <RevealSection>
            <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 bg-gray-900 rounded-2xl">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <span className="hidden sm:flex w-10 h-10 rounded-full bg-pink-500 items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg>
                </span>
                <div>
                  <p className="text-white font-semibold">Founding Member, first 200 businesses</p>
                  <p className="text-white/70 text-sm">£299 for your first year on AI, down from £599, for a testimonial and a bit of feedback.</p>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-pink-500/20 text-pink-300 rounded-full text-xs font-bold whitespace-nowrap">Limited</span>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Manual */}
            <RevealSection>
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm h-full flex flex-col">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Manual</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-cal text-5xl font-bold text-gray-900">£49</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">Or £499 a year. Everything you need to build fair rotas yourself.</p>
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {manualBullets.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/sign-up"
                  className="block w-full py-3.5 rounded-xl font-semibold text-gray-700 text-center border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Start free
                </Link>
              </div>
            </RevealSection>

            {/* AI */}
            <RevealSection delay={0.1}>
              <div className="relative bg-white border-2 border-pink-500 rounded-2xl p-8 overflow-hidden h-full flex flex-col shadow-lg shadow-pink-100">
                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-100/70 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-pink-600 uppercase tracking-wider">AI companion</p>
                    <span className="px-3 py-1 bg-pink-500 text-white rounded-full text-xs font-bold">Most popular</span>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="font-cal text-5xl font-bold text-gray-900">£59</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    <p className="text-gray-500 mt-2 text-sm leading-relaxed">Or £599 a year. The companion builds and fixes the rota for you.</p>
                  </div>
                  <div className="space-y-3 mb-8 flex-1">
                    {aiBullets.map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/sign-up"
                    className="block w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all bg-pink-500 hover:bg-pink-600 hover:shadow-lg"
                  >
                    Start free
                  </Link>
                </div>
              </div>
            </RevealSection>
          </div>

          <RevealSection>
            <p className="text-center text-sm text-gray-500 mt-8 max-w-xl mx-auto">
              Every plan starts with a 7-day free trial, no card required, with the AI companion switched on. First location included, each extra location is £20 a month. Cancel anytime.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
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
      <FinalCTA />

      {/* ═══════════ FOOTER ═══════════ */}
      <Footer />
    </div>
  )
}
