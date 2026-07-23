import JobBoard from '../JobBoard'

export const dynamic = 'force-dynamic'

// Distinct metadata: "hospitality jobs [city]" is its own high-intent search, so
// this page ranks for it rather than sharing the combined board's title.
export const metadata = {
  title: 'Hospitality Jobs in Scotland | Shiftly Jobs',
  description:
    'Bar, kitchen, waiting, barista and management roles across Scottish hospitality. See the pay before you apply.',
}

export default async function HospitalityJobsPage({ searchParams }) {
  return <JobBoard industry="hospitality" searchParams={await searchParams} />
}
