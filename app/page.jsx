'use client'

import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/app/components/Nav'
import RevealSection from '@/app/components/RevealSection'
import FaqItem from '@/app/components/FaqItem'
import FinalCTA from '@/app/components/FinalCTA'
import Footer from '@/app/components/Footer'

const pillarOneRules = [
  'Contracted hours, every week',
  'No close-then-open shifts',
  'Even weekend rotation',
  'Minimum rest between shifts',
  'Maximum consecutive days',
  'Availability windows respected',
]

const pillarTwoLines = [
  'You unlock the door.',
  'The rota is right.',
  "Everyone who's meant to be there, is.",
  'Nothing breaks.',
  'You close on time. You go home.',
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
    a: 'We use constraint satisfaction, the same maths used to schedule airline crews, exam timetables, and hospital theatres. Every rule you set, contracted hours, weekend rotation, rest periods, is mathematically guaranteed to hold. Not best-effort. Guaranteed.'
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
      <section className="relative px-6 lg:px-8 pt-28 lg:pt-36 pb-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50/60 via-white to-white" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <RevealSection>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-pink-50 border border-pink-200 rounded-full">
              <span className="w-2 h-2 bg-pink-500 rounded-full shiftly-pulse-soft" />
              <span className="text-sm font-medium text-pink-700">Launching Summer 2026 · Waitlist Live</span>
            </div>
          </RevealSection>

          <h1 className="font-cal text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-8 leading-[1.0] tracking-tight">
            <span className="shiftly-hero-line shiftly-hero-line-1 block">Fairness, built in<span className="text-pink-500">.</span></span>
            <span className="shiftly-hero-line shiftly-hero-line-2 block">Good shifts, on repeat<span className="text-pink-500">.</span></span>
            <span className="shiftly-hero-line shiftly-hero-line-3 block">A team that wants to stay<span className="text-pink-500">.</span></span>
          </h1>

          <RevealSection delay={0.7}>
            <p className="text-lg lg:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              The rota tool for UK hospitality and retail. Built on the same maths that schedules airline crews. Set your rules once. Run the day, not the spreadsheet.
            </p>
          </RevealSection>

          <RevealSection delay={0.85}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
              <Link
                href="/waitlist"
                className="px-8 py-4 text-white text-base font-semibold rounded-xl hover:shadow-xl hover:shadow-pink-500/20 transition-all bg-pink-500"
              >
                Join the Waitlist
              </Link>
              <a
                href="#pillar-2"
                className="px-8 py-4 text-gray-700 text-base font-semibold rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                See how it feels
              </a>
            </div>
          </RevealSection>
        </div>

        <RevealSection delay={1} className="max-w-6xl mx-auto relative z-10">
          <div className="rounded-t-2xl shadow-2xl overflow-hidden border border-gray-200 border-b-0 bg-gray-100">
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

      {/* ═══════════ METRICS BAR ═══════════ */}
      <section className="px-6 lg:px-8 py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 'Seconds', label: 'From hit generate to finished rota' },
              { value: '100%', label: 'Contracted hours, every week' },
              { value: '£49', label: 'Flat monthly price, any team size' },
              { value: 'Zero', label: 'Per-seat charges. Ever.' },
            ].map((stat, i) => (
              <RevealSection key={stat.label} delay={i * 0.08}>
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 font-cal">{stat.value}</div>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PAIN SECTION ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-gray-900 text-white relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255, 31, 125, 0.12) 0%, transparent 50%)' }}
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-400 mb-4">The Sunday night truth</p>
              <h2 className="font-cal text-4xl lg:text-6xl leading-[1.05] max-w-4xl mx-auto">
                It&apos;s Sunday at <span className="text-pink-500">10:47pm</span>. You&apos;ve rebuilt the rota three times. You still don&apos;t know if it&apos;s fair.
              </h2>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-12">
            {[
              'Why do I always close?',
              'How come they never work weekends?',
              'I asked for Saturday off three weeks ago.',
            ].map((quote, i) => (
              <RevealSection key={quote} delay={i * 0.1}>
                <div className="p-7 bg-white/5 border border-white/10 rounded-2xl text-xl font-medium italic">
                  <span className="text-pink-500 text-3xl leading-none mr-1 not-italic">&ldquo;</span>{quote}
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection>
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-lg text-white/70 leading-relaxed">
                Every Sunday, you&apos;re trying to solve all of it with a spreadsheet that can&apos;t see the rules in your head.
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
                <strong className="font-bold">You decide what fair means.</strong> Shiftly enforces it. Mathematically. Not best-effort. Guaranteed.
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
            <p className="text-xl text-gray-500 italic">That&apos;s the whole product.</p>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════ PILLAR 3 · THE BOSS WORTH WORKING FOR ═══════════ */}
      <section className="px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
            <RevealSection>
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-pink-600 mb-3">The boss worth working for</p>
              <h2 className="font-cal text-4xl lg:text-5xl text-gray-900 leading-[1.05] mb-6 tracking-tight">
                The team that stays.
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-4">
                Research from The Shift Project at Harvard found that frontline workers with cancelled shifts left their jobs at almost double the rate of those with stable schedules.
              </p>
              <p className="text-lg text-gray-500 leading-relaxed mb-4">
                Run six months of fair shifts and you become the place people don&apos;t leave. The kitchen the good chef applies to. The bar where staff stay long enough to learn the regulars&apos; names.
              </p>
              <p className="text-lg text-gray-900 font-medium leading-relaxed">
                Fair scheduling isn&apos;t a feature. It&apos;s a recruitment strategy.
              </p>
            </RevealSection>

            <RevealSection delay={0.15}>
              <div className="relative bg-gray-900 rounded-3xl p-10 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl" />
                <div className="relative z-10 space-y-6">
                  <div className="pb-6 border-b border-white/10">
                    <div className="font-cal text-5xl font-bold text-white/40 mb-1">42%</div>
                    <p className="text-sm text-white/60">Turnover for staff with cancelled shifts</p>
                  </div>
                  <div className="pb-6 border-b border-white/10">
                    <div className="font-cal text-5xl font-bold text-pink-500 mb-1">24%</div>
                    <p className="text-sm text-white/60">Turnover with stable, fair rotas</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Source: The Shift Project, Schneider &amp; Harknett, Harvard Kennedy School / UCSF. Six-month turnover rates among US retail and food-service workers (2018).
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
                We don&apos;t tax you for hiring. No per-seat charges. No gated features. No surprises.
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <RevealSection>
              <div className="relative bg-gray-900 rounded-2xl p-8 text-white overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500 rounded-full text-xs font-bold mb-6">
                    LAUNCH SPECIAL · 200 SPOTS
                  </div>
                  <div className="mb-6">
                    <div className="font-cal text-5xl font-bold">£249</div>
                    <p className="text-gray-400 mt-1">One-time payment. Lifetime access.</p>
                  </div>
                  <div className="space-y-3 mb-8">
                    {ltdBullets.map((item) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-pink-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/waitlist"
                    className="block w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all hover:shadow-lg hover:shadow-pink-500/30 bg-pink-500"
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
                  className="block w-full py-3.5 rounded-xl font-semibold text-gray-700 text-center border border-gray-300 hover:bg-white hover:border-gray-400 transition-all"
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
