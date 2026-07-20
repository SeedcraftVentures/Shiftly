'use client'

import Link from 'next/link'
import ShiftlyLogo from '@/app/components/ShiftlyLogo'
import Footer from '@/app/components/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Top bar ── */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
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

      {/* ── Hero ── */}
      <section className="relative px-6 lg:px-8 pt-16 lg:pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50/40 via-white to-white" />
        <div className="max-w-3xl mx-auto relative z-10 text-center">
          <p className="text-xs font-bold tracking-wider uppercase mb-4" style={{ color: '#FF1F7D' }}>
            plain language, honest intent
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl text-gray-900 font-cal tracking-tight leading-[1.1] mb-6">
            Terms of service.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            This is the agreement between you and us. We've tried to write it like humans, not lawyers.
            But it's still a legal document, so please read it.
          </p>
          <p className="text-sm text-gray-400 mt-6">Last updated 1 May 2026</p>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="px-6 lg:px-8 pb-20">
        <div className="max-w-3xl mx-auto space-y-14">

          {/* Intro */}
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              These Terms of Service govern your access to and use of Shiftly, a staff scheduling tool for UK hospitality
              and retail businesses. Shiftly is a product of Seedcraft Ventures Ltd, a company registered in Scotland,
              trading as Shiftly.
            </p>
            <p>
              By creating an account or using any part of Shiftly, you agree to these terms.
              If you don't agree, please don't use the service. If something here doesn't sit right with you, write to us at{' '}
              <a href="mailto:shiftly@seedcraft.co" className="font-medium" style={{ color: '#FF1F7D' }}>
                shiftly@seedcraft.co
              </a>{' '}
              and let's talk.
            </p>
          </div>

          {/* 01 - Who we are */}
          <Section number="01" title="Who we are">
            <p>
              Shiftly is operated by Seedcraft Ventures Ltd, a company registered in Scotland.
              References to &ldquo;Shiftly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo; throughout these terms refer to Seedcraft Ventures Ltd
              trading as Shiftly.
            </p>
            <div className="bg-gray-900 text-white rounded-2xl p-6 my-2">
              <p className="text-xs font-semibold tracking-wider uppercase mb-3 text-gray-400">Operated by</p>
              <p className="text-xl font-cal mb-2">Seedcraft Ventures Ltd</p>
              <p className="text-sm text-gray-300">Registered in Scotland</p>
              <p className="text-sm text-gray-300">Trading as <strong className="text-white">Shiftly</strong></p>
              <p className="text-sm text-gray-300 mt-3">
                Contact:{' '}
                <a href="mailto:shiftly@seedcraft.co" className="text-pink-400 hover:text-pink-300 transition-colors">
                  shiftly@seedcraft.co
                </a>
              </p>
            </div>
          </Section>

          {/* 02 - What Shiftly is */}
          <Section number="02" title="What Shiftly is">
            <p>
              Shiftly is a staff scheduling tool for hospitality and retail businesses in the UK. It generates fair,
              balanced rotas using a deterministic constraint satisfaction solver, the same kind of maths used for airline crew scheduling.
              You configure your staff, shifts, and fairness rules, and Shiftly does the assembly.
            </p>
            <p>
              Shiftly is built around a core commitment: <strong className="text-gray-900">no AI</strong>.
              The scheduling engine is mathematically deterministic. There is no machine learning model that learns from your data,
              ours or anyone else's. See our{' '}
              <Link href="/privacy" className="font-medium" style={{ color: '#FF1F7D' }}>Privacy Policy</Link>{' '}
              for the full data commitment.
            </p>
            <p>
              Shiftly is an independent product built and maintained by a small team. The service is provided as-is, with no uptime guarantees,
              and may evolve as we learn what users need.
            </p>
          </Section>

          {/* 03 - Your account */}
          <Section number="03" title="Your account">
            <ul className="space-y-3 list-none">
              <BulletItem><strong className="text-gray-900">Age.</strong> You must be at least 18 years old to create a Shiftly account. If you're acting on behalf of a business, you confirm you have authority to bind that business to these terms.</BulletItem>
              <BulletItem><strong className="text-gray-900">Accuracy.</strong> Please provide accurate information when registering. Your business details should match the entity actually using the service.</BulletItem>
              <BulletItem><strong className="text-gray-900">Security.</strong> You're responsible for keeping your credentials secure and for the actions taken under your account. If you think your account has been compromised, tell us immediately.</BulletItem>
              <BulletItem><strong className="text-gray-900">One business per account.</strong> Each Shiftly account is for one business. You can manage multiple teams or sections within it, but separate businesses need separate accounts.</BulletItem>
              <BulletItem><strong className="text-gray-900">Cancellation.</strong> You can cancel and delete your account at any time from your settings. We delete your data within 30 days, subject to the retention exceptions in our Privacy Policy.</BulletItem>
            </ul>
          </Section>

          {/* 04 - Your data and your responsibilities */}
          <Section number="04" title="Your staff data and your responsibilities">
            <p>
              Your business data is yours. You retain full ownership of everything you create and save in Shiftly,
              including staff records, rotas, rules, and reports. We don't claim any rights over it.
            </p>
            <p>
              By using Shiftly, you grant us a limited, non-exclusive, royalty-free licence to store, display, and process your data
              solely for the purpose of operating the service. This licence ends when you delete the data or close your account.
            </p>
            <p>
              <strong className="text-gray-900">When you add staff data to Shiftly, you become the data controller for that data.</strong>{' '}
              Shiftly acts as the processor on your behalf. This means you're responsible for:
            </p>
            <ul className="space-y-2 my-4 list-none">
              <BulletItem>Having a lawful basis to process staff data (typically the employment contract).</BulletItem>
              <BulletItem>Telling your staff that you use Shiftly and what data you're processing about them.</BulletItem>
              <BulletItem>Responding to any data access, correction, or deletion requests from your staff.</BulletItem>
              <BulletItem>Ensuring staff under 18 are added in a manner that complies with UK employment and data protection law.</BulletItem>
            </ul>
            <p>
              We have a Data Processing Agreement (DPA) available on request that sets out our obligations to you as a processor.
            </p>
          </Section>

          {/* 05 - Subscription and billing */}
          <Section number="05" title="Subscription and billing">
            <p>
              Shiftly is offered on a paid subscription. Pricing, including any free trial period, is shown on{' '}
              <Link href="/#pricing" className="font-medium" style={{ color: '#FF1F7D' }}>our pricing page</Link>.
              By subscribing, you authorise us to charge your chosen payment method on a recurring basis until you cancel.
            </p>
            <ul className="space-y-3 my-4 list-none">
              <BulletItem><strong className="text-gray-900">Free trial.</strong> If a free trial is offered, you can cancel any time during the trial without being charged. We'll email you a reminder before the trial ends.</BulletItem>
              <BulletItem><strong className="text-gray-900">Renewals.</strong> Subscriptions renew automatically at the end of each billing period at the then-current price, unless you cancel beforehand.</BulletItem>
              <BulletItem><strong className="text-gray-900">Price changes.</strong> If we change the price of an existing subscription, we'll give you at least 30 days' notice by email. You can cancel before the new price applies.</BulletItem>
              <BulletItem><strong className="text-gray-900">Cancellation.</strong> You can cancel any time from your account settings. You'll keep access until the end of your current billing period. We don't offer pro-rata refunds for partial periods.</BulletItem>
              <BulletItem><strong className="text-gray-900">Lifetime Deals.</strong> If you purchased a Lifetime Deal, your access is one-time and non-refundable after 14 days, but you'll receive every feature and update for as long as Shiftly continues to operate.</BulletItem>
              <BulletItem><strong className="text-gray-900">Failed payments.</strong> If a payment fails, we'll retry over a few days and email you. If we can't collect, your account may be downgraded or paused until payment is up to date.</BulletItem>
            </ul>
            <p>
              All payments are processed by Stripe. We never see or store your card details.
            </p>
          </Section>

          {/* 06 - Acceptable use */}
          <Section number="06" title="Acceptable use">
            <p>The following are not permitted on Shiftly under any circumstances:</p>
            <ul className="space-y-2 my-4 list-none">
              <BulletItem><strong className="text-gray-900">Illegal use.</strong> Anything that violates UK law or the laws of your jurisdiction, including using Shiftly to roster staff in breach of working time or minimum wage rules.</BulletItem>
              <BulletItem><strong className="text-gray-900">Unauthorised data.</strong> Adding personal data about people who haven't agreed to be your employees, contractors, or volunteers, or for whom you don't have a lawful basis to process data.</BulletItem>
              <BulletItem><strong className="text-gray-900">Service abuse.</strong> Reverse engineering, scraping, automated mass-querying, attempting to bypass rate limits, or otherwise using Shiftly in ways it wasn't designed for.</BulletItem>
              <BulletItem><strong className="text-gray-900">Security attacks.</strong> Probing, scanning, or testing the vulnerability of any system or network without our written permission.</BulletItem>
              <BulletItem><strong className="text-gray-900">Sharing access.</strong> Selling, renting, or sublicensing your account credentials to third parties.</BulletItem>
              <BulletItem><strong className="text-gray-900">Resale.</strong> Reselling Shiftly or building a competing scheduling product on top of it.</BulletItem>
            </ul>
            <p>
              Violations may result in account suspension or permanent termination, without notice in serious cases.
            </p>
          </Section>

          {/* 07 - Service availability */}
          <Section number="07" title="Service availability">
            <p>
              We work hard to keep Shiftly running smoothly, but the service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.
              We don't guarantee uninterrupted access. There will be times we need to perform maintenance, fix issues, or
              respond to outages from our infrastructure providers.
            </p>
            <p>
              If we ever shut down Shiftly entirely, we'll give at least 30 days' notice and provide a way to export your data.
            </p>
          </Section>

          {/* 08 - Our intellectual property */}
          <Section number="08" title="Our intellectual property">
            <p>
              The Shiftly name, logo, design, code, and any original content we create are owned by Seedcraft Ventures Ltd and
              protected by copyright and other intellectual property laws.
            </p>
            <p>
              You may not copy, reproduce, or create derivative works from Shiftly's design or interface without our written
              permission. Linking to Shiftly is fine and encouraged.
            </p>
          </Section>

          {/* 09 - Limitation of liability */}
          <Section number="09" title="Limitation of liability">
            <p>
              Shiftly is a tool that helps you produce schedules. You remain responsible for the rotas you publish and for
              compliance with employment, working time, minimum wage, and data protection law.
            </p>
            <p>
              To the fullest extent permitted by law, Seedcraft Ventures Ltd shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of Shiftly.
            </p>
            <p>
              Our total liability for any claim shall not exceed the greater of the amount you paid us in the 12 months
              prior to the event giving rise to the claim, or £100.
            </p>
            <p>
              Nothing in these terms excludes or limits our liability for fraud, death or personal injury caused by our negligence,
              or any other liability that cannot be excluded under applicable law.
            </p>
          </Section>

          {/* 10 - Termination */}
          <Section number="10" title="Termination">
            <p>
              You can stop using Shiftly and delete your account at any time, no explanation needed.
            </p>
            <p>
              We may suspend or terminate your access if you violate these terms, fail to pay, or use Shiftly in a way that
              risks harm to us or other users. In serious cases (illegal use, security threats), we may act without warning.
              In less serious cases, we'll try to contact you first.
            </p>
            <p>
              If your account is terminated for a breach, no refunds will be issued.
            </p>
          </Section>

          {/* 11 - Changes to these terms */}
          <Section number="11" title="Changes to these terms">
            <p>
              When we make material changes (anything that affects your rights or obligations), we'll notify active users by
              email before the change takes effect. Minor updates will just show a new &ldquo;last updated&rdquo; date.
            </p>
            <p>
              Continuing to use Shiftly after a change takes effect means you accept the updated terms.
              If you disagree with a change, you can close your account before it applies.
            </p>
          </Section>

          {/* 12 - Governing law */}
          <Section number="12" title="Governing law">
            <p>
              These terms are governed by the laws of Scotland. Any disputes arising from them shall be subject to the exclusive
              jurisdiction of the Scottish courts, without prejudice to your rights as a consumer under the laws of your own country.
            </p>
            <p>
              If any provision of these terms is found to be unenforceable, the remaining provisions continue in full force.
            </p>
          </Section>

          {/* Contact card */}
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-8 text-center mt-12">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#FF1F7D' }}>
              Questions about these terms
            </p>
            <h3 className="text-2xl font-cal text-gray-900 mb-3">Something not clear? Just ask.</h3>
            <p className="text-gray-600 mb-5 max-w-md mx-auto">
              We're a small team and we actually read our emails. If anything here is confusing, write to us before signing up.
            </p>
            <a
              href="mailto:shiftly@seedcraft.co"
              className="inline-block px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-pink-500/20"
              style={{ background: '#FF1F7D' }}
            >
              shiftly@seedcraft.co
            </a>
          </div>

          <div className="text-center text-sm text-gray-400 pt-6">
            <p>Shiftly is fair rotas, generated in seconds.</p>
            <p className="mt-1">A product of Seedcraft Ventures Ltd, registered in Scotland.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

// ── Helper components ──

type SectionProps = { number: string; title: string; children: React.ReactNode }
function Section({ number, title, children }: SectionProps) {
  return (
    <div className="scroll-mt-24" id={`section-${number}`}>
      <div className="flex items-baseline gap-4 mb-5">
        <span className="text-sm font-bold font-cal" style={{ color: '#FF1F7D' }}>{number}</span>
        <h2 className="text-2xl lg:text-3xl font-cal text-gray-900 tracking-tight">{title}</h2>
      </div>
      <div className="ml-0 sm:ml-9 space-y-4 text-gray-700 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0" style={{ background: '#FF1F7D' }} />
      <span>{children}</span>
    </li>
  )
}