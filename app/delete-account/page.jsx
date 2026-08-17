'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser, useClerk, SignInButton } from '@clerk/nextjs'

// Public page (Google Play requires a reachable account-deletion URL) that also
// performs the deletion in-app when signed in (Apple requires an in-app path).
// Posts to /api/account/delete, then signs the (now-deleted) session out.
export default function DeleteAccountPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const runDelete = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not delete your account. Contact support@shiftly.so.') }
      setDone(true)
      setTimeout(() => signOut({ redirectUrl: '/' }), 1800)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="font-cal text-lg text-gray-900">Shiftly</Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-cal tracking-tight text-gray-900 mb-3">Delete your account</h1>

          {done ? (
            <p className="text-gray-600 leading-relaxed">Your account and data have been deleted. Signing you out…</p>
          ) : !isLoaded ? (
            <p className="text-gray-400">Loading…</p>
          ) : !isSignedIn ? (
            <div className="space-y-5">
              <p className="text-gray-600 leading-relaxed">
                To delete your Shiftly account and all associated data, sign in with the account you want to remove, then confirm on this page. This cannot be undone.
              </p>
              <SignInButton mode="modal" forceRedirectUrl="/delete-account">
                <button className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors">Sign in to continue</button>
              </SignInButton>
              <p className="text-sm text-gray-400">Or email <a href="mailto:support@shiftly.so" className="text-pink-600">support@shiftly.so</a> and we'll delete it for you.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 leading-relaxed">
                <p className="font-semibold mb-1">This permanently deletes:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>your login ({user?.primaryEmailAddress?.emailAddress})</li>
                  <li>your business, locations, teams, staff, shifts and rotas</li>
                  <li>time-off requests, notifications, and your subscription (any active plan is cancelled)</li>
                </ul>
                <p className="mt-2">It cannot be undone.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type <span className="font-bold">DELETE</span> to confirm</label>
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button onClick={runDelete} disabled={busy || confirm.trim() !== 'DELETE'}
                className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {busy ? 'Deleting…' : 'Delete my account permanently'}
              </button>
              <Link href="/dashboard" className="block text-center text-sm text-gray-500 hover:text-gray-900">Cancel and go back</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
