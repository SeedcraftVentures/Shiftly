'use client'

import { useState, useMemo } from 'react'

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1)
  // Monday = 0, Sunday = 6
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells = []

  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const date = new Date(year, month - 1, d)
    cells.push({ date, day: d, isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    cells.push({ date, day: d, isCurrentMonth: true })
  }

  // Next month padding
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d)
      cells.push({ date, day: d, isCurrentMonth: false })
    }
  }

  return cells
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a, b) {
  return toDateStr(a) === toDateStr(b)
}

function isBetween(date, start, end) {
  const d = toDateStr(date)
  const s = toDateStr(start)
  const e = toDateStr(end)
  return d > s && d < e
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CalendarRangePicker({ startDate, endDate, onSelect, shifts = [], existingTimeOff = [] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const cells = useMemo(() => getMonthData(viewYear, viewMonth), [viewYear, viewMonth])

  // Build lookup sets for shift days and approved time-off (TO-02)
  const shiftDays = useMemo(() => {
    const set = new Set()
    shifts.forEach(s => set.add(s.date))
    return set
  }, [shifts])

  const timeOffDays = useMemo(() => {
    const set = new Set()
    existingTimeOff.forEach(t => {
      const start = new Date(t.start_date)
      const end = new Date(t.end_date || t.start_date)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(toDateStr(d))
      }
    })
    return set
  }, [existingTimeOff])

  const handleDayClick = (date) => {
    const dateStr = toDateStr(date)
    const todayStr = toDateStr(today)
    if (dateStr < todayStr) return // TO-06: block past dates

    if (!startDate || (startDate && endDate)) {
      // First tap or reset
      onSelect(dateStr, null)
    } else if (dateStr < startDate) {
      // Tapped before start, reset to this date
      onSelect(dateStr, null)
    } else if (dateStr === startDate) {
      // Tapped same day, single day selection
      onSelect(dateStr, dateStr)
    } else {
      // Second tap, complete the range
      onSelect(startDate, dateStr)
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Swipe support
  const [touchStart, setTouchStart] = useState(null)
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) diff > 0 ? nextMonth() : prevMonth()
    setTouchStart(null)
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-semibold text-gray-900 font-cal">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(label => (
          <div key={label} className="text-center text-xs font-medium text-gray-400 py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dateStr = toDateStr(cell.date)
          const todayStr = toDateStr(today)
          const isPast = dateStr < todayStr
          const isToday = dateStr === todayStr
          const isCurrentMonth = cell.isCurrentMonth

          const isStart = startDate && dateStr === startDate
          const isEnd = endDate && dateStr === endDate
          const isInRange = startDate && endDate && isBetween(cell.date, new Date(startDate + 'T00:00:00'), new Date(endDate + 'T00:00:00'))
          const isSingleDay = isStart && isEnd

          const hasShift = shiftDays.has(dateStr)
          const hasTimeOff = timeOffDays.has(dateStr)

          let cellClasses = 'relative flex flex-col items-center justify-center h-10 text-sm transition-all '

          if (!isCurrentMonth) {
            cellClasses += 'text-gray-300 '
          } else if (isPast) {
            cellClasses += 'text-gray-300 cursor-not-allowed '
          } else if (isStart || isEnd) {
            cellClasses += 'font-bold '
          } else if (isInRange) {
            cellClasses += 'text-pink-700 '
          } else {
            cellClasses += 'text-gray-700 hover:bg-gray-100 cursor-pointer '
          }

          // Background styling for range
          let bgClasses = ''
          if (isSingleDay) {
            bgClasses = 'bg-pink-500 text-white rounded-lg '
          } else if (isStart) {
            bgClasses = 'bg-pink-500 text-white rounded-l-lg '
          } else if (isEnd) {
            bgClasses = 'bg-pink-500 text-white rounded-r-lg '
          } else if (isInRange) {
            bgClasses = 'bg-pink-100 '
          }

          return (
            <button
              key={i}
              type="button"
              disabled={isPast || !isCurrentMonth}
              onClick={() => isCurrentMonth && !isPast && handleDayClick(cell.date)}
              className={cellClasses + bgClasses}
              style={
                (isStart || isEnd) ? { backgroundColor: '#FF1F7D', color: 'white' } :
                isInRange ? { backgroundColor: '#FFF0F5' } : {}
              }
            >
              <span>{cell.day}</span>
              {/* Indicator dots (TO-02) */}
              {isCurrentMonth && !isPast && (hasShift || hasTimeOff) && (
                <div className="flex gap-0.5 absolute bottom-0.5">
                  {hasShift && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                  {hasTimeOff && <div className="w-1 h-1 rounded-full bg-gray-400" />}
                </div>
              )}
              {isToday && !isStart && !isEnd && (
                <div className="w-1 h-1 rounded-full absolute bottom-0.5" style={{ backgroundColor: '#FF1F7D' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Shift scheduled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span>Time off booked</span>
        </div>
      </div>
    </div>
  )
}