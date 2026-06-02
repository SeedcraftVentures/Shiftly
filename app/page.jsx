'use client'

import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/app/components/Nav'
import RevealSection from '@/app/components/RevealSection'
import FaqItem from '@/app/components/FaqItem'
import FinalCTA from '@/app/components/FinalCTA'
import Footer from '@/app/components/Footer'
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

const ltdBullets = [
  'Every feature, forever',
  'All future updates included',
  'Unlimited staff and teams',
  'Priority support',
  'Lock in before prices rise',
]

const standardBullets = [
  'Every feature included',
  'Unlimited staff and teams',
  'Employee app included',
  '14-day free trial, no card',
  'Cancel anytime',
]

const faqs = [
  {
    q: 'How does Shiftly actually make rotas fair?',
    a: 'We use constraint satisfaction, the same maths used to schedule airline crews, exam timetables, and hospital theatres. Every rule you set, contracted hours, weekend rotation, rest periods, is built right into the maths, so it actually holds, week after week.'
  },
  {
    q: 'Who is Shiftly built for?',
    a: 'UK hospitality and retail businesses with 8 to 50 staff. Pubs, restaurants, cafés, shops. If you spend Sunday nights rebuilding the rota, Shiftly will save you the time and the arguments.'
  },
  {
    q: "Can I still edit the rota after it's generated?",
    a: 'Yes. Click any cell to add, edit, reassign, or remove a shift. The generated rota is your starting point. Tweak anything before publishing to your team.'
  },
  {
    q: 'Do staff need to download anything?',
    a: 'No app store download needed. You invite staff by email, they create a simple account, and view their rota on their phone. Works on any device as a web app.'
  },
  {
    q: 'What happens after the 200 LTD spots sell out?',
    a: "Standard pricing kicks in at £49/month or £499/year. The £249 one-time deal locks in every feature forever, including future updates. Once 200 spots are gone, they're gone."
  },
  {
    q: 'Can I run multiple teams or locations?',
    a: 'Yes. Create multiple teams within your workspace, each with its own staff, shifts, and rules. Reports roll up across all teams.'
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-figtree), system-ui, sans-serif' }}>
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
              <span className="text-sm font-medium text-white">Launching Summer 2026 · Waitlist Live</span>
            </div>
          </RevealSection>

          <h1 className="font-cal text-6xl sm:text-7xl lg:text-8xl text-white mb-8 leading-[1.0] tracking-tight">
            <span className="shiftly-hero-line shiftly-hero-line-1 block">Fairness, built in.</span>
            <span className="shiftly-hero-line shiftly-hero-line-2 block">Good shifts, on repeat.</span>
          </h1>

          <RevealSection delay={0.7}>
            <p className="text-lg lg:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Shiftly is the rota tool for pubs, restaurants and shops. Tell it how your week runs, and it&apos;ll put together a fair rota in seconds, the kind your team can actually plan their life around.
            </p>
          </RevealSection>

          <RevealSection delay={0.85}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/waitlist"
                className="px-8 py-4 bg-white text-pink-600 text-base font-semibold rounded-xl shadow-lg hover:bg-pink-50 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Join the Waitlist
              </Link>
              <a
                href="#pillar-2"
                className="px-8 py-4 bg-white/12 backdrop-blur-md border border-white/30 text-white text-base font-semibold rounded-xl hover:bg-white/20 transition-colors"
              >
                See how it feels
              </a>
            </div>
          </RevealSection>

          {/* Stat strip — relocated from the standalone metrics bar, on the gradient */}
          <RevealSection delay={0.95}>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-white/90">
              {[
                { value: 'Seconds', label: 'From hit generate to finished rota' },
                { value: '100%', label: 'Contracted hours, every week' },
                { value: '£49', label: 'Flat monthly price, any team size' },
                { value: 'Zero', label: 'Per-seat charges. Ever.' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-cal text-3xl lg:text-4xl text-white">{stat.value}</div>
                  <p className="text-sm text-white/75 mt-1 leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>

        <RevealSection delay={1} className="max-w-6xl mx-auto mt-16">
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
              src="/screenshots/rota.png"
              alt="Shiftly rota builder showing a generated weekly schedule"
              width={1400}
              height={800}
              className="w-full h-auto"
              priority
            />
          </div>
        </RevealSection>
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
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-3">Fairness, built in</p>
              <h2 className="font-cal text-4xl lg:text-6xl text-gray-900 leading-[1.05] max-w-3xl mx-auto tracking-tight">
                A rota that can&apos;t be wrong.
              </h2>
              <p className="text-lg lg:text-xl text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
                Shiftly uses constraint satisfaction. The same maths that schedules airline crews, exam timetables, and hospital theatres. You set the rules. The maths makes sure every rule holds, every week, without exception.
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

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-3">Pricing</p>
              <h2 className="font-cal text-4xl lg:text-5xl text-gray-900 leading-[1.05] tracking-tight">
                One price. Every feature. However big you grow.
              </h2>
              <p className="text-lg text-gray-500 mt-5 max-w-xl mx-auto">
                You won&apos;t pay more for taking on more people, and nothing good is hidden behind a pricier tier. One price, the lot.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <RevealSection>
              <div className="relative bg-white border-2 border-pink-500 rounded-2xl p-8 overflow-hidden h-full shadow-lg shadow-pink-100">
                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-100/70 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500 text-white rounded-full text-xs font-bold mb-6">
                    LAUNCH SPECIAL · 200 SPOTS
                  </div>
                  <div className="mb-6">
                    <div className="font-cal text-5xl font-bold text-gray-900">£249</div>
                    <p className="text-gray-500 mt-1">One-time payment. Lifetime access.</p>
                  </div>
                  <div className="space-y-3 mb-8">
                    {ltdBullets.map((item) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/waitlist"
                    className="block w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all bg-pink-500 hover:bg-pink-600 hover:shadow-lg"
                  >
                    Join Waitlist for LTD Access
                  </Link>
                </div>
              </div>
            </RevealSection>

            <RevealSection delay={0.1}>
              <div className="bg-white rounded-2xl p-8 border border-pink-200 shadow-md shadow-pink-100/40 h-full flex flex-col">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Standard</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-cal text-5xl font-bold text-gray-900">£49</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-400 mt-1">or £499/year (save 15%)</p>
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {standardBullets.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/waitlist"
                  className="block w-full py-3.5 rounded-xl font-semibold text-gray-700 text-center border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Join Waitlist
                </Link>
              </div>
            </RevealSection>
          </div>
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
