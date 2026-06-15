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
      subscription_data: {
        trial_period_days: 14,
      },
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
          
          // If it's a 100% off coupon, skip the trial (they get it free anyway)
          if (promoCodeObj.coupon.percent_off === 100) {
            delete sessionConfig.subscription_data.trial_period_days
          }
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