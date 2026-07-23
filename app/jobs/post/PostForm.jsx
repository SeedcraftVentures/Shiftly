'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  VENUES, CONTRACTS, SHIFT_PATTERNS, PAY_PERIODS,
  completeness, FEATURED_DAYS, EMAIL_RE,
} from '@/lib/jobs/taxonomy'

// The form imports the SAME completeness() the API uses, so the progress meter
// can never promise a Featured spell the server then refuses to grant.

const EMPTY = {
  industry: 'hospitality',
  employer_name: '', city: '', locality: '', postcode: '', venue_type: '', website: '',
  contact_email: '',
  title: '', contract_type: '',
  pay_min: '', pay_max: '', pay_period: 'hourly',
  shift_pattern: [], description: '', benefits: '',
  apply_url: '', apply_email: '',
  accepted_terms: false,
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[15px] text-gray-900 ' +
  'placeholder:text-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 transition'

/**
 * Label, then control, then hint.
 *
 * The hint sits BELOW the control on purpose. When it sat between the label and
 * the control, any field carrying a hint pushed its own input down while its
 * neighbour in the same grid row stayed put, so the columns never lined up.
 * Labels are uniform single lines, so every control in a row starts at the same
 * height regardless of which ones have hints.
 */
// The optional waitlist upsell. Fetches the live tier so the copy matches how
// many founder slots remain, and fails soft to the generic offer.
function WaitlistOffer({ draft, busy, error, onChoose }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let live = true
    fetch('/api/jobs/waitlist-status')
      .then((r) => r.json())
      .then((d) => { if (live) setStatus(d) })
      .catch(() => { if (live) setStatus({ tier: 'generic', spotsLeft: null }) })
    return () => { live = false }
  }, [])

  const lifetime = status?.tier === 'lifetime'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <p className="text-sm font-medium text-[#FF1F7D]">Before you post</p>

      {lifetime ? (
        <>
          <h2 className="mt-1 font-cal text-2xl text-gray-900">Lock in a lifetime deal on Shiftly</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            Shiftly Jobs is free because it is how hospitality owners meet Shiftly, the fair
            staff-scheduling tool this board is built by. The first {status.cap} on the waitlist
            keep <span className="font-medium text-gray-900">lifetime pricing</span>, forever.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-pink-50 border border-pink-200 px-4 py-2 text-sm font-semibold text-pink-700">
            <span className="w-2 h-2 rounded-full bg-[#FF1F7D]" aria-hidden="true" />
            {status.spotsLeft} of {status.cap} founder spots left
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-1 font-cal text-2xl text-gray-900">Get early access to Shiftly</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            Shiftly Jobs is free because it is how hospitality owners meet Shiftly, the fair
            staff-scheduling tool this board is built by. Join the waitlist for early access.
          </p>
        </>
      )}

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

      <div className="mt-7 flex flex-col sm:flex-row gap-3">
        <button
          type="button" disabled={busy || !status} onClick={() => onChoose(true)}
          className="rounded-full bg-[#FF1F7D] px-7 py-3.5 font-medium text-white hover:bg-pink-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : lifetime ? 'Join and lock in the deal' : 'Join the waitlist'}
        </button>
        <button
          type="button" disabled={busy} onClick={() => onChoose(false)}
          className="rounded-full border border-gray-200 px-7 py-3.5 font-medium text-gray-700 hover:border-gray-300 transition-all disabled:opacity-40"
        >
          No thanks, just post my job
        </button>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Either way we email a link to confirm your job is real and put it live. Your listing is
        already saved.
      </p>
    </div>
  )
}

