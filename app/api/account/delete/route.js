import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin, organizationIdFor } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ── Account deletion (GDPR + App Store / Play Store requirement) ───────────────
// Deletes the signed-in user's account and data. A MANAGER (org owner) has their
// whole business wiped, child rows first. A STAFF member is unlinked (login +
// personal contact removed) but the manager's roster slot is kept as the
// business's own record. Every filter derives from THIS user's id/locations, so
// the blast radius is strictly their own data.
//
// NOTE: destructive and irreversible; not runnable/tested from the dev box.
// Verify against a throwaway account before relying on it.

const delWhere = async (table, col, val, isIn = false) => {
  if (isIn && (!Array.isArray(val) || val.length === 0)) return
  const base = supabaseAdmin.from(table).delete()
  const { error } = await (isIn ? base.in(col, val) : base.eq(col, val))
  if (error) console.error(`account delete: ${table}.${col}`, error.message)
}

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = organizationIdFor(userId)

  try {
    // ── Manager: gather the business, then delete child rows first ──
    const { data: locs } = await supabaseAdmin.from('Locations').select('location_id').eq('organization_id', orgId)
    const locationIds = (locs || []).map((l) => l.location_id)

    let teamIds = []
    if (locationIds.length) {
      const { data: teams } = await supabaseAdmin.from('Teams').select('team_id').in('location_id', locationIds)
      teamIds = (teams || []).map((t) => t.team_id)
    }
    let rotaIds = []
    if (locationIds.length) {
      const { data: rotas } = await supabaseAdmin.from('Rotas').select('rota_id').in('location_id', locationIds)
      rotaIds = (rotas || []).map((r) => r.rota_id)
    }

    await delWhere('Rota Assignments', 'rota_id', rotaIds, true)
    await delWhere('Rotas', 'location_id', locationIds, true)
    await delWhere('Shift Patterns', 'shift_team', teamIds, true)
    await delWhere('Requests', 'team_id', teamIds, true)
    await delWhere('Notifications', 'team_id', teamIds, true)
    await delWhere('Staff', 'team_id', teamIds, true)
    await delWhere('Location Day Hours', 'location_id', locationIds, true)
    await delWhere('Location Rules', 'location_id', locationIds, true)
    await delWhere('Teams', 'location_id', locationIds, true)
    await delWhere('Locations', 'organization_id', orgId)
    await delWhere('Organizations', 'organization_id', orgId)

    // ── This user's own personal rows (covers manager or staff) ──
    await delWhere('Notifications', 'recipient_user_id', userId)
    await delWhere('Requests', 'user_id', userId)

    // If they are a staff member somewhere, remove their personal data + unlink the
    // login, but keep the roster slot as the manager's business record.
    const { data: staffRows } = await supabaseAdmin.from('Staff').select('staff_id').eq('user_id', userId)
    const staffIds = (staffRows || []).map((s) => s.staff_id)
    if (staffIds.length) {
      await delWhere('Requests', 'staff_id', staffIds, true)
      await delWhere('Notifications', 'recipient_staff_id', staffIds, true)
      const { error } = await supabaseAdmin.from('Staff')
        .update({ user_id: null, invite_email: null, invite_status: 'Not Invited' })
        .eq('user_id', userId)
      if (error) console.error('account delete: staff unlink', error.message)
    }

    // ── Cancel + delete billing (best-effort) ──
    try {
      const { data: sub } = await supabaseAdmin.from('Subscriptions').select('stripe_subscription_id').eq('user_id', userId).maybeSingle()
      if (sub?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch(() => {})
      }
    } catch (e) { console.error('account delete: stripe', e?.message) }
    await delWhere('Subscriptions', 'user_id', userId)

    // ── Delete the Clerk login last (removes the account itself) ──
    try {
      const client = await clerkClient()
      await client.users.deleteUser(userId)
    } catch (e) { console.error('account delete: clerk user', e?.message) }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete account. Contact support@shiftly.so.' }, { status: 500 })
  }
}
