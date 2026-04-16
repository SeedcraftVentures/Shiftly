import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * Pending onboarding storage.
 *
 * Stores wizard state for users who have signed up but not yet completed
 * the full signup → onboarding → payment flow. Consumed by the billing
 * webhook on subscription.created to provision org + location atomically.
 *
 * Uses the admin client because RLS policies aren't written for this table
 * (it's ephemeral and only this route + the webhook touch it).
 */

// GET — fetch the current user's pending onboarding (if any)
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createSupabaseAdminClient()

    const { data, error } = await admin
      .from(DB_TABLES.pendingOnboardings)
      .select('payload')
      .eq('clerk_user_id', userId)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ payload: data?.payload ?? null })
  } catch (err) {
    console.error('Error fetching pending onboarding:', err)
    return NextResponse.json({ error: 'Failed to fetch pending onboarding' }, { status: 500 })
  }
}

// POST — create or overwrite the current user's pending onboarding
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload required' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    const { error } = await admin
      .from(DB_TABLES.pendingOnboardings)
      .upsert(
        { clerk_user_id: userId, payload: body },
        { onConflict: 'clerk_user_id' }
      )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error saving pending onboarding:', err)
    return NextResponse.json({ error: 'Failed to save pending onboarding' }, { status: 500 })
  }
}

// DELETE — clear the current user's pending onboarding
// Useful if they cancel / restart the flow
export async function DELETE() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createSupabaseAdminClient()

    const { error } = await admin
      .from(DB_TABLES.pendingOnboardings)
      .delete()
      .eq('clerk_user_id', userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting pending onboarding:', err)
    return NextResponse.json({ error: 'Failed to delete pending onboarding' }, { status: 500 })
  }
}