function Field({ id, label, hint, required, children }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-[#FF1F7D] ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export default function PostForm() {
  const router = useRouter()
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Three states: writing the ad, then the waitlist step that publishes it,
  // then done. The draft is saved before the waitlist step, so nothing typed is
  // lost if that step fails or the tab is closed.
  const [draft, setDraft] = useState(null)
  const [sent, setSent] = useState(null)
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

  // shift_pattern stays an array throughout, matching the text[] column.
  const isRetail = f.industry === 'retail'
  // completeness() reads f.industry, so venue type is only required for hospitality.
  const scored = useMemo(() => completeness(f), [f])
  // Contact email is validated here as well as on the server, so the form never
  // shows a ready state for an address the server will reject.
  const emailValid = EMAIL_RE.test((f.contact_email || '').trim())
  const blocked = !scored.valid || !f.accepted_terms || !emailValid

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
      setDraft(json)
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // Both offer buttons land here. joinWaitlist is the poster's choice, passed to
  // the API so verify only joins the list if they actually opted in.
  async function publish(joinWaitlist) {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/jobs/post/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: draft.listing_id, email: draft.email, join_waitlist: joinWaitlist }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      // Already-live path (link clicked, then form resubmitted): jump to success.
      if (json.alreadyLive) { setDone({ ...draft, ...json }); return }
      setSent(json)
    } catch {
      setError('Could not reach the server. Your job is saved, try again.')
    } finally {
      setBusy(false)
    }
  }

  // The optional waitlist offer, shown once the draft is saved. Joining is a
  // value exchange, not a toll: either button publishes the job, the choice only
  // decides whether they join the Shiftly waitlist. The offer text is dynamic,
  // the first FOUNDER_CAP joiners get a lifetime deal, so scarcity is real.
  if (draft && !done && !sent) {
    return <WaitlistOffer draft={draft} busy={busy} error={error} onChoose={publish} />
  }

  // "Check your email" state, between requesting the link and clicking it.
  if (sent && !done) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="font-cal text-2xl text-gray-900">Check your email</h2>
        <p className="mt-3 text-[15px] text-gray-600">
          We sent a link to <span className="font-medium text-gray-900 break-words">{draft.email}</span>.
          Click it to join the waitlist and put your job live. The link lasts 30 minutes.
        </p>
        {sent.devLink && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 break-words">
            Dev mode, no email configured.{' '}
            <a className="underline font-medium" href={sent.devLink}>Open the publish link.</a>
          </p>
        )}
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="font-cal text-2xl text-gray-900">Your job is live</h2>
        <p className="mt-3 text-[15px] text-gray-600">
          {done.featured
            ? `You filled in everything, so it is featured at the top of the board for the next ${done.featured_days} days.`
            : 'It is on the board now, ordered by date posted.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => router.push(`/jobs/${done.slug}`)}
            className="rounded-full bg-[#FF1F7D] px-6 py-3 font-medium text-white hover:bg-pink-600 transition-colors"
          >
            View your listing
          </button>
          <button
            onClick={() => { setDone(null); setDraft(null); setSent(null); setF(EMPTY) }}
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
      {/* Progress toward Featured */}
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

      {/* Industry. Decides which board the role lands on and what we ask for
          (a shop has no venue type). Hospitality is the default. */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <h2 className="font-cal text-xl text-gray-900">What kind of business?</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {[['hospitality', 'Hospitality', 'Pub, bar, restaurant, café, hotel'], ['retail', 'Retail', 'Shop, store, showroom']].map(([key, label, hint]) => {
            const on = f.industry === key
            return (
              <button
                type="button" key={key}
                onClick={() => setF((p) => ({ ...p, industry: key, venue_type: key === 'retail' ? '' : p.venue_type }))}
                aria-pressed={on}
                className={`flex-1 min-w-[200px] text-left rounded-xl border-2 px-5 py-4 transition-colors ${on ? 'border-[#FF1F7D] bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className={`block font-medium ${on ? 'text-pink-700' : 'text-gray-900'}`}>{label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Business details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-5">
        <h2 className="font-cal text-xl text-gray-900">{isRetail ? 'Your business' : 'Your venue'}</h2>
        <div className="grid sm:grid-cols-2 gap-5 items-start">
          <Field id="employer_name" label={isRetail ? 'Business name' : 'Venue name'} required>
            <input id="employer_name" className={inputCls} value={f.employer_name} onChange={set('employer_name')} placeholder={isRetail ? 'The Corner Shop' : 'The Bothy'} />
          </Field>
          <Field id="city" label="Town or city" required>
            <input id="city" className={inputCls} value={f.city} onChange={set('city')} placeholder="Glasgow" />
          </Field>
          <Field id="locality" label="Area" hint="Helps people judge the commute. Counts toward featured.">
            <input id="locality" className={inputCls} value={f.locality} onChange={set('locality')} placeholder="Finnieston" />
          </Field>
          <Field id="postcode" label="Postcode">
            <input id="postcode" className={inputCls} value={f.postcode} onChange={set('postcode')} placeholder="G3 8AZ" />
          </Field>
          {/* Venue type is hospitality only; a shop has no pub/restaurant type. */}
          {!isRetail && (
            <Field id="venue_type" label="Venue type" required>
              <select id="venue_type" className={inputCls} value={f.venue_type} onChange={set('venue_type')}>
                <option value="">Choose one</option>
                {VENUES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          )}
          <Field id="website" label="Website" hint="Counts toward featured.">
            <input id="website" className={inputCls} value={f.website} onChange={set('website')} placeholder="https://" />
          </Field>
          <div className="sm:col-span-2">
            <Field id="contact_email" label="Contact email" required hint="Used to set up your Shiftly account. Not shown on the listing.">
              <input
                id="contact_email" type="email" value={f.contact_email} onChange={set('contact_email')}
                aria-invalid={Boolean(f.contact_email) && !EMAIL_RE.test(f.contact_email.trim())}
                className={`${inputCls} ${f.contact_email && !EMAIL_RE.test(f.contact_email.trim()) ? '!border-red-300 focus:!ring-red-100' : ''}`}
              />
              {f.contact_email && !EMAIL_RE.test(f.contact_email.trim()) && (
                <p className="mt-1.5 text-xs text-red-600">Enter a full email, like name@venue.co.uk.</p>
              )}
            </Field>
          </div>
        </div>
      </div>

      {/* Role. Job title is free text and the role category is worked out from
          it, so there is no dropdown duplicating the same question. */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-5">
        <h2 className="font-cal text-xl text-gray-900">The role</h2>
        <div className="grid sm:grid-cols-2 gap-5 items-start">
          <div className="sm:col-span-2">
            <Field id="title" label="Job title" required hint="Whatever you actually call it. We sort it into the right category for you.">
              <input id="title" className={inputCls} value={f.title} onChange={set('title')} placeholder="Chef de Partie" />
            </Field>
          </div>
          <Field id="contract_type" label="Contract" required>
            <select id="contract_type" className={inputCls} value={f.contract_type} onChange={set('contract_type')}>
              <option value="">Choose one</option>
              {CONTRACTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
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
        <div className="grid sm:grid-cols-3 gap-5 items-start">
          <Field id="pay_min" label="Pay from" required>
            <input id="pay_min" type="number" min="0" step="0.01" className={inputCls} value={f.pay_min} onChange={set('pay_min')} placeholder="12.60" />
          </Field>
          <Field id="pay_max" label="Pay to" hint="Leave blank for a fixed rate.">
            <input id="pay_max" type="number" min="0" step="0.01" className={inputCls} value={f.pay_max} onChange={set('pay_max')} placeholder="14.00" />
          </Field>
          <Field id="pay_period" label="Period" required>
            <select id="pay_period" className={inputCls} value={f.pay_period} onChange={set('pay_period')}>
              {PAY_PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1.5">
            Shift pattern<span className="text-[#FF1F7D] ml-0.5">*</span>
          </span>
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
          <p className="mt-2 text-xs text-gray-500">Pick every pattern that applies. No other job board asks for this.</p>
        </div>
      </div>

      {/* Detail */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-5">
        <h2 className="font-cal text-xl text-gray-900">Detail</h2>
        <Field id="description" label="Description" required hint={`${f.description.trim().length} characters. 400 or more counts toward featured.`}>
          <textarea id="description" rows={7} className={inputCls} value={f.description} onChange={set('description')} />
        </Field>
        <Field id="benefits" label="Benefits or perks" hint="Meals on shift, tips, training, staff discount. Counts toward featured.">
          <textarea id="benefits" rows={3} className={inputCls} value={f.benefits} onChange={set('benefits')} />
        </Field>
        {/* Either one satisfies the requirement, so the asterisk belongs on the
            group rather than on a field. Putting it on both would say "both
            required" and putting it on neither leaves no visual cue at all. */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1.5">
            How to apply<span className="text-[#FF1F7D] ml-0.5" aria-hidden="true">*</span>
          </legend>
          <p className="text-xs text-gray-500 mb-3">Give a link or an email. Either one is enough.</p>
          <div className="grid sm:grid-cols-2 gap-5 items-start">
            <Field id="apply_url" label="Application link">
              <input id="apply_url" className={inputCls} value={f.apply_url} onChange={set('apply_url')} placeholder="https://" />
            </Field>
            <div className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <label htmlFor="apply_email" className="block text-sm font-medium text-gray-700">Or an email to apply to</label>
                {/* Saves retyping when applications come to the same inbox. Only
                    offered once the contact email is a valid address to copy. */}
                {EMAIL_RE.test((f.contact_email || '').trim()) && f.apply_email.trim() !== f.contact_email.trim() && (
                  <button
                    type="button"
                    onClick={() => setF((p) => ({ ...p, apply_email: p.contact_email.trim() }))}
                    className="text-xs font-medium text-pink-600 hover:text-pink-700"
                  >
                    Use contact email
                  </button>
                )}
              </div>
              <input
                id="apply_email" type="email" value={f.apply_email} onChange={set('apply_email')}
                aria-invalid={Boolean(f.apply_email) && !EMAIL_RE.test(f.apply_email.trim())}
                className={`${inputCls} ${f.apply_email && !EMAIL_RE.test(f.apply_email.trim()) ? '!border-red-300 focus:!ring-red-100' : ''}`}
              />
              {f.apply_email && !EMAIL_RE.test(f.apply_email.trim()) && (
                <p className="mt-1.5 text-xs text-red-600">Enter a full email, like jobs@venue.co.uk.</p>
              )}
            </div>
          </div>
        </fieldset>
      </div>

      {/* Just the terms here. Marketing consent is captured separately by the
          waitlist offer after this step, where actively choosing "join" is a
          clear, unbundled opt-in. That keeps it valid under PECR (sole traders
          and partnerships count as individuals) without a second checkbox. */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" checked={f.accepted_terms} onChange={set('accepted_terms')} className="mt-1 w-4 h-4 accent-[#FF1F7D]" />
          <span className="text-sm text-gray-700">
            I accept the <a href="/terms" className="underline hover:text-gray-900">terms</a> and confirm this is a
            genuine vacancy at a business I am authorised to post for.
            <span className="text-[#FF1F7D]">*</span>
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Blocking notice. Styled as an alert rather than helper text: it is the
          reason the button below is disabled, so it has to read as a stop, not
          as a caption someone can skim past. */}
      {blocked && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4" role="status">
          <div className="flex gap-3">
            <svg className="w-5 h-5 shrink-0 text-amber-600 mt-px" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                You cannot post yet
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {scored.missing.length > 0 && (
                  <>Still needed: <span className="font-medium">{scored.missing.map((m) => m.label).join(', ')}</span>.</>
                )}
                {scored.missing.length > 0 && !f.accepted_terms && ' '}
                {!f.accepted_terms && 'You also need to accept the terms.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={busy || blocked}
          className="rounded-full bg-[#FF1F7D] px-8 py-3.5 font-medium text-white hover:bg-pink-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </form>
  )
}
