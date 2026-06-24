'use client'

import { formatInitials } from '../utils/staffHelpers'

const FONT_HEADING = "'Cal Sans', 'Cal Sans Text', 'Plus Jakarta Sans', sans-serif"

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function CheckIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function WarnIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function CrossIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function PersonIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  )
}

function Avatar({ name, color }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 99, flexShrink: 0,
      background: color + '22', color, border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700,
    }}>
      {formatInitials(name)}
    </div>
  )
}

// ── FixIssuesModal ────────────────────────────────────────────────────────────

export default function FixIssuesModal({
  warnings, teams, coverageMetrics,
  selectedFixes, onToggleFix, onConfirm, onClose,
}) {
  // Fixable availability issues (type === 'issue', not conflict)
  const fixableWarnings = warnings.filter(w => w.type === 'issue')
  const conflictWarnings = warnings.filter(w => w.type === 'conflict')

  // Coverage issue
  const hasCoverageIssue = coverageMetrics &&
    (coverageMetrics.status === 'shortfall' || coverageMetrics.status === 'tight')

  const selectedCount = Object.values(selectedFixes).filter(Boolean).length
  const totalFixable = fixableWarnings.length

  const getTeamColor = (teamId) => {
    const team = teams.find(t => t.id === teamId)
    return team?.color || '#9CA3AF'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              fontFamily: FONT_HEADING,
              fontSize: 16, fontWeight: 700, color: '#111827', margin: 0,
            }}>Suggested Fixes</h2>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
              {totalFixable > 0
                ? `${totalFixable} issue${totalFixable !== 1 ? 's' : ''} can be resolved automatically`
                : 'No auto-fixable issues found'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7,
            border: '1px solid #E5E7EB', background: '#F9FAFB',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6B7280', fontSize: 14,
          }}>
            <CrossIcon size={11} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 22px', maxHeight: 420, overflowY: 'auto' }}>

          {/* Coverage recommendation */}
          {hasCoverageIssue && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                letterSpacing: 0.8, marginBottom: 8,
              }}>COVERAGE RECOMMENDATION</div>

              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: coverageMetrics.status === 'shortfall' ? '#FEF2F2' : '#FFF7ED',
                border: `1px solid ${coverageMetrics.status === 'shortfall' ? '#FECACA' : '#FED7AA'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: coverageMetrics.status === 'shortfall' ? '#EF4444' : '#F97316',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {coverageMetrics.status === 'shortfall'
                      ? <CrossIcon size={12} />
                      : <WarnIcon size={12} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: coverageMetrics.status === 'shortfall' ? '#EF4444' : '#F97316',
                      marginBottom: 4, fontFamily: FONT_HEADING,
                    }}>
                      {coverageMetrics.status === 'shortfall' ? 'Coverage Shortfall' : 'Coverage Tight'}
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 8 }}>
                      {coverageMetrics.suggestion}
                    </div>
                    <div style={{
                      display: 'flex', gap: 16, fontSize: 11,
                    }}>
                      <div>
                        <span style={{ color: '#9CA3AF' }}>Shifts/wk </span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{coverageMetrics.shiftHoursPerWeek}h</span>
                      </div>
                      <div>
                        <span style={{ color: '#9CA3AF' }}>Contracted </span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{coverageMetrics.contractedHours}h</span>
                      </div>
                      <div>
                        <span style={{ color: '#9CA3AF' }}>Max capacity </span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{coverageMetrics.maxCapacityHours}h</span>
                      </div>
                      <div>
                        <span style={{ color: '#9CA3AF' }}>Gap </span>
                        <span style={{ fontWeight: 700, color: '#EF4444' }}>
                          +{Math.abs(coverageMetrics.deltaFromMax)}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 7,
                  background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)',
                  fontSize: 11, color: '#6B7280', fontStyle: 'italic',
                }}>
                  This requires manual action — add staff members on this page or increase max hours on existing staff.
                </div>
              </div>
            </div>
          )}

          {/* Auto-fixable availability issues */}
          {fixableWarnings.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                letterSpacing: 0.8, marginBottom: 8,
              }}>AUTO-FIXABLE — SET AVAILABILITY TO ALL DAYS</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fixableWarnings.map((w, i) => {
                  const key = `${w.staffId}-issue`
                  const checked = selectedFixes[key] || false
                  const color = getTeamColor(w.staffId)

                  return (
                    <div
                      key={i}
                      onClick={() => onToggleFix(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: checked ? '1.5px solid #FF1F7D' : '1px solid #E5E7EB',
                        background: checked ? '#FFF0F5' : '#F9FAFB',
                        transition: 'all .1s',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: checked ? 'none' : '1.5px solid #D1D5DB',
                        background: checked ? '#FF1F7D' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                      }}>
                        {checked && <CheckIcon size={10} />}
                      </div>
                      <Avatar name={w.staffName} color={w.teamColor} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                          {w.staffName}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                          {w.message} — will be set to available all days
                        </div>
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px',
                        borderRadius: 5, background: w.teamColor + '18', color: w.teamColor,
                      }}>
                        {w.teamName}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual-only conflict warnings */}
          {conflictWarnings.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#9CA3AF',
                letterSpacing: 0.8, marginBottom: 8,
              }}>MANUAL RESOLUTION REQUIRED</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {conflictWarnings.map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #FEE2E2', background: '#FFF5F5',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      background: '#FEE2E2', color: '#EF4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <WarnIcon size={10} />
                    </div>
                    <Avatar name={w.staffName} color={w.teamColor} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>
                        {w.staffName}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>
                        {w.message}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3, fontStyle: 'italic' }}>
                        Edit availability rules manually on this staff member's card
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All clear */}
          {fixableWarnings.length === 0 && conflictWarnings.length === 0 && !hasCoverageIssue && (
            <div style={{
              textAlign: 'center', padding: '32px 0',
              color: '#9CA3AF',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 99,
                background: '#DCFCE7', color: '#16A34A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <CheckIcon size={20} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, fontFamily: FONT_HEADING }}>
                All clear
              </div>
              <div style={{ fontSize: 12 }}>All staff availability looks good.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px 16px',
          borderTop: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
            {totalFixable > 0
              ? `${selectedCount} of ${totalFixable} selected`
              : 'No auto-fixes available'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid #E5E7EB', background: '#fff',
              color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={selectedCount === 0}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: selectedCount > 0 ? '#FF1F7D' : '#F3F4F6',
                color: selectedCount > 0 ? '#fff' : '#9CA3AF',
                fontSize: 12, fontWeight: 600,
                cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Apply {selectedCount > 0 ? selectedCount : ''} Fix{selectedCount !== 1 ? 'es' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}