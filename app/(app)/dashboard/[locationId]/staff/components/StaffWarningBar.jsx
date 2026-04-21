'use client'

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function WarnIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function CrossIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function FixIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  )
}

function PlusIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StaffWarningBar({
  warnings, coverageMetrics, onStaffClick, onFixIssues,
}) {
  const hasCoverageIssue = coverageMetrics &&
    (coverageMetrics.status === 'shortfall' || coverageMetrics.status === 'tight')

  if (warnings.length === 0 && !hasCoverageIssue) return null

  const conflictCount = warnings.filter(w => w.type === 'conflict').length
  const issueCount = warnings.filter(w => w.type === 'issue').length

  const isShortfall = coverageMetrics?.status === 'shortfall'
  const coverageColor = isShortfall ? '#EF4444' : '#F97316'
  const coverageBg = isShortfall ? '#FEF2F2' : '#FFF7ED'
  const coverageBorder = isShortfall ? '#FECACA55' : '#FED7AA55'
  const coverageLabel = isShortfall ? 'Coverage shortfall' : 'Coverage tight'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

      {/* Staff issues row */}
      {warnings.length > 0 && (
        <div style={{
          padding: '8px 16px', background: '#FEF2F2',
          border: '1px solid #FECACA55', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: '#EF4444', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {warnings.length}
          </div>

          <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', flexShrink: 0 }}>
            Staff issue{warnings.length !== 1 ? 's' : ''}
            {conflictCount > 0 && issueCount > 0 && (
              <span style={{ fontWeight: 400, color: '#F87171', marginLeft: 4 }}>
                ({conflictCount} conflict{conflictCount !== 1 ? 's' : ''}, {issueCount} issue{issueCount !== 1 ? 's' : ''})
              </span>
            )}
          </span>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {warnings.slice(0, 6).map((w, i) => (
              <span
                key={i}
                onClick={() => onStaffClick(w.staffId)}
                style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 6,
                  background: '#fff', border: '1px dashed #FECACA',
                  color: '#374151', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: 99, background: w.teamColor, flexShrink: 0 }} />
                {w.staffName}
                {w.type === 'conflict' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '0 4px',
                    borderRadius: 3, background: '#FEE2E2', color: '#EF4444',
                  }}>
                    conflict
                  </span>
                )}
              </span>
            ))}
            {warnings.length > 6 && (
              <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600, alignSelf: 'center' }}>
                +{warnings.length - 6} more
              </span>
            )}
          </div>

          <button
            onClick={onFixIssues}
            style={{
              padding: '5px 14px', borderRadius: 8, border: 'none',
              background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <FixIcon size={11} />
            Fix Issues
          </button>
        </div>
      )}

      {/* Coverage warning row */}
      {hasCoverageIssue && (
        <div style={{
          padding: '8px 16px',
          background: coverageBg,
          border: `1px solid ${coverageBorder}`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: coverageColor, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isShortfall ? <CrossIcon size={11} /> : <WarnIcon size={11} />}
          </div>

          <span style={{ fontSize: 11, fontWeight: 600, color: coverageColor, flexShrink: 0 }}>
            {coverageLabel}
          </span>

          {coverageMetrics.suggestion && (
            <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>
              {coverageMetrics.suggestion}
            </span>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: '#9CA3AF', flexShrink: 0,
          }}>
            <span>{coverageMetrics.shiftHoursPerWeek}h shifts</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>{coverageMetrics.maxCapacityHours}h capacity</span>
          </div>

          {isShortfall && (
            <button
              onClick={onFixIssues}
              style={{
                padding: '5px 12px', borderRadius: 8, border: 'none',
                background: coverageColor, color: '#fff',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              }}
            >
              <PlusIcon size={11} />
              Add Staff
            </button>
          )}
        </div>
      )}
    </div>
  )
}