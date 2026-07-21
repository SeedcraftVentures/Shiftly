import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/app/components/Nav'
import Footer from '@/app/components/Footer'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'
import {
  getListingForPage, getRelatedListings, formatPay, tidyExcerpt,
  ROLE_LABEL, VENUE_LABEL, CONTRACT_LABEL,
} from '@/lib/jobs/query'
import { jobPostingSchema } from '@/lib/jobs/jsonld'

export const dynamic = 'force-dynamic'

// Aggregated feeds give a capped snippet, not the advert. Anything at or near
// the cap is treated as an excerpt so we never present a truncated blurb as the
// full ad. The reader is sent to the source instead.
const SNIPPET_LIMIT = 520
const isExcerpt = (job) => !job.is_native && (job.description || '').length < SNIPPET_LIMIT

export async function generateMetadata({ params }) {
  const { slug } = await params
  const job = await getListingForPage(slug)
  if (!job) return { title: 'Job not found | Shiftly Jobs' }
  const where = job.city ? ` in ${job.city}` : ''

  // Closed roles stay indexable, that is the whole point of keeping them at 200,
  // but the title has to say so. A searcher who lands on a filled role and only
  // finds out after clicking apply is worse served than one told up front.
  if (job.isExpired) {
    return {
      title: `${job.title} at ${job.employer_name}${where} (closed) | Shiftly Jobs`,
      description: `This ${job.title} role at ${job.employer_name}${where} is no longer taking applications. See similar hospitality jobs that are still open on Shiftly Jobs.`,
    }
  }

  const pay = formatPay(job)
  return {
    title: `${job.title} at ${job.employer_name}${where} | Shiftly Jobs`,
    description: pay
      ? `${job.title} at ${job.employer_name}${where}. ${pay}. Apply via Shiftly Jobs.`
      : `${job.title} at ${job.employer_name}${where}. See the role and apply via Shiftly Jobs.`,
  }
}

