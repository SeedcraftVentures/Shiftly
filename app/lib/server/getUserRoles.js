import { auth, clerkClient } from '@clerk/nextjs/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

/**
 * Returns the current user's roles.
 *
 * Uses the admin Supabase client because this function may run before
 * the Clerk session cookie has propagated the org_id claim — meaning
 * RLS policies that check current_org_id() would block the query.
 *
 * @param {string} userId - Clerk user ID
 * @returns {{ isManager: boolean, isStaff: boolean, hasOnboarded: boolean, orgId: string|null }}
 */
export async function getUserRoles(userId) {
  const { orgId } = await auth()

  let activeOrgId = orgId

  // If no active org in session, check Clerk backend directly.
  if (!activeOrgId) {
    try {
      const clerk = await clerkClient()
      const memberships = await clerk.users.getOrganizationMembershipList({
        userId,
        limit: 1,
      })
      if (memberships.data?.length > 0) {
        activeOrgId = memberships.data[0].organization.id
      }
    } catch (err) {
      console.error('Error checking org memberships:', err)
    }
  }

  const isManager = !!activeOrgId
  let hasOnboarded = false
  let isStaff = false

  if (isManager && activeOrgId) {
    const admin = createSupabaseAdminClient()
    const { data: org } = await admin
      .from(DB_TABLES.organizations)
      .select('onboarding_completed')
      .eq('organization_id', activeOrgId)
      .maybeSingle()

    hasOnboarded = !!org?.onboarding_completed
  }

  // Staff check — also use admin client since RLS may block
  try {
    const admin = createSupabaseAdminClient()
    const { data: staffRow } = await admin
      .from(DB_TABLES.staff)
      .select('staff_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    isStaff = !!staffRow
  } catch (err) {
    // Fine — user is not staff
  }

  return { isManager, isStaff, hasOnboarded, orgId: activeOrgId }
}