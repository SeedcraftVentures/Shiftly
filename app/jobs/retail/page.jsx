import JobBoard from '../JobBoard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Retail Jobs in Scotland | Shiftly Jobs',
  description:
    'Shop floor, checkout, stock and store management roles across Scottish retail. See the pay before you apply.',
}

export default async function RetailJobsPage({ searchParams }) {
  return <JobBoard industry="retail" searchParams={await searchParams} />
}
