import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRoles } from '@/app/lib/server/getUserRoles'

export const dynamic = 'force-dynamic'

export default async function MyLayout({ children }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { isManager, isStaff } = await getUserRoles(userId)

  // Not a staff member → not allowed in /my
  if (!isStaff) {
    if (isManager) redirect('/dashboard')
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}