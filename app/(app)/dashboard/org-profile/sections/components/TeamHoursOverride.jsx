'use client'

import { useState } from 'react'
import { DayHoursGantt } from '@/app/components/ui'
import { DAYS_FULL } from '@/app/lib/constants'
import { convertTimetzToTime, convertTimeToTimetz } from '@/app/lib/utils/timeUtils'

/**
 * Per-day Gantt list for team hour overrides.
 *
 * Optimistic state: clicking "Override" flips a local `override` flag instantly,
 * then fires onSave in the background. Server response eventually repopulates
 * teamHours via the parent reload, but the UI doesn't wait.
 */
export default function TeamHoursOverride({ teamHours, locationHours, onSave }) {
  // Local optimistic state: day → { first_shift, last_shift } | null (inherited)
  // Initialized from server teamHours on mount.
  const [localOverrides, setLocalOverrides] = useState(() => {
    const map = {}
    teamHours.forEach(row => {
      if (row.start_time_override || row.end_time_override) {
        map[row.day] = {
          first_shift: convertTimetzToTime(row.start_time_override),
          last_shift: convertTimetzToTime(row.end_time_override),
        }
      }
    })
    return map
  })

  const openDays = DAYS_FULL.filter(day => locationHours.some(lh => lh.day === day))

  if (openDays.length === 0) {
    return (
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1.5px solid var(--gray-100)',
          background: 'var(--gray-50)',
        }}
      >
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', margin: 0 }}>
          Set location operating hours first to configure team overrides.
        </p>
      </div>
    )
  }

  const getLocationHoursForDay = (day) => {
    const row = locationHours.find(lh => lh.day === day)
    if (!row) return null
    return {
      opening: convertTimetzToTime(row.opening_time),
      closing: convertTimetzToTime(row.closing_time),
      first_shift: convertTimetzToTime(row.start_time),
      last_shift: convertTimetzToTime(row.end_time),
    }
  }

  const handleToggleInherit = (day) => {
    const isCurrentlyOverridden = !!localOverrides[day]

    if (isCurrentlyOverridden) {
      // Reset to inherit — clear locally and on server
      setLocalOverrides(prev => {
        const next = { ...prev }
        delete next[day]
        return next
      })
      onSave(day, null, null)
    } else {
      // Start overriding — seed with location values
      const loc = getLocationHoursForDay(day)
      if (!loc) return
      setLocalOverrides(prev => ({
        ...prev,
        [day]: { first_shift: loc.first_shift, last_shift: loc.last_shift },
      }))
      onSave(
        day,
        convertTimeToTimetz(loc.first_shift),
        convertTimeToTimetz(loc.last_shift)
      )
    }
  }

  const handleChange = (day, newData) => {
    // Update local state immediately, then save
    setLocalOverrides(prev => ({
      ...prev,
      [day]: {
        first_shift: newData.first_shift,
        last_shift: newData.last_shift,
      },
    }))
    onSave(
      day,
      convertTimeToTimetz(newData.first_shift),
      convertTimeToTimetz(newData.last_shift)
    )
  }

  return (
    <div
      style={{
        padding: '12px 14px',
        borderTop: '1.5px solid var(--gray-100)',
        background: 'var(--gray-50)',
      }}
    >
      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          margin: '0 0 10px',
        }}
      >
        Override when this team starts and ends on specific days. Days left as &ldquo;inherited&rdquo; use the location&apos;s hours.
      </p>

      {openDays.map(day => {
        const loc = getLocationHoursForDay(day)
        const override = localOverrides[day]
        const inherited = !override
        const displayData = inherited ? loc : { ...loc, ...override }

        return (
          <DayHoursGantt
            key={day}
            day={day}
            data={displayData}
            onChange={newData => handleChange(day, newData)}
            mode="team"
            inherited={inherited}
            inheritedFrom={loc}
            onToggleInherit={() => handleToggleInherit(day)}
          />
        )
      })}
    </div>
  )
}