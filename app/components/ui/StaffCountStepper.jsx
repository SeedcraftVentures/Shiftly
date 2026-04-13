'use client'

/**
 * StaffCountStepper — Number stepper with -/+ buttons for staff count.
 * @param {object} props
 * @param {number} props.value
 * @param {function} props.onChange — Called with new numeric value
 * @param {number} [props.min=1]
 * @param {number} [props.max=99]
 */
export default function StaffCountStepper({ value, onChange, min = 1, max = 99 }) {
  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(Math.min(max, value + 1))

  const btnStyle = {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid var(--gray-200)',
    background: 'var(--gray-0)',
    color: 'var(--gray-600)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 6,
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button style={btnStyle} onClick={decrement} disabled={value <= min}>
        -
      </button>
      <input
        type="number"
        value={value}
        onChange={e => {
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)))
        }}
        style={{
          width: 44,
          height: 30,
          textAlign: 'center',
          border: '1.5px solid var(--gray-200)',
          borderRadius: 6,
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--gray-800)',
          background: 'var(--gray-0)',
          outline: 'none',
          padding: 0,
        }}
      />
      <button style={btnStyle} onClick={increment} disabled={value >= max}>
        +
      </button>
    </div>
  )
}
