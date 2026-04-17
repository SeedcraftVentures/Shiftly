import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import { createLocationWithChildren } from '@/app/lib/server/createLocationWithChildren'

export const dynamic = 'force-dynamic'

/**
 * POST /api/onboarding
 *
 * Called when the user completes the onboarding wizard (or the dev-skip
 * button on /onboarding/payment). Creates:
 *   1. A Clerk organization owned by the current user (admin role)
 *   2. A Supabase Organizations row keyed by the new Clerk org id
 *   3. A Location with all its children (hours, rules, teams, staff)
 *
 * If any step fails after the Clerk org is created, we delete the org
 * to prevent orphans.
 *
 * Uses the admin Supabase client because this route runs before the user
 * has an `org_id` claim in their session (Clerk session activation for the
 * new org happens client-side after this call succeeds).
 */
export async function POST(request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    organization_name,
    industry,
    address,
    location_nickname,
    currency,
    min_wage,
    teams,
    operating_hours,
    staff_by_team,
  } = await request.json()

  if (!organization_name || !industry || !address || !teams?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const clerk = await clerkClient()
  const admin = createSupabaseAdminClient()

  let clerkOrgId = null

  try {
    // 1. Create Clerk organization with the current user as creator (admin by default)
    const clerkOrg = await clerk.organizations.createOrganization({
      name: organization_name,
      createdBy: userId,
    })
    clerkOrgId = clerkOrg.id

    // 2. Insert into Supabase Organizations using the Clerk org id as PK
    const { error: orgErr } = await admin
      .from(DB_TABLES.organizations)
      .insert({
        organization_id: clerkOrgId,
        organization_name,
        industry,
        currency: currency || null,
        onboarding_completed: true,
      })
    if (orgErr) throw orgErr

    // 3. Create the first location + all children via shared helper
    await createLocationWithChildren(admin, clerkOrgId, {
      name: location_nickname || address,
      address,
      // First location inherits currency from org
      currency: null,
      min_wage: min_wage ?? null,
      operating_hours,
      teams,
      staff_by_team,
    })

    // 4. Clear any pending onboarding row
    await admin
      .from(DB_TABLES.pendingOnboardings)
      .delete()
      .eq('clerk_user_id', userId)

    return NextResponse.json({ success: true, organization_id: clerkOrgId })
  } catch (err) {
    console.error('Onboarding error:', err)

    // Rollback: delete the Clerk org if we got that far
    if (clerkOrgId) {
      try {
        await clerk.organizations.deleteOrganization(clerkOrgId)
      } catch (rollbackErr) {
        console.error('Failed to rollback Clerk org:', rollbackErr)
      }
    }

    return NextResponse.json(
      { error: err.message || 'Failed to save onboarding data' },
      { status: 500 }
    )
  }
}