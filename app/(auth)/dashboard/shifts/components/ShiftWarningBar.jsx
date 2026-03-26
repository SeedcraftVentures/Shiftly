'use client'

export default function ShiftWarningBar({ warnings, onDayClick, onFixGaps }) {
  if (warnings.length === 0) return null

  const rootStyle = {
    padding: '8px 16px',
    background: 'var(--red-50)',
    border: '1px solid rgb(from var(--red-200) r g b / 33%)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  }

  const dangerBadgeStyle = {
    width: 22,
    height: 22,
    borderRadius: 6,
    background: 'var(--red-500)',
    color: 'var(--gray-0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  }

  const warningLabelStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--red-500)',
    flexShrink: 0,
  }

  const warningsListStyle = {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    flex: 1,
  }

  const warningChipStyle = {
    fontSize: '0.75rem',
    padding: '3px 8px',
    borderRadius: 6,
    background: 'var(--gray-0)',
    border: '1px dashed var(--red-200)',
    color: 'var(--gray-700)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  const teamDotStyle = {
    width: 6,
    height: 6,
    borderRadius: 99,
    flexShrink: 0,
  }

  const moreLabelStyle = {
    fontSize: '0.75rem',
    color: 'var(--red-500)',
    fontWeight: 600,
    alignSelf: 'center',
  }

  const fixGapsButtonStyle = {
    padding: '5px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--red-500)',
    color: 'var(--gray-0)',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }

  return (
    <div style={rootStyle}>
      <div style={dangerBadgeStyle}>{warnings.length}</div>

      <span style={warningLabelStyle}>
        Coverage gap{warnings.length !== 1 ? 's' : ''}
      </span>

      <div style={warningsListStyle}>
        {warnings.slice(0, 7).map((w, i) => (
          <span
            key={i}
            onClick={() => onDayClick(w.di)}
            style={warningChipStyle}
          >
            <div
              style={{
                ...teamDotStyle,
                background: w.teamColor,
              }}
            />
            {w.teamName} / {w.day} {w.from}–{w.to}
          </span>
        ))}
        {warnings.length > 7 && (
          <span style={moreLabelStyle}>
            +{warnings.length - 7} more
          </span>
        )}
      </div>

      <button
        onClick={onFixGaps}
        style={fixGapsButtonStyle}
      >
        ✦ Fix Gaps
      </button>
    </div>
  )
}