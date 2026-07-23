import Link from 'next/link'
import ShiftlyLogo from '@/app/components/ShiftlyLogo'

// The job board's OWN header, distinct from the marketing FloatingNav. Using the
// marketing nav here made the board read like a careers page ("Shiftly's own
// jobs") rather than a product. This says "Shiftly Jobs, the board", carries the
// board's own actions (post, manage), and funnels back to Shiftly the rota
// software, which is what the board exists to sell.

const GLASS = 'bg-white/70 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'

export default function JobsNav() {
  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        {/* Shiftly Jobs lockup: the logo's "Shiftly" plus a pink "Jobs" reads as
            the product name, and links to the board home. */}
        <Link href="/jobs" aria-label="Shiftly Jobs home" className={`${GLASS} flex items-center rounded-full pl-3 pr-4 py-2`}>
          <ShiftlyLogo variant="default" size="sm" showPillbox={false} />
          <span className="ml-1.5 font-bold text-lg text-[#FF1F7D] leading-tight" style={{ fontFamily: "'Cal Sans', sans-serif" }}>
            Jobs
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Board actions */}
          <div className={`hidden sm:flex items-center gap-1 rounded-full px-2 py-1.5 ${GLASS}`}>
            <Link href="/jobs/post" className="px-4 py-2 text-sm font-medium text-gray-900 hover:text-pink-600 transition-colors rounded-full">
              Post a job
            </Link>
            <Link href="/jobs/manage" className="px-4 py-2 text-sm font-medium text-gray-900 hover:text-pink-600 transition-colors rounded-full">
              Manage
            </Link>
          </div>

          {/* Funnel back to the SaaS: this board is powered by Shiftly rota
              software, and an employer browsing it is the lead. */}
          <Link
            href="/"
            className="px-4 sm:px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap bg-white/70 backdrop-blur-md border-2 border-pink-500 text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:bg-white/90 hover:border-pink-600 hover:text-pink-600 transition-all"
          >
            Shiftly rota software →
          </Link>
        </div>
      </div>

      {/* On phones the post/manage links move under the pill so the top row stays
          the lockup plus the one CTA. */}
      <div className={`sm:hidden mt-2 flex items-center gap-1 rounded-full px-2 py-1.5 w-fit ${GLASS}`}>
        <Link href="/jobs/post" className="px-4 py-2 text-sm font-medium text-gray-900 hover:text-pink-600 rounded-full">Post a job</Link>
        <Link href="/jobs/manage" className="px-4 py-2 text-sm font-medium text-gray-900 hover:text-pink-600 rounded-full">Manage</Link>
      </div>
    </nav>
  )
}
