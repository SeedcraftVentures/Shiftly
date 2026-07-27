import JobBoard from './JobBoard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Hospitality & Retail Jobs in Scotland | Powered by Shiftly',
  description:
    'Bar, kitchen, waiting, shop floor and store roles across Scotland. See the pay before you apply.',
}

// The combined board: both industries, with the toggle to focus on one.
export default async function JobsPage({ searchParams }) {
  return <JobBoard industry={null} searchParams={await searchParams} />
}
