'use client'

import { useState, useEffect, useMemo } from 'react'
import { T, Card, Button, Segmented, PAGE, PageHeader } from '@/app/components/ui/kit'
import { TEAM_COLORS } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'
import { fmtMoney, basisLabel } from '@/lib/pay'

// ════════════════════════════════════════════════════════════════════════════
//  REPORTS (live), labour cost from Rota Assignments × pay basis (same maths as
//  payroll). 8-week trend + per-team and per-basis breakdowns for the period.
// ════════════════════════════════════════════════════════════════════════════

const BASIS_COLOR = { hourly: T.muted, salary: '#6366F1', annualised: '#14B8A6' }
const prettyDate = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return s } }
function mondayStr(offsetWeeks = 0) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const shiftStr = (s, days) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }

function Stat({ label, value, sub }) {
  return <Card pad={18}>
    <p style={{ fontSize: 26, fontWeight: 800, color: T.ink, margin: 0, lineHeight: 1 }}>{value}</p>
    <p style={{ fontSize: 12.5, color: T.muted, margin: '7px 0 0', fontWeight: 600 }}>{label}</p>
    {sub && <p style={{ fontSize: 11.5, color: T.faint, margin: '2px 0 0' }}>{sub}</p>}
  </Card>
}

export default function ReportsPage() {
  const [weekStart, setWeekStart] = useState(() => mondayStr(0))
  const [weeks, setWeeks] = useState(1)
  const [projected, setProjected] = useState(false)
  const [teams, setTeams] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Projected = next 4 weeks from this Monday, published rotas only.
  const effStart = projected ? mondayStr(0) : weekStart
  const effWeeks = projected ? 4 : weeks

  useEffect(() => { fetch('/api/teams').then((r) => r.ok ? r.json() : []).then((t) => setTeams(t || [])).catch(() => {}) }, [])
  useEffect(() => {
    setLoading(true)
    const q = `start=${effStart}&weeks=${effWeeks}${projected ? '&status=Published' : ''}`
    fetch(`/api/reports?${q}`).then((r) => r.ok ? r.json() : null).then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [effStart, effWeeks, projected])

  const teamColor = useMemo(() => Object.fromEntries(teams.map((t, i) => [t.id, TEAM_COLORS[i % TEAM_COLORS.length]])), [teams])
  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams])

  const rangeLabel = effWeeks === 1 ? `w/c ${prettyDate(effStart)}` : `${prettyDate(effStart)} – ${prettyDate(shiftStr(effStart, effWeeks * 7 - 1))}`
  const series = data?.series || []
  const period = data?.period || { totalCost: 0, totalHours: 0, byTeam: [], byBasis: {} }
  const maxCost = Math.max(1, ...series.map((s) => s.cost))
  const byTeam = [...(period.byTeam || [])].sort((a, b) => b.cost - a.cost)
  const maxTeam = Math.max(1, ...byTeam.map((t) => t.cost))
  const avgRate = period.totalHours ? period.totalCost / period.totalHours : 0

  return (
    <div style={{ fontFamily: T.font, ...PAGE }}>
      <PageHeader
        title="Reports"
        subtitle={projected ? 'Projected labour cost from your published rotas — the next 4 weeks.' : `Labour cost for ${rangeLabel}.`}
        actions={<Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'projected', label: 'Projected' }]} value={projected ? 'projected' : 'actual'} onChange={(v) => setProjected(v === 'projected')} accent={T.pink} />}
      />

      {projected ? (
        <Card pad={14} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: T.pink + '0C', border: `1px solid ${T.pink}30` }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: T.pink, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: T.body }}><b style={{ color: T.ink }}>Projected · next 4 weeks</b> · {rangeLabel} · published rotas only</span>
        </Card>
      ) : (
        <Card pad={12} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftStr(weekStart, -7 * weeks))}>‹ Previous</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{rangeLabel}</span>
            <Segmented options={[{ value: 1, label: '1 wk' }, { value: 2, label: '2 wk' }, { value: 4, label: '4 wk' }]} value={weeks} onChange={setWeeks} accent={T.pink} size="sm" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftStr(weekStart, 7 * weeks))}>Next ›</Button>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Stat label="Labour cost" value={fmtMoney(period.totalCost)} sub={`${weeks} week${weeks > 1 ? 's' : ''}`} />
        <Stat label="Hours scheduled" value={`${Math.round(period.totalHours)}h`} />
        <Stat label="Blended cost / hour" value={fmtMoney(avgRate)} />
        <Stat label="Teams" value={byTeam.length} />
      </div>

      {/* trend */}
      <Card pad={22} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 18 }}>Labour cost · last 8 weeks</div>
        {loading ? <p style={{ fontSize: 13, color: T.muted }}>Loading…</p> : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
            {series.map((w, i) => {
              const inPeriod = i >= series.length - weeks
              const h = Math.round((w.cost / maxCost) * 120)
              return (
                <div key={w.weekStart} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: inPeriod ? T.ink : T.faint }}>{w.cost ? fmtMoney(w.cost, '£', 0) : ''}</span>
                  <div title={`${prettyDate(w.weekStart)} · ${fmtMoney(w.cost)}`} style={{ width: '100%', maxWidth: 46, height: Math.max(3, h), borderRadius: 7, background: inPeriod ? `linear-gradient(180deg, ${T.pink}, ${T.pink}cc)` : '#ECECF0', transition: 'height .3s' }} />
                  <span style={{ fontSize: 10, color: T.faint }}>{prettyDate(w.weekStart).replace(/ /, ' ')}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* by team */}
        <Card pad={22}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Cost by team</div>
          {byTeam.length === 0 ? <p style={{ fontSize: 13, color: T.faint, margin: 0 }}>No data for this period.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {byTeam.map((t) => (
                <div key={t.team_id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: T.body }}><span style={{ width: 9, height: 9, borderRadius: 99, background: teamColor[t.team_id] || T.muted }} />{teamName[t.team_id] || 'Team'}</span>
                    <span style={{ fontWeight: 700, color: T.ink }}>{fmtMoney(t.cost)} <span style={{ color: T.faint, fontWeight: 500 }}>· {Math.round(t.hours)}h</span></span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: T.track, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((t.cost / maxTeam) * 100)}%`, height: '100%', borderRadius: 99, background: teamColor[t.team_id] || T.muted }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* by basis */}
        <Card pad={22}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Cost by pay basis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['hourly', 'salary', 'annualised'].map((b) => {
              const v = period.byBasis?.[b] || { cost: 0, hours: 0 }
              const pct = period.totalCost ? Math.round((v.cost / period.totalCost) * 100) : 0
              return (
                <div key={b} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: T.body }}><span style={{ width: 9, height: 9, borderRadius: 99, background: BASIS_COLOR[b] }} />{basisLabel(b)}</span>
                  <span style={{ fontSize: 13, color: T.muted }}><b style={{ color: T.ink }}>{fmtMoney(v.cost)}</b> · {pct}%</span>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 11.5, color: T.faint, marginTop: 18, lineHeight: 1.5 }}>Hourly cost tracks hours worked; salaried &amp; annualised cost is fixed per period. Same figures as Payroll.</p>
        </Card>
      </div>
    </div>
  )
}
