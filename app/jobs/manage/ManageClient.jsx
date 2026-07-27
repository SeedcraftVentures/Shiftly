'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SHIFT_PATTERNS, CONTRACTS, PAY_PERIODS, SHIFT_PATTERN_LABEL, formatPay } from '@/lib/jobs/taxonomy'

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[15px] text-gray-900 ' +
  'placeholder:text-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 transition'

const STATUS = {
  live: { label: 'Live', cls: 'bg-green-50 text-green-700 border-green-200' },
  pending: { label: 'Draft, not published', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  removed: { label: 'Taken down', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

// ── Signed-out: request a magic link ─────────────────────────────────────────
function LoginView() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | sent | error
  const [devLink, setDevLink] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setState('idle')
    const res = await fetch('/api/jobs/manage/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    const json = await res.json()
    if (!res.ok) { setState('error'); return }
    setDevLink(json.devLink || null)
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <h2 className="font-cal text-2xl text-gray-900">Check your email</h2>
        <p className="mt-3 text-[15px] text-gray-600">
          If {email} has posted a job with us, a sign-in link is on its way. It is valid for 30 minutes.
        </p>
        {devLink && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 break-words">
            Dev mode, no email configured. <a className="underline font-medium" href={devLink}>Open the sign-in link.</a>
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-8 max-w-md">
      <h2 className="font-cal text-2xl text-gray-900">Sign in</h2>
      <p className="mt-2 text-sm text-gray-600">Enter the email you posted with. We will send a one-time link, no password.</p>
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@venue.co.uk" className={`${inputCls} mt-5`}
      />
      {state === 'error' && <p className="mt-3 text-sm text-red-600">Enter a valid email.</p>}
      <button type="submit" className="mt-5 w-full rounded-full bg-[#FF1F7D] px-8 py-3 font-medium text-white hover:bg-pink-600 transition-colors">
        Send me a link
      </button>
      <p className="mt-4 text-sm text-gray-500">
        Not posted yet? <Link href="/jobs/post" className="text-pink-600 underline">Post a job</Link>.
      </p>
    </form>
  )
}

// ── One row ──────────────────────────────────────────────────────────────────
function ListingRow({ listing, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState(null)
  const s = STATUS[listing.status] || STATUS.removed

  const act = useCallback(async (action, fields) => {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/jobs/manage/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.listing_id, action, fields }),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.missing?.length ? `That drops: ${json.missing.map((m) => m.label).join(', ')}` : json.error); return false }
      setEditing(false); onChanged()
      return true
    } finally { setBusy(false) }
  }, [listing.listing_id, onChanged])

  if (editing) return <EditRow listing={listing} busy={busy} err={err} onCancel={() => setEditing(false)} onSave={(fields) => act('edit', fields)} />

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
            {listing.featured_until && new Date(listing.featured_until) > new Date() && (
              <span className="inline-flex items-center rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700">Featured</span>
            )}
          </div>
          <h3 className="mt-2 font-cal text-lg text-gray-900 break-words">{listing.title}</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {listing.city}{formatPay(listing) ? ` · ${formatPay(listing)}` : ' · Pay not shown'}
          </p>
        </div>
        {listing.status === 'live' && (
          <Link href={`/jobs/${listing.slug}`} className="shrink-0 text-sm font-medium text-pink-600 hover:text-pink-700">View</Link>
        )}
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {(listing.status === 'live' || listing.status === 'pending') && (
          <button onClick={() => setEditing(true)} disabled={busy}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-40">Edit</button>
        )}
        {listing.status === 'live' && (
          <button onClick={() => act('takedown')} disabled={busy}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-40">Take down</button>
        )}
        {(listing.status === 'removed' || listing.status === 'expired') && (
          <button onClick={() => act('repost')} disabled={busy}
            className="rounded-full bg-[#FF1F7D] px-4 py-1.5 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-40">Repost</button>
        )}
      </div>
    </div>
  )
}

// ── Inline edit ──────────────────────────────────────────────────────────────
function EditRow({ listing, busy, err, onCancel, onSave }) {
  const [f, setF] = useState({
    title: listing.title || '',
    description: listing.description || '',
    pay_min: listing.pay_min ?? '',
    pay_max: listing.pay_max ?? '',
    pay_period: listing.pay_period || 'hourly',
    contract_type: listing.contract_type || 'full_time',
    shift_pattern: Array.isArray(listing.shift_pattern) ? listing.shift_pattern : [],
  })
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const toggle = (k) => setF((p) => ({ ...p, shift_pattern: p.shift_pattern.includes(k) ? p.shift_pattern.filter((x) => x !== k) : [...p.shift_pattern, k] }))

  return (
    <div className="rounded-2xl border-2 border-pink-100 bg-white p-5 sm:p-6 space-y-4">
      <h3 className="font-cal text-lg text-gray-900">Edit listing</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Job title</label>
        <input className={inputCls} value={f.title} onChange={set('title')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea rows={5} className={inputCls} value={f.description} onChange={set('description')} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 items-start">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay from</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={f.pay_min} onChange={set('pay_min')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Pay to</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={f.pay_max} onChange={set('pay_max')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Period</label>
          <select className={inputCls} value={f.pay_period} onChange={set('pay_period')}>
            {PAY_PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract</label>
        <select className={inputCls} value={f.contract_type} onChange={set('contract_type')}>
          {CONTRACTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Shift pattern</span>
        <div className="flex flex-wrap gap-2">
          {SHIFT_PATTERNS.map(([v, l]) => {
            const on = f.shift_pattern.includes(v)
            return (
              <button type="button" key={v} onClick={() => toggle(v)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${on ? 'border-[#FF1F7D] bg-[#FF1F7D] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                {l}
              </button>
            )
          })}
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={() => onSave(f)} disabled={busy}
          className="rounded-full bg-[#FF1F7D] px-6 py-2.5 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-40">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onCancel} disabled={busy}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-40">Cancel</button>
      </div>
    </div>
  )
}

// ── Signed-in dashboard ──────────────────────────────────────────────────────
export default function ManageClient({ signedIn, email }) {
  const router = useRouter()
  const [listings, setListings] = useState(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/jobs/manage/listings')
    if (res.ok) setListings((await res.json()).listings)
    else setListings([])
  }, [])

  useEffect(() => { if (signedIn) load() }, [signedIn, load])

  if (!signedIn) return <LoginView />

  async function logout() {
    await fetch('/api/jobs/manage/logout', { method: 'POST' })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 break-words">Signed in as {email}</p>
        <button onClick={logout} className="text-sm font-medium text-gray-500 hover:text-gray-700">Sign out</button>
      </div>

      {listings === null ? (
        <p className="text-gray-400">Loading your listings…</p>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">You have not posted any jobs yet.</p>
          <Link href="/jobs/post" className="mt-4 inline-flex rounded-full bg-[#FF1F7D] px-6 py-3 font-medium text-white hover:bg-pink-600">Post a job</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => <ListingRow key={l.listing_id} listing={l} onChanged={load} />)}
          <div className="pt-2">
            <Link href="/jobs/post" className="inline-flex rounded-full border border-gray-200 px-6 py-3 font-medium text-gray-700 hover:border-gray-300">Post another job</Link>
          </div>
        </div>
      )}
    </div>
  )
}
