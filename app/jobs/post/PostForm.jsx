'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ROLES, VENUES, CONTRACTS, SHIFT_PATTERNS, PAY_PERIODS,
  completeness, FEATURED_DAYS,
} from '@/lib/jobs/taxonomy'

// The form imports the SAME completeness() the API uses, so the progress meter
// can never promise a Featured spell the server then refuses to grant.

const EMPTY = {
  employer_name: '', city: '', venue_type: '', website: '', contact_email: '',
  title: '', role_category: '', contract_type: '',
  pay_min: '', pay_max: '', pay_period: 'hourly',
  shift_pattern: [], description: '', benefits: '',
  apply_url: '', apply_email: '',
  accepted_terms: false, marketing_consent: false,
}

const label = 'block text-sm font-medium text-gray-700 mb-1.5'
const input =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[15px] text-gray-900 ' +
  'placeholder:text-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 transition'

function Field({ id, children, hint, required }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {children}
        {required && <span className="text-[#FF1F7D] ml-0.5" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-1.5 -mt-1">{hint}</p>}
    </div>
  )
}

export default function PostForm() {
  const router = useRouter()
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((p) => ({ ...p, [k]: v }))
  }

  const toggleShift = (key) =>
    setF((p) => ({
      ...p,
      shift_pattern: p.shift_pattern.includes(key)
        ? p.shift_pattern.filter((x) => x !== key)
        : [...p.shift_pattern, key],
    }))

  // Same shape the API scores, so the two agree by construction. shift_pattern
  // stays an array throughout, matching the text[] column it lands in.
  const scored = useMemo(() => completeness(f), [f])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.missing?.length ? `Still needed: ${json.missing.map((m) => m.label).join(', ')}` : json.error)
        return
      }
      setDone(json)
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="font-cal text-2xl text-gray-900">Your job is live</h2>
        {done.featured ? (
          <p className="mt-3 text-[15px] text-gray-600">
            You filled in everything, so it is featured at the top of the board for the
            next {done.featured_days} days.
          </p>
        ) : (
          <p className="mt-3 text-[15px] text-gray-600">
            It is on the board now, ordered by date posted.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => router.push(`/jobs/${done.slug}`)}
            className="rounded-full bg-[#FF1F7D] px-6 py-3 font-medium text-white hover:bg-pink-600 transition-colors"
          >
            View your listing
          </button>
          <button
            onClick={() => { setDone(null); setF(EMPTY) }}
            className="rounded-full border border-gray-200 px-6 py-3 font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            Post another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Progress. Deliberately shows what is LEFT rather than a bare percentage,
          because a named missing field is actionable and a number is not. */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-cal text-lg text-gray-900">
            {scored.featured ? 'Ready, and it will be featured' : 'Transparent listing'}
          </h2>
          <span className="text-sm font-semibold text-gray-500">{scored.earned}/{scored.total}</span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#FF1F7D] transition-all duration-300"
            style={{ width: `${(scored.earned / scored.total) * 100}%` }}
          />
        </div>
        <ul className="mt-4 space-y-1.5">
          {scored.bonus.map((b) => (
            <li key={b.key} className={`text-sm flex items-center gap-2 ${b.done ? 'text-gray-900' : 'text-gray-400'}`}>
              <span className={`w-4 h-4 shrink-0 rounded-full grid place-items-center text-[10px] ${b.done ? 'bg-[#FF1F7D] text-white' : 'bg-gray-100'}`}>
                {b.done ? '✓' : ''}
              </span>
              {b.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-500">
          Fill in all four and your listing is featured at the top of the board for {FEATURED_DAYS} days.
          Featured spots are earned, never sold.
        </p>
      </div>

      {/* Venue */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-5">
        <h2 className="font-cal text-xl text-gray-900">Your venue</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Field id="employer_name" required>Venue name</Field>
            <input id="employer_name" className={input} value={f.employer_name} onChange={set('employer_name')} placeholder="The Bothy" />
          </div>
          <div>
            <Field id="city" required>Town or city</Field>
            <input id="city" className={input} value={f.city} onChange={set('city')} placeholder="Glasgow" />
          </div>
          <div>
            <Field id="venue_type" required>Venue type</Field>
            <select id="venue_type" className={input} value={f.venue_type} onChange={set('venue_type')}>
              <option value="">Choose one</option>
              {VENUES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Field id="website">Website</Field>
            <input id="website" className={input} value={f.website} onChange={set('website')} placeholder="https://" />
          </div>
          <div className="sm:col-span-2">
            <Field id="contact_email" required hint="We use this to set up your Shiftly account. It is not shown on the listing.">
              Contact email
            </Field>
            <input id="contact_email" type="email" className={input} value={f.contact_email} onChange={set('contact_email')} />
          </div>
        </div>
      </div>

      {/* Role */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-5">
        <h2 className="font-cal text-xl text-gray-900">The role</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Field id="title" required>Job title</Field>
            <input id="title" className={input} value={f.title} onChange={set('title')} placeholder="Chef de Partie" />
          </div>
          <div>
            <Field id="role_category" required>Role</Field>
            <select id="role_category" className={input} value={f.role_category} onChange={set('role_category')}>
              <option value="">Choose one</option>
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Field id="contract_type" required>Contract</Field>
            <select id="contract_type" className={input} value={f.contract_type} onChange={set('contract_type')}>
              <option value="">Choose one</option>
              {CONTRACTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Pay and hours: the reason this board exists */}
      <div className="rounded-2xl border-2 border-pink-100 bg-white p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="font-cal text-xl text-gray-900">Pay and hours</h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Both are required. Every listing here shows them, which is why people trust the board.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <Field id="pay_min" required>Pay from</Field>
            <input id="pay_min" type="number" min="0" step="0.01" className={input} value={f.pay_min} onChange={set('pay_min')} placeholder="12.60" />
          </div>
          <div>
            <Field id="pay_max" hint="Optional, but a range counts toward featured.">Pay to</Field>
            <input id="pay_max" type="number" min="0" step="0.01" className={input} value={f.pay_max} onChange={set('pay_max')} placeholder="14.00" />
          </div>
          <div>
            <Field id="pay_period" required>Period</Field>
            <select id="pay_period" className={input} value={f.pay_period} onChange={set('pay_period')}>
              {PAY_PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className={label}>Shift pattern<span className="text-[#FF1F7D] ml-0.5">*</span></span>
          <p className="text-xs text-gray-500 mb-2 -mt-1">Pick every pattern that applies. No other job board asks for this.</p>
          <div className="flex flex-wrap gap-2">
            {SHIFT_PATTERNS.map(([v, l]) => {
              const on = f.shift_pattern.includes(v)
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() => toggleShift(v)}
                  aria-pressed={on}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    on ? 'border-[#FF1F7D] bg-[#FF1F7D] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {l}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Detail */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-5">
        <h2 className="font-cal text-xl text-gray-900">Detail</h2>
        <div>
          <Field id="description" required hint="400 characters or more counts toward featured.">Description</Field>
          <textarea id="description" rows={7} className={input} value={f.description} onChange={set('description')} />
          <p className="mt-1 text-xs text-gray-400">{f.description.trim().length} characters</p>
        </div>
        <div>
          <Field id="benefits" hint="Meals on shift, tips, training, staff discount.">Benefits or perks</Field>
          <textarea id="benefits" rows={3} className={input} value={f.benefits} onChange={set('benefits')} />
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Field id="apply_url" hint="One of these two is required.">Application link</Field>
            <input id="apply_url" className={input} value={f.apply_url} onChange={set('apply_url')} placeholder="https://" />
          </div>
          <div>
            <Field id="apply_email">Or an email to apply to</Field>
            <input id="apply_email" type="email" className={input} value={f.apply_email} onChange={set('apply_email')} />
          </div>
        </div>
      </div>

      {/* Consent. Two separate boxes, both unticked. Bundling marketing consent
          into terms acceptance makes the consent invalid, and sole traders count
          as individuals under PECR. */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-4">
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" checked={f.accepted_terms} onChange={set('accepted_terms')} className="mt-1 w-4 h-4 accent-[#FF1F7D]" />
          <span className="text-sm text-gray-700">
            I accept the <a href="/terms" className="underline hover:text-gray-900">terms</a> and confirm this is a
            genuine vacancy at a business I am authorised to post for.
            <span className="text-[#FF1F7D]">*</span>
          </span>
        </label>
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" checked={f.marketing_consent} onChange={set('marketing_consent')} className="mt-1 w-4 h-4 accent-[#FF1F7D]" />
          <span className="text-sm text-gray-700">
            Send me occasional emails about Shiftly rota software. Optional, and you can stop them at any time.
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !scored.valid || !f.accepted_terms}
          className="rounded-full bg-[#FF1F7D] px-8 py-3.5 font-medium text-white hover:bg-pink-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Posting…' : 'Post this job'}
        </button>
        {!scored.valid && (
          <p className="text-sm text-gray-500">
            Still needed: {scored.missing.map((m) => m.label).join(', ')}
          </p>
        )}
      </div>
    </form>
  )
}
