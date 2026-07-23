import { notFound } from 'next/navigation'
import JobBoard from '../../JobBoard'
import { resolveCity } from '@/lib/jobs/query'

export const dynamic = 'force-dynamic'

// Local landing page: /jobs/in/glasgow, /jobs/in/auchterarder. Shows every role
// in one town across both industries, with the toggle to focus. These are the
// URLs to advertise to a local high street, and each ranks for "jobs in [town]".

export async function generateMetadata({ params }) {
  const { town } = await params
  const city = await resolveCity(town)
  if (!city) return { title: 'Jobs not found | Shiftly Jobs' }
  return {
    title: `Jobs in ${city} | Shiftly Jobs`,
    description: `Hospitality and retail jobs in ${city}. See the pay before you apply, and find work close to home.`,
  }
}

export default async function TownJobsPage({ params, searchParams }) {
  const { town } = await params
  const city = await resolveCity(town)
  // No listings for this town (or a bad slug): 404 rather than an empty board.
  if (!city) notFound()
  return <JobBoard city={city} searchParams={await searchParams} />
}
