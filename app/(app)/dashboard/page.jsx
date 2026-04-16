import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import { getLastLocationId } from '@/app/lib/server/lastLocation'

export const dynamic = 'force-dynamic'

export default async function DashboardRootPage() {
  // Layout has already verified: authenticated, is manager, onboarded.
  const { userId, orgId } = await auth()
  if (!userId || !orgId) redirect('/onboarding')

  const supabase = await createSupabaseServerClient()

  // 1. Try last-visited location
  const lastLocationId = await getLastLocationId(userId, orgId)

  if (lastLocationId) {
    const { data: exists } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id')
      .eq('location_id', lastLocationId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (exists) {
      redirect(`/dashboard/${lastLocationId}`)
    }
  }

  // 2. Fallback: first location
  const { data: locations } = await supabase
    .from(DB_TABLES.locations)
    .select('location_id')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })
    .limit(1)

  if (locations && locations.length > 0) {
    redirect(`/dashboard/${locations[0].location_id}`)
  }

  // 3. No locations at all
  redirect('/dashboard/organization/add-location')
}