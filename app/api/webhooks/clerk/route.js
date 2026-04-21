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
      // ── Organization lifecycle ─────────────────────────────────────────────

      case 'organization.updated': {
        // Sync Clerk org name changes to Supabase
        const { id, name } = evt.data
        const { error } = await admin
          .from(DB_TABLES.organizations)
          .update({ organization_name: name })
          .eq('organization_id', id)
        if (error) throw error
        break
      }

      case 'organization.deleted': {
        // Cascade via FK handles children; just drop the Supabase row
        const { id } = evt.data
        const { error } = await admin
          .from(DB_TABLES.organizations)
          .delete()
          .eq('organization_id', id)
        if (error) throw error
        break
      }

      // ── Membership lifecycle ───────────────────────────────────────────────
      // Memberships live in Clerk; we don't mirror them to Supabase.
      // These events are logged for observability but no DB changes.

      case 'organizationMembership.created':
      case 'organizationMembership.deleted':
      case 'organizationInvitation.created':
      case 'organizationInvitation.accepted':
        // No-op — Clerk owns this state
        break

      // ── User lifecycle ─────────────────────────────────────────────────────
      // Users live in Clerk; we don't mirror them to Supabase.

      case 'user.created':
      case 'user.updated': {
        // Match email to any Staff rows with a pending invite
        const emails = evt.data.email_addresses?.map(e => e.email_address) || []
        if (emails.length > 0) {
          const { error } = await admin
            .from(DB_TABLES.staff)
            .update({
              user_id: evt.data.id,
              invite_status: 'Accepted',
            })
            .in('invite_email', emails)
            .eq('invite_status', 'Pending')

          if (error) console.error('Error matching staff by email:', error)
        }
        break
      }

      case 'user.deleted':
        // Clear user_id from any Staff rows
        if (evt.data.id) {
          const { error } = await admin
            .from(DB_TABLES.staff)
            .update({ user_id: null, invite_status: 'Not Invited' })
            .eq('user_id', evt.data.id)

          if (error) console.error('Error clearing staff user_id:', error)
        }
        break

      // ── Subscription lifecycle (Phase 6 will add provisioning here) ────────

      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.deleted':
      case 'subscriptionItem.created':
      case 'subscriptionItem.updated':
      case 'subscriptionItem.deleted':
        // Phase 6 will wire billing-driven provisioning here
        break

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}