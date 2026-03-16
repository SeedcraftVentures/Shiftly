'use client'

import { useMemo } from 'react'
import { DAYS, GANTT_START, GANTT_HOURS, decimalToLabel, getDayLabel, getTeamGaps } from '../utils/shifthelpers'

function buildRecommendations(allShifts, teams) {
  const rawGaps = []

  DAYS.forEach((_, di) => {
    teams.forEach(team => {
      getTeamGaps(allShifts, team.id, di).forEach(g => {
        rawGaps.push({
          teamId: team.id,
          teamName: team.team_name,
          teamColor: team.color,
          di,
          startH: g.s,
          endH: g.e,
        })
      })
    })
  })

  const key = g => `${g.teamId}|${g.startH}|${g.endH}`
  const grouped = {}
  rawGaps.forEach(g => {
    const k = key(g)
    if (!grouped[k]) grouped[k] = { ...g, days: [] }
    if (!grouped[k].days.includes(g.di)) grouped[k].days.push(g.di)
  })

  return Object.values(grouped).map((rec, i) => {
    rec.days.sort((a, b) => a - b)
    return {
      ...rec,
      id: `rec-${i}`,
      duration: rec.endH - rec.startH,
      daysLabel: getDayLabel(rec.days),
      fromLabel: decimalToLabel(rec.startH),
      toLabel: decimalToLabel(rec.endH),
    }
  })
}

// ── Recommendation Card ───────────────────────────────────────────────────────

function RecCard({ rec, selected, onToggle }) {
  const { teamColor } = rec

  return (
    <div
      onClick={onToggle}
      style={{
        borderRadius: 12, padding: '14px 16px', cursor: 'pointer', marginBottom: 8,
        border: selected ? `2px solid ${teamColor}` : '1px solid #E5E7EB',
        background: selected ? teamColor + '08' : '#fff',
        transition: 'all .15s',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {/* Checkbox */}
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: selected ? `2px solid ${teamColor}` : '2px solid #D1D5DB',
          background: selected ? teamColor : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}>
          {selected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
          New shift: {rec.fromLabel} – {rec.toLabel}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px',
          borderRadius: 99, background: '#F3F4F6', color: '#374151',
        }}>
          {rec.duration}h
        </span>
      </div>

      {/* Mini Gantt */}
      <div style={{
        height: 22, background: '#F3F4F6', borderRadius: 5,
        position: 'relative', overflow: 'hidden', marginBottom: 8,
      }}>
        <div style={{
          position: 'absolute',
          left: `${((rec.startH - GANTT_START) / GANTT_HOURS) * 100}%`,
          width: `${((rec.endH - rec.startH) / GANTT_HOURS) * 100}%`,
          top: 2, bottom: 2, borderRadius: 4,
          background: selected ? teamColor : teamColor + '55',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600, color: '#fff',
          transition: 'background .15s',
        }}>
          {rec.fromLabel} – {rec.toLabel}
        </div>
      </div>

      {/* Day pills */}
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {DAYS.map((d, di) => (
          <div key={di} style={{
            width: 26, height: 22, borderRadius: 5,
            fontSize: 9, fontWeight: 600,
            background: rec.days.includes(di) ? teamColor : '#F3F4F6',
            color: rec.days.includes(di) ? '#fff' : '#9CA3AF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {d.slice(0, 2)}
          </div>
        ))}
        <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 6 }}>{rec.daysLabel}</span>
      </div>
    </div>
  )
}

// ── FixGapsModal ──────────────────────────────────────────────────────────────

export default function FixGapsModal({
  allShifts,
  teams,
  selectedRecs,
  onToggleRec,
  onConfirm,
  onClose,
}) {
  const recommendations = useMemo(
    () => buildRecommendations(allShifts, teams),
    [allShifts, teams]
  )

  const selCount = Object.values(selectedRecs).filter(Boolean).length

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, width: 580, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Recommended Shifts</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {recommendations.length} shift pattern{recommendations.length !== 1 ? 's' : ''} to fill coverage gaps
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E7EB',
              background: '#fff', cursor: 'pointer', fontSize: 18, color: '#6B7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No gaps to fill!</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Your shift patterns have full coverage.</div>
            </div>
          ) : (
            teams.map(team => {
              const teamRecs = recommendations.filter(r => r.teamId === team.id)
              if (!teamRecs.length) return null
              return (
                <div key={team.id} style={{ marginBottom: 20 }}>
                  {/* Team header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 11, height: 11, borderRadius: 3, background: team.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: team.color }}>
                      {team.team_name}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {teamRecs.length} recommendation{teamRecs.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ flex: 1, height: 1, background: team.color + '20' }} />
                  </div>

                  {teamRecs.map(rec => (
                    <RecCard
                      key={rec.id}
                      rec={rec}
                      selected={!!selectedRecs[rec.id]}
                      onToggle={() => onToggleRec(rec.id)}
                    />
                  ))}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>
            {selCount} of {recommendations.length} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 8,
                border: '1px solid #E5E7EB', background: '#fff',
                fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={() => onConfirm(recommendations)}
              disabled={selCount === 0}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: selCount > 0 ? '#FF1F7D' : '#E5E7EB',
                color: selCount > 0 ? '#fff' : '#9CA3AF',
                fontSize: 12, fontWeight: 600,
                cursor: selCount > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Add {selCount} Shift{selCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}