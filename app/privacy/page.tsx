'use client'

import Link from 'next/link'
import ShiftlyLogo from '@/app/components/ShiftlyLogo'
import Footer from '@/app/components/Footer'

export default function PrivacyPage() {
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
            an honest document
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl text-gray-900 font-cal tracking-tight leading-[1.1] mb-6">
            Your data, your business.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            The short version: we use your data to schedule rotas. Nothing else.
            We don't train AI on it. We don't sell it. We collect only what we need to make Shiftly work.
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
              Shiftly is a staff scheduling tool for UK hospitality and retail businesses.
              This Privacy Policy explains what information we collect when you use Shiftly, how we use it,
              and the rights you have over it.
            </p>
            <p>
              Shiftly is a product of Seedcraft Ventures Ltd, a company registered in Scotland, trading as Shiftly.
              Throughout this document &ldquo;Shiftly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo; refers to Seedcraft Ventures Ltd.
              &ldquo;You&rdquo; means anyone who visits the site, holds a Shiftly account, or has staff data added by a Shiftly customer.
            </p>
            <p>
              We aim to comply with the UK GDPR, the EU GDPR, and to honour the broader privacy rights of people
              wherever they're working from. If anything here confuses or concerns you, the contact card is at the bottom.
            </p>
          </div>

          {/* 01 - Who is responsible */}
          <Section number="01" title="Who is responsible for your data">
            <p>
              The way we handle data depends on whose data it is. Shiftly is used by businesses to manage their staff,
              which means we hold data on two distinct groups of people, and our role is different for each.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 my-6">
              <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#FF1F7D' }}>
                  Account holders
                </p>
                <p className="font-bold text-gray-900 mb-2 font-cal">We are the controller</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  When you sign up for a Shiftly account as a business owner or manager, we decide how your personal data
                  (email, name, payment info) is processed. We are the data controller.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Staff members</p>
                <p className="font-bold text-gray-900 mb-2 font-cal">We are the processor</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  When a business adds staff to Shiftly, the business decides how that staff data is used.
                  Shiftly processes it on their behalf. The business is the data controller; we are the processor.
                </p>
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-6 my-6">
              <p className="text-xs font-semibold tracking-wider uppercase mb-3 text-gray-400">Data Controller</p>
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

            <p>
              Staff who want to exercise their data rights should contact their employer first, as the employer is the controller.
              We'll assist where required by law and have a Data Processing Agreement (DPA) available to any business customer on request.
            </p>
          </Section>

          {/* 02 - What we collect */}
          <Section number="02" title="What we collect">
            <p>
              We try to collect as little as possible, and only what's needed to make Shiftly work. Here's everything:
            </p>

            <div className="space-y-3 my-6">
              <DataCard
                tag="Account"
                title="Account holder information"
                desc="Your email, name, and a password (handled by our auth provider, hashed — we never see the plaintext). If you sign in with a third party, we receive only the basic profile fields they send us."
              />
              <DataCard
                tag="Business"
                title="Business details"
                desc="Your company name, sections (Kitchen, Bar, Front of House), operating hours, and any settings you configure. Used solely to run your account."
              />
              <DataCard
                tag="Staff"
                title="Staff data you add"
                desc="Names, contact details, contracted hours, max hours, role/section, availability windows, and any time-off requests. The business that signed up is the controller for this data; Shiftly processes it on their behalf."
              />
              <DataCard
                tag="Schedules"
                title="Rotas and shift records"
                desc="The shifts your team works, generated rotas, manual edits, and history. Used for reports, payroll exports, and to keep your past schedules accessible."
              />
              <DataCard
                tag="Tech"
                title="Technical data"
                desc="Basic log data your browser sends us: IP address, browser type, pages visited, and timestamps. Kept short-term to diagnose problems and spot abuse."
              />
              <DataCard
                tag="Payments"
                title="Payment information"
                desc="If you pay for Shiftly, our payment processor (Stripe) handles your card details. We receive confirmation that a payment was made and the basic billing info needed for invoicing. We never see or store your card number."
              />
            </div>

            <p>
              <strong className="text-gray-900">What we don't collect:</strong> we don't track you across other websites,
              we don't use advertising cookies, we don't fingerprint your device, and we don't ask for your phone number or address
              unless you choose to provide it.
            </p>
          </Section>

          {/* 03 - How we use it */}
          <Section number="03" title="How we use your data">
            <p>We use the information we collect to:</p>
            <ul className="space-y-2 my-4 list-none">
              <BulletItem><strong className="text-gray-900">Run the service.</strong> Generate rotas, sync data across devices, keep your account secure.</BulletItem>
              <BulletItem><strong className="text-gray-900">Generate fair schedules.</strong> Run our deterministic OR-Tools solver against your staff data, contracted hours, and rules to produce balanced rotas.</BulletItem>
              <BulletItem><strong className="text-gray-900">Keep things working.</strong> Fix bugs, prevent abuse, improve features based on what's actually being used.</BulletItem>
              <BulletItem><strong className="text-gray-900">Talk to you when we must.</strong> Important account notices, billing receipts, security alerts, or material changes to this policy. No marketing spam.</BulletItem>
              <BulletItem><strong className="text-gray-900">Meet legal obligations.</strong> Respond to lawful requests, resolve disputes, and enforce our terms.</BulletItem>
            </ul>
          </Section>

          {/* 04 - Our commitment: no AI */}
          <Section number="04" title="Our commitment to your data">
            <div className="bg-gray-900 text-white rounded-2xl p-6 my-2">
              <p className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: '#FF1F7D' }}>
                Core commitment
              </p>
              <p className="text-2xl font-cal mb-3">No AI. No training. No exceptions.</p>
              <p className="text-gray-300 leading-relaxed">
                Shiftly's scheduling engine is a deterministic constraint satisfaction solver — the same kind of maths
                used for airline crew scheduling. It is not AI, and it never will be. We do not use your data to train, fine-tune,
                or improve any AI or machine learning model, ours or anyone else's. We do not sell, license, or transfer your
                data to AI companies or data brokers.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <CommitmentCard
                title="No AI training"
                desc="Your staff data, schedules, and business information will never be used to train any AI model — ours or anyone else's."
              />
              <CommitmentCard
                title="No selling to vendors"
                desc="We will never sell, license, or otherwise transfer your data to AI companies, advertisers, or data brokers."
              />
              <CommitmentCard
                title="Used for scheduling only"
                desc="Your staff data exists in Shiftly to schedule rotas. That's it. It is not aggregated, anonymised, and resold."
              />
              <CommitmentCard
                title="No silent changes"
                desc="If we ever need to revisit any of the above, we will tell you first, clearly, with time to leave if you disagree."
              />
            </div>
          </Section>

          {/* 05 - Legal bases */}
          <Section number="05" title="Our legal bases for processing">
            <p>Under the UK GDPR and EU GDPR, we rely on the following lawful bases:</p>
            <ul className="space-y-2 my-4 list-none">
              <BulletItem><strong className="text-gray-900">Contract.</strong> Running your account, generating rotas, processing payments — necessary to deliver the service you signed up for.</BulletItem>
              <BulletItem><strong className="text-gray-900">Legitimate interests.</strong> Basic logging, security monitoring, and fraud prevention. We've weighed this against your privacy and kept collection minimal.</BulletItem>
              <BulletItem><strong className="text-gray-900">Consent.</strong> Where we ask for something optional, we only act on it if you say yes. You can withdraw consent at any time.</BulletItem>
              <BulletItem><strong className="text-gray-900">Legal obligation.</strong> When we have to respond to a lawful request from a court or regulator, or to keep records as the law requires.</BulletItem>
              <BulletItem><strong className="text-gray-900">Processor instructions.</strong> For staff data, we process under the documented instructions of the business that signed up — not our own decisions.</BulletItem>
            </ul>
          </Section>

          {/* 06 - Sub-processors */}
          <Section number="06" title="Who we share it with">
            <p>
              We don't sell your data. We don't rent it. We share personal data only with a small set of infrastructure providers
              that help us run Shiftly, each bound by a data processing agreement.
            </p>
            <div className="space-y-2 my-6">
              <VendorCard name="Vercel" letter="V" role="Hosting" desc="Serves the Shiftly website and handles request logging." href="https://vercel.com/legal/privacy-policy" />
              <VendorCard name="Supabase" letter="S" role="Database" desc="Stores your account, staff records, and rotas. EU-hosted." href="https://supabase.com/privacy" />
              <VendorCard name="Clerk" letter="C" role="Authentication" desc="Manages user sign-up, sign-in, and account security." href="https://clerk.com/legal/privacy" />
              <VendorCard name="Stripe" letter="$" role="Payments" desc="Processes subscriptions and one-time payments. We never see your card details." href="https://stripe.com/privacy" />
              <VendorCard name="Railway" letter="R" role="Solver hosting" desc="Runs the OR-Tools scheduling engine that generates your rotas." href="https://railway.app/legal/privacy" />
            </div>
            <p>
              We may also disclose information if required by law or to protect the rights, safety, or property of Shiftly
              or its users. If we're ever compelled to hand something over, we will push back where we lawfully can and
              notify the person affected where we're allowed to.
            </p>
            <p>
              If we add a new infrastructure vendor, we'll update this list before that vendor starts handling your data.
            </p>
          </Section>

          {/* 07 - International transfers */}
          <Section number="07" title="International data transfers">
            <p>
              Your data is stored on servers located in the UK and European Union where possible. Some of our infrastructure
              providers (such as Clerk and Stripe) are based in the United States and may process data there.
            </p>
            <p>
              When personal data leaves the UK or EEA, we rely on the European Commission's Standard Contractual Clauses,
              the UK International Data Transfer Addendum, or an equivalent safeguard to ensure your data keeps the same
              level of protection wherever it goes.
            </p>
          </Section>

          {/* 08 - Retention */}
          <Section number="08" title="How long we keep things">
            <p>
              Your account and the data inside it stick around for as long as your subscription is active.
              If you cancel and delete your account, we delete your personal data within 30 days, with the exception of:
            </p>
            <ul className="space-y-2 my-4 list-none">
              <BulletItem><strong className="text-gray-900">Backups.</strong> Encrypted backups may retain your data for up to 60 days before rotation.</BulletItem>
              <BulletItem><strong className="text-gray-900">Financial records.</strong> We keep records of payments for as long as UK tax law requires (currently six years).</BulletItem>
              <BulletItem><strong className="text-gray-900">Legal holds.</strong> If we're under a legal obligation to retain something, we'll keep only what's strictly required and for no longer than necessary.</BulletItem>
            </ul>
            <p>Technical logs are rotated out automatically, typically within 30 days.</p>
          </Section>

          {/* 09 - Security */}
          <Section number="09" title="How we protect your data">
            <p>
              We take reasonable technical and organisational measures to protect your data: encryption in transit (TLS),
              encryption at rest, hashed passwords (handled by Clerk), and access controls on our infrastructure.
              Payroll data is protected by an additional password layer.
            </p>
            <p>
              No system is perfectly secure. If we discover a breach affecting your personal data, we will notify the relevant
              supervisory authority within 72 hours (as UK GDPR requires) and, where the risk is significant, we will notify
              you directly as soon as we reasonably can.
            </p>
          </Section>

          {/* 10 - Your rights */}
          <Section number="10" title="Your rights">
            <p>
              Depending on where you live, you have a set of rights over the personal data we hold about you.
              We honour these globally where we reasonably can.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 my-6">
              <RightCard letter="a" title="Access" desc="Ask for a copy of the personal data we hold about you." />
              <RightCard letter="b" title="Rectification" desc="Ask us to correct anything that's wrong or out of date." />
              <RightCard letter="c" title="Erasure" desc="Ask us to delete your account and the data we hold on you." />
              <RightCard letter="d" title="Restriction" desc="Ask us to pause processing while a dispute is being sorted out." />
              <RightCard letter="e" title="Portability" desc="Receive your data in a portable, machine-readable format." />
              <RightCard letter="f" title="Object" desc="Object to processing based on our legitimate interests." />
              <RightCard letter="g" title="Withdraw consent" desc="Pull back any consent you've given, at any time." />
              <RightCard letter="h" title="Complain" desc="Lodge a complaint with your local data protection authority." />
            </div>
            <p>
              To exercise any of these rights as an account holder, write to{' '}
              <a href="mailto:shiftly@seedcraft.co" className="font-medium" style={{ color: '#FF1F7D' }}>
                shiftly@seedcraft.co
              </a>
              . We'll respond within 30 days with no charge and no need to justify your request.
            </p>
            <p>
              If you're a staff member added to Shiftly by a business, your employer is the data controller. Please contact them
              first. We'll support them in responding to your request.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">UK users</p>
              <p className="text-sm text-gray-700">
                You can complain to the Information Commissioner's Office at{' '}
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="underline">ico.org.uk</a>.
                In the EEA, contact your local data protection authority.
              </p>
            </div>
          </Section>

          {/* 11 - Young workers */}
          <Section number="11" title="Young workers">
            <p>
              Shiftly accounts are for businesses, and account holders must be 18 or older.
            </p>
            <p>
              We recognise that hospitality and retail employ workers from age 16 in many UK roles. Where a business adds a
              16- or 17-year-old staff member to Shiftly, the business must ensure their participation complies with UK
              employment and data protection law, and that the staff member (or their parent/guardian where appropriate) is
              informed about how their data is used.
            </p>
            <p>
              We don't knowingly process data on anyone under 16. If you believe a child under 16 has been added to Shiftly,
              please contact us and we'll investigate.
            </p>
          </Section>

          {/* 12 - Cookies */}
          <Section number="12" title="Cookies & similar things">
            <p>
              We use a small number of cookies to keep you signed in, remember your preferences, and measure basic site performance.
              We don't use advertising cookies, cross-site trackers, or third-party analytics tools that build profiles on you.
            </p>
            <p>
              You can block or delete cookies through your browser settings. If you do, some parts of Shiftly may stop working properly.
            </p>
          </Section>

          {/* 13 - Changes */}
          <Section number="13" title="Changes to this policy">
            <p>
              When we make material changes, we'll notify active users by email or in-app before the change takes effect.
              Minor updates will just show a new &ldquo;last updated&rdquo; date.
            </p>
            <p>
              If Shiftly is ever incorporated separately, sold, or restructured, we will tell you before any personal data moves
              and give you the chance to delete your account first.
            </p>
          </Section>

          {/* 14 - Governing law */}
          <Section number="14" title="Governing law">
            <p>
              This policy is governed by the laws of Scotland. Any disputes shall be subject to the exclusive jurisdiction of
              the Scottish courts, without prejudice to your rights as a consumer under the laws of your own country.
            </p>
          </Section>

          {/* Contact card */}
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-8 text-center mt-12">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#FF1F7D' }}>
              Get in touch
            </p>
            <h3 className="text-2xl font-cal text-gray-900 mb-3">Questions?</h3>
            <p className="text-gray-600 mb-5 max-w-md mx-auto">
              Write to us. Emails don't go into a black hole — a real person on the team reads every one.
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

type DataCardProps = { tag: string; title: string; desc: string }
function DataCard({ tag, title, desc }: DataCardProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#FF1F7D' }}>{tag}</p>
      <p className="font-bold text-gray-900 mb-1.5 text-sm">{title}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  )
}

type CommitmentCardProps = { title: string; desc: string }
function CommitmentCard({ title, desc }: CommitmentCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="font-bold text-gray-900 mb-1.5 text-sm font-cal">{title}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  )
}

type VendorCardProps = { name: string; letter: string; role: string; desc: string; href: string }
function VendorCard({ name, letter, role, desc, href }: VendorCardProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold font-cal"
        style={{ background: '#FF1F7D' }}
      >
        {letter}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <p className="font-bold text-gray-900 text-sm">{name}</p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-1">{desc}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: '#FF1F7D' }}>
          Privacy policy →
        </a>
      </div>
    </div>
  )
}

type RightCardProps = { letter: string; title: string; desc: string }
function RightCard({ letter, title, desc }: RightCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0 text-sm font-bold font-cal" style={{ color: '#FF1F7D' }}>
        {letter}
      </div>
      <div>
        <p className="font-bold text-gray-900 mb-0.5 text-sm">{title}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}