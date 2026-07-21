import Nav from '@/app/components/Nav'
import Footer from '@/app/components/Footer'
import { HeatGlow, SHIFTLY_PALETTE } from '@/app/components/HeatGlow'
import PostForm from './PostForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Post a hospitality job for free | Shiftly Jobs',
  description:
    'Post a hospitality job to Shiftly Jobs for free. State the pay and the hours and your listing is featured at the top of the board.',
}

// Open to anyone. Identity is captured at the end, when the employer joins the
// waitlist to publish, not as a toll gate before they have written anything.
export default async function PostJobPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav currentPage="jobs" />

      <HeatGlow as="header" palette={SHIFTLY_PALETTE} className="pt-32 pb-14 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-cal text-3xl sm:text-4xl lg:text-5xl text-white leading-[1.1] tracking-tight">
            Post a job, free
          </h1>
          <p className="mt-4 text-lg text-white/85 max-w-2xl">
            Every listing on Shiftly Jobs states what it pays and when you would work.
            Tell us both and your role goes to the top of the board.
          </p>
        </div>
      </HeatGlow>

      <main className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <PostForm />
        </div>
      </main>

      <Footer />
    </div>
  )
}
