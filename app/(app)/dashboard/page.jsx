import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

export default async function DashboardRootPage() {
  // Layout has already verified: authenticated, is manager, onboarded.
  const { userId } = await auth()
  const supabase = await createSupabaseServerClient()

  const { data: user } = await supabase
    .from(DB_TABLES.users)
    .select('last_location_id')
    .eq('user_id', userId)
    .single()

  if (user?.last_location_id) {
    redirect(`/dashboard/${user.last_location_id}`)
  }

  // Fallback: pick first accessible location
  const { data: membership } = await supabase
    .from(DB_TABLES.organizationMembers)
    .select('organization_id')
    .eq('member_user_id', userId)
    .single()

  const { data: locations } = await supabase
    .from(DB_TABLES.locations)
    .select('location_id')
    .eq('organization_id', membership.organization_id)
    .order('name')
    .limit(1)

  if (locations && locations.length > 0) {
    redirect(`/dashboard/${locations[0].location_id}`)
  }

  // Manager with no locations, shouldn't be possible post-onboarding,
  // but handle gracefully
  redirect('/dashboard/organization/add-location')
}