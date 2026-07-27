import { badges, BADGE_LABEL } from '@/lib/jobs/taxonomy'

// The three transparency signals, styled so the strongest reads loudest.
// pay: neutral (it is the baseline expectation). living wage / living hours:
// the pink accent, because those are the fairness signals the board is built on.
const STYLE = {
  pay: 'bg-gray-100 text-gray-600 border-gray-200',
  living_wage: 'bg-pink-50 text-pink-700 border-pink-200',
  living_hours: 'bg-pink-50 text-pink-700 border-pink-200',
}

const ICON = {
  // Small tick for pay, a spark for the fairness badges. Inline so no runtime cost.
  living_wage: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" aria-hidden="true">
      <path d="M10 1l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9 4.7 17.1l1-5.8L1.5 7.2l5.9-.9L10 1z" />
    </svg>
  ),
  living_hours: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 001.4-1.4L11 9.6V6z" clipRule="evenodd" />
    </svg>
  ),
}

/**
 * Transparency badges for a listing. `size` sm on cards, md on the detail page.
 * Returns null when there is nothing to show, so callers need no guard.
 */
export default function Badges({ job, size = 'sm', className = '' }) {
  const earned = badges(job)
  if (!earned.length) return null
  const pad = size === 'md' ? 'px-3 py-1 text-sm gap-1.5' : 'px-2 py-0.5 text-xs gap-1'
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {earned.map((key) => (
        <span
          key={key}
          className={`inline-flex items-center rounded-full border font-medium ${pad} ${STYLE[key]}`}
        >
          {ICON[key] || null}
          {BADGE_LABEL[key]}
        </span>
      ))}
    </div>
  )
}
