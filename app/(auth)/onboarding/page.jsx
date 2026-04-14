import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import OnboardingWizard from './components/OnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createSupabaseServerClient()

  // Check if the user's org has already completed onboarding
  const { data: member } = await supabase
    .from(DB_TABLES.organizationMembers)
    .select('organization_id')
    .eq('member_user_id', userId)
    .maybeSingle()

  if (member) {
    const { data: org } = await supabase
      .from(DB_TABLES.organizations)
      .select('onboarding_completed')
      .eq('organization_id', member.organization_id)
      .maybeSingle()

    if (org?.onboarding_completed) {
      redirect('/dashboard')
    }
  }

  return <OnboardingWizard />
}