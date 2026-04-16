import { auth } from '@clerk/nextjs/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

/**
 * Returns the current user's roles.
 * Called from server components / layouts.
 *
 * - Manager: user is a member of at least one Clerk organization
 *            AND has an active org selected with onboarding completed
 * - Staff:   user has a row in the Staff table linked to their Clerk id
 *
 * Dual-role (both) and none (fresh signup) are both possible.
 *
 * @param {string} userId - Clerk user ID
 * @returns {{ isManager: boolean, isStaff: boolean, hasOnboarded: boolean }}
 */
export async function getUserRoles(userId) {
  const { orgId } = await auth()

  const isManager = !!orgId
  let hasOnboarded = false

  if (isManager) {
    // Check onboarding completion on the active org
    const supabase = await createSupabaseServerClient()
    const { data: org } = await supabase
      .from(DB_TABLES.organizations)
      .select('onboarding_completed')
      .eq('organization_id', orgId)
      .maybeSingle()

    hasOnboarded = !!org?.onboarding_completed
  }

  // Staff check — user_id on Staff table
  const supabase = await createSupabaseServerClient()
  const { data: staffRow } = await supabase
    .from(DB_TABLES.staff)
    .select('staff_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  const isStaff = !!staffRow

  return { isManager, isStaff, hasOnboarded }
}