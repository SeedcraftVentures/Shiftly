import Nav from '@/app/components/Nav'
import Footer from '@/app/components/Footer'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'
import { currentEmployerId } from '@/lib/jobs/session'
import { supabaseAdmin } from '@/lib/db'
import ManageClient from './ManageClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Manage your jobs | Shiftly Jobs',
  robots: { index: false }, // a private dashboard, never indexed
}

export default async function ManagePage() {
  const employerId = await currentEmployerId()

  let employer = null
  if (employerId && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('Job Employers')
      .select('employer_id,name,email')
      .eq('employer_id', employerId)
      .maybeSingle()
    employer = data || null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav currentPage="jobs" />
      <HeatGlow as="header" palette={SHIFTLY_PALETTE} className="pt-32 pb-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-cal text-3xl sm:text-4xl lg:text-5xl text-white leading-[1.1] tracking-tight">
            {employer ? employer.name : 'Manage your jobs'}
          </h1>
          <p className="mt-4 text-lg text-white/85">
            {employer ? 'Edit, take down or repost the roles you have listed.' : 'Sign in to edit and take down your listings.'}
          </p>
        </div>
      </HeatGlow>
      <main className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* signedIn drives which view the client renders. The listings
              themselves are fetched client-side from a session-gated route. */}
          <ManageClient signedIn={Boolean(employer)} email={employer?.email || ''} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
