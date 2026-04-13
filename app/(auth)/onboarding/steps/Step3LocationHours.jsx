'use client'

import { DAYS_FULL } from '@/app/lib/constants'
import { StepChip, DayHoursGantt } from '@/app/components/ui'
import { ClockIcon } from '@/app/lib/icons'

export default function Step3LocationHours({ state }) {
  const { hours, updateDayHours, copyTo } = state

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <StepChip icon={<ClockIcon size={13} />} label="Hours" active />

      <h1 className="heading-page">When do you operate?</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 6px' }}>
        Open and Close times anchor your shift patterns.{' '}
        <span style={{ color: 'var(--team-purple)', fontWeight: 600 }}>First/Last shift</span>
        {' '}set when staff rotas begin and end.
      </p>

      <div style={{ flex: 1, overflowY: 'auto', marginTop: 14 }}>
        {DAYS_FULL.map(day => (
          <DayHoursGantt
            key={day}
            day={day}
            data={hours[day]}
            onChange={data => updateDayHours(day, data)}
            onCopyTo={target => copyTo(day, target)}
          />
        ))}
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 8 }}>
        You can adjust these anytime in Settings.
      </p>
    </div>
  )
}