import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import OnboardingWizard from './components/OnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  // If the user has an active Clerk org and it's onboarded, kick them to dashboard
  if (orgId) {
    const supabase = await createSupabaseServerClient()
    const { data: org } = await supabase
      .from(DB_TABLES.organizations)
      .select('onboarding_completed')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (org?.onboarding_completed) {
      redirect('/dashboard')
    }
  }

  return <OnboardingWizard />
}