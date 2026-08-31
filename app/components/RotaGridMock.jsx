'use client'

// Faithful, on-brand recreation of a published rota week. Hand-built (no
// screenshot) so it always sizes cleanly in the hero collage and stays crisp.
// Palette stays in house style: monochrome with the pink accent, three shift
// tones so it reads as a real rota. No en/em dashes in copy.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TONES = {
  am: { bg: '#FCE7F1', fg: '#BE185D', label: '9-5' },
  pm: { bg: '#111827', fg: '#FFFFFF', label: '2-10' },
  cl: { bg: '#FF1F7D', fg: '#FFFFFF', label: '5-1' },
}

const ROWS = [
  { name: 'Sarah', shifts: ['am', 'am', null, 'pm', 'pm', 'cl', null] },
  { name: 'James', shifts: [null, 'pm', 'pm', 'pm', null, 'am', 'am'] },
  { name: 'Liam', shifts: ['cl', null, 'am', 'am', 'cl', 'cl', null] },
  { name: 'Emma', shifts: ['pm', 'pm', null, null, 'am', 'pm', 'pm'] },
]

export default function RotaGridMock() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 w-full">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">This week</p>
          <p className="text-[11px] text-gray-400 leading-tight">Front of house</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Published
        </span>
      </div>

      {/* grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: '48px repeat(7, minmax(0, 1fr))' }}>
        {/* day header row */}
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 pb-1">{d}</div>
        ))}

        {/* staff rows */}
        {ROWS.map((row) => (
          <FragmentRow key={row.name} row={row} />
        ))}
      </div>

      {/* footer legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
        <Legend tone="am" label="Open" />
        <Legend tone="pm" label="Mid" />
        <Legend tone="cl" label="Close" />
        <span className="ml-auto text-[10px] text-gray-400 font-medium">All hours met</span>
      </div>
    </div>
  )
}

function FragmentRow({ row }) {
  return (
    <>
      <div className="flex items-center text-[11px] font-semibold text-gray-700 truncate pr-1">{row.name}</div>
      {row.shifts.map((s, i) => {
        if (!s) return <div key={i} className="h-7 rounded-md bg-gray-50" />
        const t = TONES[s]
        return (
          <div
            key={i}
            className="h-7 rounded-md flex items-center justify-center text-[9px] font-bold"
            style={{ background: t.bg, color: t.fg }}
          >
            {t.label}
          </div>
        )
      })}
    </>
  )
}

function Legend({ tone, label }) {
  const t = TONES[tone]
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
      <span className="w-2.5 h-2.5 rounded" style={{ background: t.bg }} />
      {label}
    </span>
  )
}
