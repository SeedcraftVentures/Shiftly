import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { DB_TABLES } from '@/app/lib/constants'
import { createSupabaseAdminClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function verifyWebhook(request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET
  if (!SIGNING_SECRET) {
    throw new Error('CLERK_WEBHOOK_SIGNING_SECRET is not set')
  }

  const wh = new Webhook(SIGNING_SECRET)
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing svix headers')
  }

  const body = await request.text()
  return wh.verify(body, {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  })
}

export async function POST(request) {
  let event
  try {
    event = await verifyWebhook(request)
  } catch (err) {
    console.error('Clerk webhook verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { type, data } = event

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = data
        const primaryEmail = email_addresses?.find(e => e.id === data.primary_email_address_id)?.email_address
          || email_addresses?.[0]?.email_address
          || ''
        const name = [first_name, last_name].filter(Boolean).join(' ') || 'User'

        const { error } = await supabase
          .from(DB_TABLES.users)
          .upsert(
            { user_id: id, name, email: primaryEmail },
            { onConflict: 'user_id' }
          )

        if (error) throw error
        break
      }

      case 'user.deleted': {
        const { id } = data
        const { error } = await supabase
          .from(DB_TABLES.users)
          .delete()
          .eq('user_id', id)

        if (error) throw error
        break
      }

      default:
        // Ignore unhandled event types
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(`Clerk webhook handler error (${type}):`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
