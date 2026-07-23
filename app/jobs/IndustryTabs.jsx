import Link from 'next/link'

// The industry toggle. Plain links (not client state) so each board is a real,
// shareable, crawlable URL. `active` is the current industry, or null for the
// combined /jobs view.
const TABS = [
  { key: null, label: 'All jobs', href: '/jobs' },
  { key: 'hospitality', label: 'Hospitality', href: '/jobs/hospitality' },
  { key: 'retail', label: 'Retail', href: '/jobs/retail' },
]

export default function IndustryTabs({ active = null }) {
  return (
    <div className="mb-6 inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
      {TABS.map((t) => {
        const on = t.key === active
        return (
          <Link
            key={t.label}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              on ? 'bg-[#FF1F7D] text-white' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
