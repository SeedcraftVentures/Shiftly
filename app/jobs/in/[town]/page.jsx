import { notFound } from 'next/navigation'
import JobBoard from '../../JobBoard'
import { resolveTown } from '@/lib/jobs/query'

export const dynamic = 'force-dynamic'

// Local landing page: /jobs/in/glasgow, /jobs/in/auchterarder. Shows every role
// in one town across both industries, with the toggle to focus. A town with no
// jobs yet (but on the seeded target list) renders a "be the first to post"
// page so the URL can be advertised locally to seed postings. Unknown slugs 404.

export async function generateMetadata({ params }) {
  const { town } = await params
  const t = await resolveTown(town)
  if (!t) return { title: 'Jobs not found | Shiftly Jobs' }
  return {
    title: `Jobs in ${t.name} | Shiftly Jobs`,
    description: `Hospitality and retail jobs in ${t.name}. See the pay before you apply, and find work close to home.`,
  }
}

export default async function TownJobsPage({ params, searchParams }) {
  const { town } = await params
  const t = await resolveTown(town)
  // Not a live city and not a seeded target town: 404 rather than an empty board.
  if (!t) notFound()
  return <JobBoard city={t.name} searchParams={await searchParams} />
}
