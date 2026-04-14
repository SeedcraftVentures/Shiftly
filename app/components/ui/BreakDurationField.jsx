'use client'

/**
 * BreakDurationField — Decimal-hours input with a "Paid?" toggle.
 * @param {object} props
 * @param {number} props.duration — Break duration in decimal hours (e.g. 0.5 = 30min)
 * @param {boolean} props.isPaid
 * @param {function} props.onDurationChange — Called with new decimal hours value
 * @param {function} props.onPaidChange — Called with new boolean
 */
export default function BreakDurationField({
  duration,
  isPaid,
  onDurationChange,
  onPaidChange,
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <input
          type="number"
          value={duration}
          onChange={e => {
            const v = e.target.value === '' ? 0 : parseFloat(e.target.value)
            if (!isNaN(v)) onDurationChange(Math.max(0, v))
          }}
          step={0.25}
          min={0}
          style={{
            width: 72,
            padding: '6px 10px',
            paddingRight: 28,
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            border: '1.5px solid var(--gray-200)',
            borderRadius: 8,
            color: 'var(--gray-800)',
            background: 'var(--gray-0)',
            outline: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 8,
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-400)',
            pointerEvents: 'none',
          }}
        >
          h
        </span>
      </div>

      <button
        onClick={() => onPaidChange(!isPaid)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 12px',
          borderRadius: 6,
          border: `1.5px solid ${isPaid ? 'var(--shiftly-pink)' : 'var(--gray-200)'}`,
          background: isPaid ? 'var(--shiftly-pink-light)' : 'var(--gray-0)',
          color: isPaid ? 'var(--shiftly-pink)' : 'var(--gray-500)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all .12s',
        }}
      >
        {isPaid ? 'Paid' : 'Unpaid'}
      </button>
    </div>
  )
}
