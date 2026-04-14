import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import AddLocationWizard from '../components/AddLocationWizard'

export const dynamic = 'force-dynamic'

export default async function AddLocationPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createSupabaseServerClient()

  // Fetch the user's org (for industry presets + currency inheritance)
  const { data: member } = await supabase
    .from(DB_TABLES.organizationMembers)
    .select('organization_id')
    .eq('member_user_id', userId)
    .single()

  if (!member) redirect('/onboarding')

  const { data: organization } = await supabase
    .from(DB_TABLES.organizations)
    .select('*')
    .eq('organization_id', member.organization_id)
    .single()

  if (!organization) redirect('/onboarding')
  if (organization.owner_user_id !== userId) redirect('/dashboard')

  return <AddLocationWizard organization={organization} />
}