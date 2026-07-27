'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { ROLES, VENUES, CONTRACTS } from '@/lib/jobs/taxonomy'

// Horizontal filter bar rather than a sidebar: hospitality traffic is
// overwhelmingly mobile, and a sidebar collapses badly on a phone.
export default function JobFilters({ facets = {}, cities = [] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')

  // Filters live in the URL so every view is shareable, back/forward works, and
  // the page stays server-rendered and indexable.
  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page') // any filter change returns to page 1
      router.push(`/jobs?${next.toString()}`)
    },
    [params, router]
  )

  const count = (group, key) => facets?.[group]?.[key] || 0
  const active = (key) => params.get(key) || ''

  const select =
    'appearance-none bg-white border border-gray-200 rounded-full pl-4 pr-9 py-2.5 text-sm font-medium text-gray-900 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 cursor-pointer'

  const Chevron = () => (
    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  )

  const Dropdown = ({ name, label, options, group }) => (
    <div className="relative">
      <label className="sr-only" htmlFor={`filter-${name}`}>{label}</label>
      <select id={`filter-${name}`} className={select} value={active(name)} onChange={(e) => setParam(name, e.target.value)}>
        <option value="">{label}</option>
        {options.map(([value, text]) => {
          const n = count(group, value)
          return (
            <option key={value} value={value} disabled={n === 0}>
              {text}{n ? ` (${n})` : ''}
            </option>
          )
        })}
      </select>
      <Chevron />
    </div>
  )

  const paid = params.get('paid') === '1'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        className="relative flex-1 min-w-[220px]"
        onSubmit={(e) => { e.preventDefault(); setParam('q', q.trim()) }}
      >
        <label className="sr-only" htmlFor="filter-q">Search jobs</label>
        <input
          id="filter-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search role or venue…"
          className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500"
        />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a1 1 0 01-1.42 1.42l-3.08-3.08A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
      </form>

      <Dropdown name="role" label="Any role" options={ROLES} group="role" />
      <Dropdown name="venue" label="Any venue" options={VENUES} group="venue" />
      <Dropdown name="contract" label="Any contract" options={CONTRACTS} group="contract" />
      <Dropdown name="city" label="Anywhere" options={cities.map((c) => [c, c])} group="city" />

      {/* The transparency toggle. Counts only employer-stated pay, because an
          aggregator's estimate is not disclosure. */}
      <button
        type="button"
        onClick={() => setParam('paid', paid ? '' : '1')}
        aria-pressed={paid}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium border transition-colors ${
          paid
            ? 'bg-pink-500 border-pink-500 text-white'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${paid ? 'bg-white' : 'bg-pink-500'}`} />
        Shows pay
      </button>

      {[...params.keys()].some((k) => k !== 'page') && (
        <button type="button" onClick={() => router.push('/jobs')} className="text-sm font-medium text-gray-500 hover:text-gray-900 underline underline-offset-4">
          Clear
        </button>
      )}
    </div>
  )
}
