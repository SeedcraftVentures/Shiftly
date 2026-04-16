import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

/**
 * Returns the current user's roles.
 * Called from server components / layouts.
 *
 * @param {string} userId - Clerk user ID
 * @returns {{ isManager: boolean, isStaff: boolean, hasOnboarded: boolean }}
 */
export async function getUserRoles(userId) {
  const supabase = await createSupabaseServerClient()

  const [memberRes, staffRes] = await Promise.all([
    supabase
      .from(DB_TABLES.organizationMembers)
      .select('organization_id')
      .eq('member_user_id', userId)
      .maybeSingle(),
    supabase
      .from(DB_TABLES.staff)
      .select('staff_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ])

  const isManager = !!memberRes.data
  const isStaff = !!staffRes.data

  // Check onboarding completion if they're a manager
  let hasOnboarded = false
  if (isManager) {
    const { data: org } = await supabase
      .from(DB_TABLES.organizations)
      .select('onboarding_completed')
      .eq('organization_id', memberRes.data.organization_id)
      .single()

    hasOnboarded = !!org?.onboarding_completed
  }

  return { isManager, isStaff, hasOnboarded }
}