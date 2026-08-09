'use client'

import { useEffect, useState, Suspense } from 'react'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

// Two flat-price tiers, both unlimited staff and teams. AI is the default so the
// trial starts on it (sells the upgrade); a manager can drop to Manual anytime.
const PLANS = {
  ai: {
    key: 'ai', name: 'AI-supported', monthly: 59, annual: 549, recommended: true,
    tagline: 'Everything in Manual, plus the assistant that sets up, fills gaps and builds your rota for you.',
    features: ['Unlimited staff and teams', 'AI assistant builds and fixes your rota', 'Ask it to do things in plain English', 'Approve and publish in one tap'],
  },
  manual: {
    key: 'manual', name: 'Manual', monthly: 49, annual: 449,
    tagline: 'The full rota builder with a guided setup assistant and how-to help.',
    features: ['Unlimited staff and teams', 'Smart rota generator', 'Guided setup + how-to assistant', 'Time off, availability, payroll, reports'],
  },
}

const PRICE_ENV = {
  ai: { monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_MONTHLY, annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_ANNUAL },
  manual: { monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY, annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL },
}

// Competitor pricing as of August 2026. Both charge per location, so cost
// multiplies with each site; 7shifts also caps staff by tier.
const COMPARE = [
  { name: 'Shiftly', price: '£49 to £59', unit: 'flat, per business', staff: 'Unlimited', highlight: true },
  { name: '7shifts', price: '$39.99 to $134.99', unit: 'per location / month', staff: 'Capped by tier' },
  { name: 'Homebase', price: '$24.95 to $59.95', unit: 'per location / month', staff: 'Per location' },
]

function CheckoutContent() {
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const [tier, setTier] = useState('ai')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [promoCode, setPromoCode] = useState('')
  const [showPromoInput, setShowPromoInput] = useState(false)

  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan === 'annual') setBillingCycle('annual')
    if (plan === 'manual') setTier('manual')
    const code = searchParams.get('code')
    if (code) { setPromoCode(code); setShowPromoInput(true) }
  }, [searchParams])

  const handleCheckout = async () => {
    if (!user) return
    setLoading(true); setError(null)
    try {
      const priceId = PRICE_ENV[tier]?.[billingCycle]
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, email: user.primaryEmailAddress?.emailAddress, promoCode: promoCode.trim() || undefined }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Failed to start checkout')
    } catch (err) {
      console.error('Checkout error:', err)
      setError('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.svg" alt="Shiftly" width={40} height={40} />
            <span className="text-2xl font-cal text-gray-900">Shiftly</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-cal">Unlimited staff. One flat price.</h1>
          <p className="text-gray-600 mt-2">Free for 7 days. No charge until your trial ends, cancel anytime.</p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex bg-white border border-gray-200 rounded-full p-1">
            {['monthly', 'annual'].map((c) => (
              <button key={c} onClick={() => setBillingCycle(c)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billingCycle === c ? 'bg-pink-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                {c === 'monthly' ? 'Monthly' : 'Annual'}
                {c === 'annual' && <span className={`ml-1.5 text-xs ${billingCycle === 'annual' ? 'text-white/90' : 'text-green-600'}`}>Best value</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[PLANS.ai, PLANS.manual].map((p) => {
            const selected = tier === p.key
            const price = billingCycle === 'monthly' ? p.monthly : Math.round(p.annual / 12)
            return (
              <button key={p.key} onClick={() => setTier(p.key)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all bg-white ${selected ? 'border-pink-500 shadow-lg shadow-pink-500/10' : 'border-gray-200 hover:border-gray-300'}`}>
                {p.recommended && (
                  <div className="absolute -top-2.5 left-5 px-2.5 py-0.5 bg-pink-500 text-white text-xs font-bold rounded-full">Recommended</div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-pink-500 bg-pink-500' : 'border-gray-300'}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">£{price}</span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
                {billingCycle === 'annual' && <p className="text-xs text-green-600 mb-2">£{p.annual} billed yearly, save £{p.monthly * 12 - p.annual}</p>}
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{p.tagline}</p>
                <ul className="space-y-1.5">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Comparison */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">How we compare</p>
          <p className="text-xs text-gray-500 mb-4">Others charge per location, so your cost multiplies with every site. Shiftly is one flat price for your whole business.</p>
          <div className="space-y-2">
            {COMPARE.map((row) => (
              <div key={row.name} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${row.highlight ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50'}`}>
                <span className={`font-semibold text-sm ${row.highlight ? 'text-pink-600' : 'text-gray-900'}`}>{row.name}</span>
                <div className="text-right">
                  <span className="block text-sm font-bold text-gray-900">{row.price}</span>
                  <span className="block text-xs text-gray-500">{row.unit} · {row.staff} staff</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Competitor pricing as of August 2026. See their sites for current rates.</p>
        </div>

        {/* Promo Code */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          {!showPromoInput ? (
            <button onClick={() => setShowPromoInput(true)} className="text-sm text-pink-600 hover:text-pink-700 font-medium">Have a promo code?</button>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Promo code</label>
              <div className="flex gap-2">
                <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="Enter code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-sm uppercase text-gray-900" />
                {promoCode && (
                  <button onClick={() => { setPromoCode(''); setShowPromoInput(false) }} className="px-3 py-2 text-gray-500 hover:text-gray-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              {promoCode && <p className="text-xs text-green-600 mt-2">Code will be applied at checkout</p>}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"><p className="text-red-700 text-sm">{error}</p></div>
        )}

        <button onClick={handleCheckout} disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              <span>Processing...</span>
            </span>
          ) : `Start my free trial (${PLANS[tier].name})`}
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {['Free for 7 days', 'Cancel anytime in settings', 'Secure payment via Stripe'].map((t) => (
            <p key={t} className="text-gray-500 text-xs flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {t}
            </p>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-2">Signed in as {user?.primaryEmailAddress?.emailAddress}</p>
          <SignOutButton>
            <button className="text-sm text-gray-500 hover:text-pink-600 transition-colors">Sign out or use a different account</button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
