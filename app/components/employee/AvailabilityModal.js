'use client'

import { useState, useEffect } from 'react'

// My availability, on the CURRENT data model.
//
// This previously fetched /api/teams/[id]/template and rendered a shift-slot grid
// keyed 'Mon-s1'. Both are dead: that endpoint belongs to the retired templates
// pipeline (and is manager-scoped, so it 500s for an employee), and nothing reads
// slot keys any more. Staff.availability is day-keyed, and that is what the solver
// consumes via availabilityGrid() in generate-rota:
//
//   { 0: true }            available all day (0 = Monday)
//   { 0: [9, 17] }         available 9am to 5pm
//   { 0: false } / absent  not available
//
// So this edits days directly. No team data needed, which also means it works
// before a manager has configured anything.

const DAYS = [
  { i: 0, label: 'Monday' }, { i: 1, label: 'Tuesday' }, { i: 2, label: 'Wednesday' },
  { i: 3, label: 'Thursday' }, { i: 4, label: 'Friday' }, { i: 5, label: 'Saturday' }, { i: 6, label: 'Sunday' },
]

const HOURS = Array.from({ length: 25 }, (_, h) => h)
const fmtHour = (h) => {
  if (h === 24) return 'midnight'
  const ap = h < 12 ? 'am' : 'pm'
  let hh = h % 12
  if (hh === 0) hh = 12
  return `${hh}${ap}`
}

const modeOf = (v) => (Array.isArray(v) ? 'window' : v ? 'all' : 'off')

export default function AvailabilityModal({ availabilityGrid, onSave, onClose, isPending }) {
  const [grid, setGrid] = useState(() => availabilityGrid || {})

  useEffect(() => { setGrid(availabilityGrid || {}) }, [availabilityGrid])

  const setDay = (i, value) => setGrid((g) => ({ ...g, [i]: value }))

  const setMode = (i, mode) => {
    if (mode === 'all') setDay(i, true)
    else if (mode === 'off') setDay(i, false)
    else {
      const current = grid[i]
      setDay(i, Array.isArray(current) ? current : [9, 17])
    }
  }

  const setBound = (i, which, value) => {
    const current = Array.isArray(grid[i]) ? grid[i] : [9, 17]
    const next = which === 'start' ? [value, current[1]] : [current[0], value]
    // Keep the window coherent rather than letting it invert.
    if (next[1] <= next[0]) next[which === 'start' ? 1 : 0] = which === 'start' ? Math.min(24, value + 1) : Math.max(0, value - 1)
    setDay(i, next)
  }

  const allDays = (value) => setGrid(Object.fromEntries(DAYS.map((d) => [d.i, value])))

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 font-cal">My Availability</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          Tell your manager when you can work. This is what the rota builder uses, so keeping it current means fewer shifts you can&apos;t do.
        </p>

        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => allDays(true)} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">All week</button>
          <button type="button" onClick={() => allDays(false)} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">Clear all</button>
        </div>

        <div className="space-y-2">
          {DAYS.map(({ i, label }) => {
            const mode = modeOf(grid[i])
            const win = Array.isArray(grid[i]) ? grid[i] : [9, 17]
            return (
              <div key={i} className={`rounded-xl border p-3 ${mode === 'off' ? 'border-gray-200 bg-gray-50' : 'border-pink-200 bg-pink-50/40'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-sm font-semibold ${mode === 'off' ? 'text-gray-400' : 'text-gray-900'}`}>{label}</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white">
                    {[['all', 'All day'], ['window', 'Hours'], ['off', 'Off']].map(([key, text]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMode(i, key)}
                        className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${mode === key ? 'bg-pink-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === 'window' && (
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={win[0]}
                      onChange={(e) => setBound(i, 'start', Number(e.target.value))}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
                    </select>
                    <span className="text-xs text-gray-500">to</span>
                    <select
                      value={win[1]}
                      onChange={(e) => setBound(i, 'end', Number(e.target.value))}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {HOURS.slice(1).map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(grid)}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-pink-500/25 transition-all"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
