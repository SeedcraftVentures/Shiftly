import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import AddLocationWizard from '../components/AddLocationWizard'

export const dynamic = 'force-dynamic'

export default async function AddLocationPage() {
  const { userId, orgId, has } = await auth()
  if (!userId) redirect('/sign-in')
  if (!orgId) redirect('/onboarding')

  // Only users who can manage locations should see this wizard
  if (!has({ permission: 'org:locations:manage' })) {
    redirect('/dashboard')
  }

  const supabase = await createSupabaseServerClient()

  const { data: organization } = await supabase
    .from(DB_TABLES.organizations)
    .select('*')
    .eq('organization_id', orgId)
    .single()

  if (!organization) redirect('/onboarding')

  return <AddLocationWizard organization={organization} />
}