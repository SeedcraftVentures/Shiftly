import Link from 'next/link'
import Nav from '@/app/components/Nav'
import Footer from '@/app/components/Footer'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'
import JobFilters from './JobFilters'
import {
  searchListings, getFacets, formatPay, showsPay,
  ROLE_LABEL, VENUE_LABEL, CONTRACT_LABEL,
} from '@/lib/jobs/query'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Hospitality Jobs in Scotland | Powered by Shiftly',
  description:
    'Bar, kitchen, waiting and management roles across Scottish hospitality. See the pay before you apply.',
}

function timeAgo(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return `${Math.floor(days / 7)} weeks ago`
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      {children}
    </span>
  )
}

function JobCard({ job }) {
  const pay = formatPay(job)
  return (
    // Cards open our own detail page, not the source. It keeps the visit on
    // Shiftly, gives each role a crawlable URL, and the apply link lives there.
    <Link
      href={`/jobs/${job.slug}`}
      className="group block bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-cal text-lg sm:text-xl text-gray-900 leading-snug group-hover:text-pink-600 transition-colors">
            {job.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {job.employer_name}
            {job.city ? <span className="text-gray-400"> · {job.city}</span> : null}
          </p>
        </div>

        {/* Pay is stated plainly, or its absence is. Naming the gap is more
            honest than hiding the listing, and it puts quiet pressure on
            employers who don't disclose. */}
        {pay ? (
          <span className="shrink-0 inline-flex items-center rounded-full bg-pink-50 border border-pink-200 px-3 py-1.5 text-sm font-semibold text-pink-700">
            {pay}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400">
            Pay not disclosed
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* 'other' means we couldn't classify it, so show nothing rather than leak
            an internal value onto the card. */}
        {job.role_category && job.role_category !== 'other' && <Tag>{ROLE_LABEL[job.role_category]}</Tag>}
        {job.venue_type && job.venue_type !== 'other' && <Tag>{VENUE_LABEL[job.venue_type] || job.venue_type}</Tag>}
        {job.contract_type && <Tag>{CONTRACT_LABEL[job.contract_type] || job.contract_type}</Tag>}
        {job.is_agency && <Tag>Agency</Tag>}
        <span className="ml-auto text-xs text-gray-400">{timeAgo(job.posted_at)}</span>
      </div>
    </Link>
  )
}

function Pagination({ page, pages, params }) {
  if (pages <= 1) return null
  const href = (p) => {
    const next = new URLSearchParams(params)
    if (p > 1) next.set('page', String(p))
    else next.delete('page')
    const qs = next.toString()
    return `/jobs${qs ? `?${qs}` : ''}`
  }
  // Numbered pages, not infinite scroll, so each page stays crawlable.
  const window = []
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) window.push(p)

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300">
          ← Prev
        </Link>
      )}
      {window.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            p === page ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {p}
        </Link>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300">
          Next →
        </Link>
      )}
    </nav>
  )
}

export default async function JobsPage({ searchParams }) {
  const sp = await searchParams
  const filters = {
    q: sp.q || '',
    role: sp.role || '',
    venue: sp.venue || '',
    city: sp.city || '',
    contract: sp.contract || '',
    paid: sp.paid === '1',
    page: sp.page || 1,
  }

  const [list, facets] = await Promise.all([searchListings(filters), getFacets(filters)])
  const stats = facets.stats || {}
  const cities = Object.entries(facets.city || {}).sort((a, b) => b[1] - a[1]).map(([c]) => c)
  const paramString = Object.fromEntries(Object.entries(sp).filter(([, v]) => v))
  const payPct = stats.total ? Math.round((stats.showingPay / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav currentPage="jobs" />

      <HeatGlow as="header" palette={SHIFTLY_PALETTE} className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full" />
            <span className="text-sm font-medium text-white">Powered by Shiftly</span>
          </div>
          <h1 className="font-cal text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight max-w-3xl">
            Hospitality jobs, with the pay up front.
          </h1>
          <p className="mt-5 text-lg text-white/85 max-w-xl">
            Bar, kitchen, waiting and management roles across Scotland. We show the rate wherever
            the employer has given one, and say so plainly when they haven&apos;t.
          </p>

          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {[
              [stats.total ?? 0, 'Live roles'],
              [stats.employers ?? 0, 'Venues hiring'],
              [stats.addedThisWeek ?? 0, 'Added this week'],
              [`${payPct}%`, 'Show their pay'],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="font-cal text-3xl lg:text-4xl text-white">{value}</div>
                <div className="text-sm text-white/70">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </HeatGlow>

      <main className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="sticky top-4 z-30 -mt-8 mb-8 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur p-4 shadow-sm">
            <JobFilters facets={facets} cities={cities} />
          </div>

          <div className="mb-6 flex items-baseline justify-between gap-4">
            <p className="text-sm text-gray-500">
              {list.total === 0
                ? 'No roles match those filters'
                : `Showing ${(list.page - 1) * list.perPage + 1}–${Math.min(list.page * list.perPage, list.total)} of ${list.total}`}
            </p>
            <Link href="/waitlist" className="text-sm font-medium text-pink-600 hover:text-pink-700 underline underline-offset-4">
              Hiring? Post a role free →
            </Link>
          </div>

          {list.error ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <p className="text-gray-600">Couldn&apos;t load jobs just now. Please try again shortly.</p>
            </div>
          ) : list.results.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
              <p className="font-cal text-2xl text-gray-900">Nothing here yet</p>
              <p className="mt-2 text-gray-600">Try widening your filters, or clear them to see everything.</p>
              <Link href="/jobs" className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {list.results.map((job) => <JobCard key={job.listing_id} job={job} />)}
            </div>
          )}

          <Pagination page={list.page} pages={list.pages} params={paramString} />

          {/* Adzuna's terms require visible attribution with a link back. */}
          <p className="mt-12 text-center text-xs text-gray-400">
            Some roles are sourced via{' '}
            <a href="https://www.adzuna.co.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              Jobs by Adzuna
            </a>
            . Applications are handled by the employer or original job board.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
