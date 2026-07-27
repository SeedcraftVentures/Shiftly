import Link from 'next/link'

// The industry toggle. Plain links (not client state) so every board is a real,
// shareable, crawlable URL. `active` is the current industry (null = All), and
// `hrefs` gives the three destinations, which differ between the main boards
// (route based) and a town page (query based, staying on the town).
export default function IndustryTabs({ active = null, hrefs }) {
  const tabs = [
    { key: null, label: 'All jobs', href: hrefs.all },
    { key: 'hospitality', label: 'Hospitality', href: hrefs.hospitality },
    { key: 'retail', label: 'Retail', href: hrefs.retail },
  ]
  return (
    <div className="mb-6 inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
      {tabs.map((t) => {
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