// Bare value. The "Posted" label lives on the row, so prefixing it here would
// render "Posted → Posted today".
function timeAgo(iso) {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  if (d <= 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return `${Math.floor(d / 7)} week${d < 14 ? '' : 's'} ago`
}

function ApplyButton({ job, className = '' }) {
  return (
    <a
      href={job.apply_url || job.source_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#FF1F7D] px-7 py-3.5 font-medium text-white hover:bg-pink-600 hover:-translate-y-0.5 transition-all shadow-sm ${className}`}
    >
      Apply on site
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
      </svg>
    </a>
  )
}

function Row({ label, children }) {
  if (!children) return null
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{children}</dd>
    </div>
  )
}

export default async function JobDetailPage({ params }) {
  const { slug } = await params
  const job = await getListingForPage(slug)
  if (!job) notFound()

  const closed = job.isExpired
  // A closed page earns its keep by being a hub, so it gets a wider set of live
  // roles to send the visitor on to. getRelatedListings is live-only, so nothing
  // expired can surface here.
  const [related, pay] = [await getRelatedListings(job, closed ? 8 : 4), formatPay(job)]
  const excerpt = isExcerpt(job)
  const body = excerpt ? tidyExcerpt(job.description) : job.description || ''
  const paragraphs = body.split(/\n{2,}/).filter(Boolean)

  // Null on closed roles and on capped aggregator snippets. Both cases are
  // enforced inside the builder so the gate cannot drift from the page.
  const schema = jobPostingSchema(job, { isExpired: closed })

  return (
    <div className="min-h-screen bg-gray-50">
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <Nav currentPage="jobs" />

      <HeatGlow as="header" palette={SHIFTLY_PALETTE} className="pt-32 pb-14 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white mb-6">
            ← All hospitality jobs
          </Link>
          <h1 className="font-cal text-3xl sm:text-4xl lg:text-5xl text-white leading-[1.1] tracking-tight break-words">
            {job.title}
          </h1>
          <p className="mt-4 text-lg text-white/85 break-words">
            {job.employer_name}
            {job.city ? <span className="text-white/60"> · {job.city}</span> : null}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {closed ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-5 py-2.5 text-sm font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-white/60" aria-hidden="true" />
                No longer accepting applications
              </span>
            ) : (
              <ApplyButton job={job} className="!bg-white !text-gray-900 hover:!bg-gray-100" />
            )}
            {pay ? (
              <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-4 py-2 text-sm font-semibold text-white">
                {pay}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white/70">
                Pay not disclosed
              </span>
            )}
          </div>
        </div>
      </HeatGlow>

      <main className="px-6 py-12">
        <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Say it before the description, not after. Someone skim-reading a
                role they cannot apply for should find that out in the first line. */}
            {closed && (
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="font-cal text-xl text-gray-900">This role has closed</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
                  {job.employer_name} is no longer taking applications for this position. It has
                  either been filled or withdrawn. The details below are kept for reference.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {job.city && (
                    <Link
                      href={`/jobs?city=${encodeURIComponent(job.city)}`}
                      className="inline-flex items-center rounded-full bg-[#FF1F7D] px-5 py-2.5 text-sm font-medium text-white hover:bg-pink-600 transition-colors"
                    >
                      Open jobs in {job.city}
                    </Link>
                  )}
                  {job.role_category && (
                    <Link
                      href={`/jobs?role=${encodeURIComponent(job.role_category)}`}
                      className="inline-flex items-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
                    >
                      All {(ROLE_LABEL[job.role_category] || 'similar').toLowerCase()} roles
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-7 sm:p-9">
              <h2 className="font-cal text-2xl text-gray-900">About this role</h2>

              {/* break-words: employer copy is arbitrary text and can contain a
                  very long unbroken token (a URL, a reference code, or someone
                  leaning on one key). Without a break opportunity it overflows
                  the card and pushes the layout sideways. */}
              <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-gray-700 break-words">
                {paragraphs.length ? (
                  paragraphs.map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <p className="text-gray-500">
                    No description was provided with this listing. The full advert is on the
                    employer&apos;s site.
                  </p>
                )}
              </div>

              {/* Honesty over polish: aggregator feeds cap the description, so we say
                  it's an extract rather than dressing a snippet up as the whole ad. */}
              {excerpt && paragraphs.length > 0 && (
                <div className="mt-7 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                  <p className="text-sm text-gray-600">
                    This is an extract. The employer publishes the full advert, including hours,
                    benefits and how to apply, on their own site.
                  </p>
                </div>
              )}

              {!closed && (
                <div className="mt-8 pt-7 border-t border-gray-100">
                  <ApplyButton job={job} />
                  <p className="mt-3 text-xs text-gray-400">
                    Applications are handled by {job.is_agency ? 'the agency' : 'the employer'}, not by Shiftly.
                  </p>
                </div>
              )}
            </div>

            {related.length > 0 && (
              <div className="mt-8">
                <h2 className="font-cal text-2xl text-gray-900 mb-4">
                  {closed ? 'Roles open now' : 'More roles'}{job.city ? ` in ${job.city}` : ''}
                </h2>
                <div className="grid gap-3">
                  {related.map((r) => {
                    const rp = formatPay(r)
                    return (
                      <Link
                        key={r.listing_id}
                        href={`/jobs/${r.slug}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{r.title}</p>
                          <p className="text-sm text-gray-500 truncate">{r.employer_name}</p>
                        </div>
                        <span className={`shrink-0 text-sm font-semibold ${rp ? 'text-pink-600' : 'text-gray-300'}`}>
                          {rp || 'Not shown'}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="font-cal text-lg text-gray-900 mb-2">At a glance</h2>
              <dl>
                <Row label="Pay">
                  {pay || <span className="text-gray-400 font-normal">Not disclosed</span>}
                </Row>
                <Row label="Role">{ROLE_LABEL[job.role_category] || null}</Row>
                <Row label="Venue">{job.venue_type !== 'other' ? VENUE_LABEL[job.venue_type] : null}</Row>
                <Row label="Contract">{CONTRACT_LABEL[job.contract_type] || null}</Row>
                <Row label="Location">{job.locality ? `${job.locality}, ${job.city}` : job.city}</Row>
                <Row label="Employer">{job.brand || job.employer_name}</Row>
                <Row label="Posted">{timeAgo(job.posted_at)}</Row>
                <Row label="Status">{closed ? 'Closed' : null}</Row>
              </dl>

              {closed ? (
                <Link
                  href="/jobs"
                  className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-[#FF1F7D] px-7 py-3.5 font-medium text-white hover:bg-pink-600 transition-colors"
                >
                  Browse open jobs
                </Link>
              ) : (
                <ApplyButton job={job} className="mt-6 w-full" />
              )}

              {job.attribution && (
                <p className="mt-4 text-xs text-gray-400">
                  Sourced via{' '}
                  <a href="https://www.adzuna.co.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                    {job.attribution}
                  </a>
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}
