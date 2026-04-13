import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET
  if (!secret) {
    console.error('Missing CLERK_WEBHOOK_SIGNING_SECRET')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Verify svix signature
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let evt
  try {
    evt = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name } = evt.data
        const primaryEmail =
          email_addresses?.find(e => e.id === evt.data.primary_email_address_id)
            ?.email_address ?? email_addresses?.[0]?.email_address ?? ''

        const { error } = await admin
          .from(DB_TABLES.users)
          .upsert(
            {
              user_id: id,
              email: primaryEmail,
              first_name,
              last_name,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
        if (error) throw error
        break
      }

      case 'user.deleted': {
        const { id } = evt.data
        const { error } = await admin
          .from(DB_TABLES.users)
          .delete()
          .eq('user_id', id)
        if (error) throw error
        break
      }

      default:
        // Ignore other event types
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}