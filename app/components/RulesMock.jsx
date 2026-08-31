'use client'

// Fairness rules shown as a card of "on" toggles with a clean "0 rule breaks"
// summary. Interim mock; real screenshot can replace it, same layout.
const RULES = [
  'Contracted hours met',
  'No close then open',
  'Even weekends',
  'Rest between shifts',
  'Max days in a row',
  'Days off kept',
]

export default function RulesMock() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">Your rules</p>
        <span className="text-[11px] font-semibold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">All on</span>
      </div>
      <div className="space-y-2.5">
        {RULES.map((r) => (
          <div key={r} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm font-medium text-gray-800">{r}</span>
            <span className="w-9 h-5 rounded-full bg-pink-500 relative flex-shrink-0">
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" />
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="text-sm font-semibold text-gray-900">0 rule breaks this week</span>
      </div>
    </div>
  )
}
