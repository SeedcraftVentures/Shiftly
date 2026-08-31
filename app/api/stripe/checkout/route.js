import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

export async function POST(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, email, promoCode } = await request.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    // The founding code is only valid on the Companion annual price. Guard it
    // server-side so neither the promo box nor a crafted request can apply the
    // £300 off to a cheaper plan (which would make it free or negative).
    const foundingCode = process.env.NEXT_PUBLIC_STRIPE_FOUNDING_CODE
    const aiAnnualPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_ANNUAL
    if (
      promoCode && foundingCode && aiAnnualPrice &&
      promoCode.trim().toLowerCase() === foundingCode.toLowerCase() &&
      priceId !== aiAnnualPrice
    ) {
      return NextResponse.json({ error: 'That code only applies to the Companion annual plan.' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shiftly.so'

    // Build session config
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/checkout?cancelled=true`,
      client_reference_id: userId,
      customer_email: email,
      // No Stripe trial: the 7-day free trial is served in-app (no card). Checkout
      // is the "subscribe now" action, so it bills immediately — otherwise a
      // subscriber would get a second free week on top of the in-app one.
    }

    // If a promo code was provided, look it up and apply it
    if (promoCode) {
      try {
        // Find the promotion code in Stripe
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        })

        if (promotionCodes.data.length > 0) {
          const promoCodeObj = promotionCodes.data[0]
          
          // Apply the promotion code discount
          // Note: When using discounts, we cannot also use allow_promotion_codes
          sessionConfig.discounts = [
            {
              promotion_code: promoCodeObj.id,
            },
          ]
        } else {
          // Invalid promo code - return error
          return NextResponse.json({ 
            error: 'Invalid promo code. Please check and try again.' 
          }, { status: 400 })
        }
      } catch (promoError) {
        console.error('Promo code lookup error:', promoError)
        // Continue without promo code if lookup fails
      }
    } else {
      // Only allow manual promo code entry if no code was pre-applied
      sessionConfig.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}