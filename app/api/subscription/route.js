import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Stripe price ids that map to the AI-supported (£59) tier. Comma-separated in
// env so monthly + annual can both count. Everyone on a trial gets AI regardless
// of price, so the trial sells the upgrade (see pricing decision).
const AI_PRICE_IDS = (process.env.STRIPE_AI_PRICE_IDS || '')
  .split(',').map((s) => s.trim()).filter(Boolean)

export async function GET() {
  try {
    const { userId } = await auth()
    console.log('[Subscription API] Clerk userId:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription, error: queryError } = await supabase
      .from('Subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('[Subscription API] Query result:', { subscription, queryError })

    if (!subscription) {
      return NextResponse.json({
        status: 'inactive',
        hasAccess: false,
        isTrialing: false,
        isAiTier: false,
      })
    }

    // Check if user has access
    const activeStatuses = ['active', 'trialing']
    const hasAccess = activeStatuses.includes(subscription.status)
    const isTrialing = subscription.status === 'trialing'
    // AI tier: on during any trial (sells the upgrade), or when the subscribed
    // price is one of the AI prices. Only meaningful while hasAccess.
    const isAiTier = hasAccess && (isTrialing || AI_PRICE_IDS.includes(subscription.plan))

    return NextResponse.json({
      ...subscription,
      hasAccess,
      isTrialing,
      isAiTier,
    })
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}