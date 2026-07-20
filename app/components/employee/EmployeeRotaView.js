'use client'

import { useState, useMemo } from 'react'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Shift type colours, matches manager rota view palette
const SHIFT_COLOURS = [
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
]

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDateShort(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatWeekRange(monday) {
  const sunday = addDays(monday, 6)
  const startMonth = monday.toLocaleDateString('en-GB', { month: 'short' })
  const endMonth = sunday.toLocaleDateString('en-GB', { month: 'short' })
  if (startMonth === endMonth) {
    return `${monday.getDate()} – ${sunday.getDate()} ${startMonth} ${monday.getFullYear()}`
  }
  return `${monday.getDate()} ${startMonth} – ${sunday.getDate()} ${endMonth} ${monday.getFullYear()}`
}

export default function EmployeeRotaView({ shifts = [], isLoading, onShiftTap }) {
  const [weekOffset, setWeekOffset] = useState(0)

  const currentMonday = useMemo(() => {
    const monday = getMonday(new Date())
    return addDays(monday, weekOffset * 7)
  }, [weekOffset])

  // Build a map of shift_name → colour index for consistent colouring (SA-04)
  const shiftColourMap = useMemo(() => {
    const uniqueNames = [...new Set(shifts.map(s => s.shift_name))]
    const map = {}
    uniqueNames.forEach((name, i) => {
      map[name] = SHIFT_COLOURS[i % SHIFT_COLOURS.length]
    })
    return map
  }, [shifts])

  // Filter shifts to the current visible week
  const weekShifts = useMemo(() => {
    const weekDates = DAY_NAMES.map((_, i) => {
      const d = addDays(currentMonday, i)
      return d.toISOString().split('T')[0]
    })

    return DAY_NAMES.map((day, i) => ({
      day,
      dayShort: DAY_SHORT[i],
      date: weekDates[i],
      dateObj: addDays(currentMonday, i),
      shifts: shifts.filter(s => s.date === weekDates[i])
    }))
  }, [shifts, currentMonday])

  // Total hours for this week (SA-05)
  const weekTotalHours = useMemo(() => {
    return weekShifts.reduce((sum, day) => {
      return sum + day.shifts.reduce((daySum, s) => daySum + (s.hours || 0), 0)
    }, 0)
  }, [weekShifts])

  const hasShiftsThisWeek = weekShifts.some(d => d.shifts.length > 0)
  const isCurrentWeek = weekOffset === 0
  const today = new Date().toISOString().split('T')[0]

  // Swipe support for mobile
  const [touchStart, setTouchStart] = useState(null)

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      setWeekOffset(prev => prev + (diff > 0 ? 1 : -1))
    }
    setTouchStart(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      {/* Week Navigation Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Previous week"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <h2 className="font-semibold text-gray-900 font-cal text-sm sm:text-base">
            {formatWeekRange(currentMonday)}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            {isCurrentWeek && (
              <span className="text-xs text-pink-600 font-medium">This week</span>
            )}
            {weekTotalHours > 0 && (
              <span className="text-xs text-gray-500">{weekTotalHours}h scheduled</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Next week"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Today button when not on current week */}
      {!isCurrentWeek && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs text-pink-600 font-medium hover:text-pink-700 transition-colors"
          >
            ← Back to this week
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
        </div>
      ) : !hasShiftsThisWeek ? (
        /* Empty state (SA-06) */
        <div className="p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-1">No shifts this week</p>
          <p className="text-sm text-gray-500">Try checking another week using the arrows above</p>
        </div>
      ) : (
        /* Week grid */
        <div
          className="divide-y divide-gray-100"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {weekShifts.map(({ day, dayShort, date, dateObj, shifts: dayShifts }) => {
            const isToday = date === today
            const isPast = date < today

            return (
              <div
                key={date}
                className={`px-4 py-3 flex items-start gap-3 ${
                  isToday ? 'bg-pink-50/50' : isPast ? 'opacity-60' : ''
                }`}
              >
                {/* Day label */}
                <div className={`w-14 flex-shrink-0 text-center pt-0.5 ${isToday ? '' : ''}`}>
                  <p className={`text-xs font-medium ${isToday ? 'text-pink-600' : 'text-gray-500'}`}>
                    {dayShort}
                  </p>
                  <p className={`text-lg font-bold leading-tight ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>
                    {dateObj.getDate()}
                  </p>
                  {isToday && (
                    <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mx-auto mt-0.5" />
                  )}
                </div>

                {/* Shifts for this day */}
                <div className="flex-1 min-w-0">
                  {dayShifts.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-1">Day off</p>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map((shift, idx) => {
                        const colour = shiftColourMap[shift.shift_name] || SHIFT_COLOURS[0]
                        return (
                          <button
                            key={idx}
                            onClick={() => onShiftTap?.(shift)}
                            className={`w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm active:scale-[0.98] ${colour.bg} ${colour.border}`}
                          >
                            <div className="flex items-center justify-between">
                              <p className={`font-medium text-sm ${colour.text}`}>
                                {shift.shift_name}
                              </p>
                              <p className={`text-xs font-medium ${colour.text}`}>
                                {shift.hours}h
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {shift.start_time} – {shift.end_time}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}