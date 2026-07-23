import Link from 'next/link'
import JobsNav from '@/app/jobs/JobsNav'
import Footer from '@/app/components/Footer'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'
import JobFilters from './JobFilters'
import IndustryTabs from './IndustryTabs'
import Badges from './Badges'
import {
  searchListings, getFacets, formatPay,
  ROLE_LABEL_ALL, VENUE_LABEL, CONTRACT_LABEL, rolesForIndustry, citySlug,
} from '@/lib/jobs/query'

// The one board, rendered for /jobs (both industries), /jobs/hospitality and
// /jobs/retail. `industry` is fixed by the route (null = both); the toggle
// switches between the routes. Every listing link points at /jobs/[slug], which
// is industry-agnostic, so a job has one canonical detail URL.

// Per-board copy and filter shape. 'all' is the combined /jobs view.
const BOARDS = {
  all: {
    basePath: '/jobs',
    h1: 'Hospitality and retail jobs, pay up front.',
    blurb: 'Real roles across Scottish hospitality and retail. We show the rate wherever the employer has given one, and say so plainly when they have not.',
    showVenue: true,
  },
  hospitality: {
    basePath: '/jobs/hospitality',
    h1: 'Hospitality jobs, with the pay up front.',
    blurb: 'Bar, kitchen, waiting and management roles across Scotland. We show the rate wherever the employer has given one, and say so plainly when they have not.',
    showVenue: true,
  },
  retail: {
    basePath: '/jobs/retail',
    h1: 'Retail jobs, with the pay up front.',
    blurb: 'Shop floor, checkout, stock and store management roles across Scotland. We show the rate wherever the employer has given one, and say so plainly when they have not.',
    showVenue: false, // venue_type is a hospitality axis; retail does not use it
  },
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

function JobCard({ job, showVenue }) {
  const pay = formatPay(job)
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group block bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-cal text-lg sm:text-xl text-gray-900 leading-snug group-hover:text-pink-600 transition-colors break-words">
            {job.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 break-words">
            {job.employer_name}
            {job.city ? <span className="text-gray-400"> · {job.city}</span> : null}
          </p>
        </div>
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

      <Badges job={job} className="mt-3" />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {job.role_category && job.role_category !== 'other' && <Tag>{ROLE_LABEL_ALL[job.role_category] || job.role_category}</Tag>}
        {showVenue && job.venue_type && job.venue_type !== 'other' && <Tag>{VENUE_LABEL[job.venue_type] || job.venue_type}</Tag>}
        {job.contract_type && <Tag>{CONTRACT_LABEL[job.contract_type] || job.contract_type}</Tag>}
        {job.is_agency && <Tag>Agency</Tag>}
        <span className="ml-auto text-xs text-gray-400">{timeAgo(job.posted_at)}</span>
      </div>
    </Link>
  )
}

function Pagination({ page, pages, params, basePath }) {
  if (pages <= 1) return null
  const href = (p) => {
    const next = new URLSearchParams(params)
    if (p > 1) next.set('page', String(p))
    else next.delete('page')
    const qs = next.toString()
    return `${basePath}${qs ? `?${qs}` : ''}`
  }
  const win = []
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) win.push(p)
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300">← Prev</Link>
      )}
      {win.map((p) => (
        <Link key={p} href={href(p)} aria-current={p === page ? 'page' : undefined}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${p === page ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
          {p}
        </Link>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300">Next →</Link>
      )}
    </nav>
  )
}

/**
 * @param {object} props
 * @param {('hospitality'|'retail'|null)} props.industry  fixed by the route (main boards)
 * @param {string|null} props.city       stored city value (town pages)
 * @param {object} props.searchParams     already-awaited URL params
 */
export default async function JobBoard({ industry = null, city = null, searchParams = {} }) {
  const sp = searchParams
  const townMode = Boolean(city)

  // On a town page the industry comes from the query (the toggle stays on the
  // town). On a main board it is fixed by the route.
  const activeIndustry = townMode
    ? (['hospitality', 'retail'].includes(sp.industry) ? sp.industry : null)
    : industry

  const basePath = townMode ? `/jobs/in/${citySlug(city)}` : BOARDS[industry || 'all'].basePath
  const showVenue = activeIndustry !== 'retail'
  const h1 = townMode
    ? `${activeIndustry === 'retail' ? 'Retail' : activeIndustry === 'hospitality' ? 'Hospitality' : 'Hospitality and retail'} jobs in ${city}`
    : BOARDS[industry || 'all'].h1
  const blurb = townMode
    ? `Every role we can find in ${city}, close to home. We show the pay wherever the employer has given one.`
    : BOARDS[industry || 'all'].blurb

  // Toggle destinations. Town pages keep you on the town via a query param;
  // main boards switch route.
  const toggleHrefs = townMode
    ? { all: basePath, hospitality: `${basePath}?industry=hospitality`, retail: `${basePath}?industry=retail` }
    : { all: '/jobs', hospitality: '/jobs/hospitality', retail: '/jobs/retail' }

  const filters = {
    q: sp.q || '',
    role: sp.role || '',
    venue: sp.venue || '',
    city: city || sp.city || '', // town pages fix the city
    contract: sp.contract || '',
    paid: sp.paid === '1',
    livingWage: sp.lw === '1',
    industry: activeIndustry || '',
    page: sp.page || 1,
  }

  const [list, facets] = await Promise.all([searchListings(filters), getFacets(filters)])
  const stats = facets.stats || {}
  const cities = Object.entries(facets.city || {}).sort((a, b) => b[1] - a[1]).map(([c]) => c)
  const paramString = Object.fromEntries(Object.entries(sp).filter(([, v]) => v))
  const payPct = stats.total ? Math.round((stats.showingPay / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <JobsNav />

      <HeatGlow as="header" palette={SHIFTLY_PALETTE} className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full" />
            <span className="text-sm font-medium text-white">Powered by Shiftly</span>
          </div>
          <h1 className="font-cal text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight max-w-3xl">
            {h1}
          </h1>
          <p className="mt-5 text-lg text-white/85 max-w-xl">{blurb}</p>

          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {[
              [stats.total ?? 0, 'Live roles'],
              [stats.employers ?? 0, 'Employers hiring'],
              [`${payPct}%`, 'Show their pay'],
              [stats.livingWage ?? 0, 'Meet living wage'],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="font-cal text-3xl lg:text-4xl text-white">{value}</div>
                <div className="text-sm text-white/70">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </HeatGlow>

      <main className="px-6 pt-10 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Industry toggle sits above the filters: it is the primary axis. */}
          <IndustryTabs active={activeIndustry} hrefs={toggleHrefs} />

          <div className="sticky top-4 z-30 mb-8 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur p-4 shadow-sm">
            <JobFilters facets={facets} cities={cities} basePath={basePath} roles={rolesForIndustry(activeIndustry)} showVenue={showVenue} />
          </div>

          <div className="mb-6 flex items-baseline justify-between gap-4">
            <p className="text-sm text-gray-500">
              {list.total === 0
                ? 'No roles match those filters'
                : `Showing ${(list.page - 1) * list.perPage + 1}–${Math.min(list.page * list.perPage, list.total)} of ${list.total}`}
            </p>
            <Link href="/jobs/post" className="text-sm font-medium text-pink-600 hover:text-pink-700 underline underline-offset-4">
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
              <Link href={basePath} className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {list.results.map((job) => <JobCard key={job.listing_id} job={job} showVenue={showVenue} />)}
            </div>
          )}

          <Pagination page={list.page} pages={list.pages} params={paramString} basePath={basePath} />

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
