'use client'

export default function WarningBar({ warnings, onDayClick, onFixGaps }) {
  if (warnings.length === 0) return null
  return (
    <div style={{
      padding: '8px 16px', background: '#FEF2F2',
      border: '1px solid #FECACA55', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, background: '#EF4444', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>{warnings.length}</div>

      <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', flexShrink: 0 }}>
        Coverage gap{warnings.length !== 1 ? 's' : ''}
      </span>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
        {warnings.slice(0, 7).map((w, i) => (
          <span
            key={i}
            onClick={() => onDayClick(w.di)}
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 6,
              background: '#fff', border: '1px dashed #FECACA',
              color: '#374151', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: 99, background: w.teamColor, flexShrink: 0 }} />
            {w.teamName} / {w.day} {w.from}–{w.to}
          </span>
        ))}
        {warnings.length > 7 && (
          <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600, alignSelf: 'center' }}>
            +{warnings.length - 7} more
          </span>
        )}
      </div>

      <button
        onClick={onFixGaps}
        style={{
          padding: '5px 14px', borderRadius: 8, border: 'none',
          background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        ✦ Fix Gaps
      </button>
    </div>
  )
}