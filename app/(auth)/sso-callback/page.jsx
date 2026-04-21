import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRoles } from '@/app/lib/server/getUserRoles'

export const dynamic = 'force-dynamic'

export default async function AuthRoutingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { isManager, isStaff, hasOnboarded } = await getUserRoles(userId)

  if (isManager && hasOnboarded) redirect('/dashboard')
  if (isManager && !hasOnboarded) redirect('/onboarding')
  if (isStaff) redirect('/my')

  // No org, not staff —> new user
  redirect('/onboarding')
}