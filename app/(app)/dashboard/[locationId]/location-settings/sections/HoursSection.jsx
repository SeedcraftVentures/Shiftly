'use client'

import { useState } from 'react'
import { Section, DayHoursGantt } from '@/app/components/ui'
import {
  DAYS_FULL,
  DEFAULT_DAY_HOURS,
  DEFAULT_OPENING_TIME,
  DEFAULT_CLOSING_TIME,
  DEFAULT_FIRST_SHIFT_TIME,
  DEFAULT_LAST_SHIFT_TIME,
} from '@/app/lib/constants'
import { convertTimetzToTime, convertTimeToTimetz } from '@/app/lib/utils/timeUtils'

function buildHoursMap(locationHours) {
  const map = {}
  DAYS_FULL.forEach(day => {
    const row = locationHours.find(r => r.day === day)
    if (row) {
      map[day] = {
        open: true,
        opening: convertTimetzToTime(row.opening_time) || DEFAULT_OPENING_TIME,
        closing: convertTimetzToTime(row.closing_time) || DEFAULT_CLOSING_TIME,
        first_shift: convertTimetzToTime(row.start_time) || DEFAULT_FIRST_SHIFT_TIME,
        last_shift: convertTimetzToTime(row.end_time) || DEFAULT_LAST_SHIFT_TIME,
      }
    } else {
      map[day] = { ...DEFAULT_DAY_HOURS }
    }
  })
  return map
}

function serializeDay(day, d) {
  if (!d.open) return { day, open: false }
  return {
    day,
    open: true,
    opening_time: convertTimeToTimetz(d.opening),
    closing_time: convertTimeToTimetz(d.closing),
    start_time: convertTimeToTimetz(d.first_shift),
    end_time: convertTimeToTimetz(d.last_shift),
  }
}

export default function HoursSection({ locationHours, onSave }) {
  const [hours, setHours] = useState(() => buildHoursMap(locationHours))

  const handleChange = (day, newData) => {
    setHours(prev => ({ ...prev, [day]: newData }))
    onSave(serializeDay(day, newData))
  }

  const handleCopyTo = (sourceDay, target) => {
    const source = hours[sourceDay]
    let targetDays = []
    if (target === 'all') targetDays = DAYS_FULL
    else if (target === 'weekdays') targetDays = DAYS_FULL.slice(0, 5)
    else if (target === 'weekends') targetDays = DAYS_FULL.slice(5)
    else targetDays = [target]

    const updated = { ...hours }
    targetDays.forEach(day => {
      updated[day] = { ...source }
      onSave(serializeDay(day, updated[day]))
    })
    setHours(updated)
  }

  return (
    <Section title="Operating Hours" description="Public hours and staff shift window for each day">
      {DAYS_FULL.map(day => (
        <DayHoursGantt
          key={day}
          day={day}
          data={hours[day]}
          onChange={d => handleChange(day, d)}
          onCopyTo={target => handleCopyTo(day, target)}
        />
      ))}
    </Section>
  )
}