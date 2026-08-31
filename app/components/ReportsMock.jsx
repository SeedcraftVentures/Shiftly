'use client'

// Interim, on-brand mock for the Reports and Payroll showcase. A small labour-cost
// bar chart plus a short pay list. Placeholder for real screenshots or video later.
// Plain copy, no dashes.
const WEEKS = [
  { w: 'Wk 10', h: 62 },
  { w: 'Wk 11', h: 74 },
  { w: 'Wk 12', h: 68 },
  { w: 'Wk 13', h: 88, live: true },
]

const PAY = [
  { name: 'Sarah H.', hours: '38h', pay: '£494' },
  { name: 'James M.', hours: '31h', pay: '£403' },
  { name: 'Liam O.', hours: '40h', pay: '£520' },
]

export default function ReportsMock() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full">
      {/* chart header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Labour cost</p>
          <p className="text-[11px] text-gray-400 leading-tight">Next four weeks</p>
        </div>
        <span className="font-cal text-2xl font-bold text-gray-900">£1,911</span>
      </div>

      {/* bars */}
      <div className="mb-5">
        <div className="flex items-end justify-between gap-3 h-28">
          {WEEKS.map((wk) => (
            <div key={wk.w} className="flex-1 h-full flex items-end">
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: `${wk.h}%`, background: wk.live ? '#FF1F7D' : '#F6CEE0' }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-3 mt-2">
          {WEEKS.map((wk) => (
            <span key={wk.w} className={`flex-1 text-center text-[10px] font-medium ${wk.live ? 'text-pink-600' : 'text-gray-400'}`}>{wk.w}</span>
          ))}
        </div>
      </div>

      {/* payroll list */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pay this week</p>
          <span className="text-[10px] text-gray-400">from the rota</span>
        </div>
        <div className="space-y-2">
          {PAY.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{p.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-gray-400 text-xs">{p.hours}</span>
                <span className="font-semibold text-gray-900 w-12 text-right">{p.pay}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
