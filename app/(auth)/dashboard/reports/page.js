'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTheme, Card, Button, Segmented, PAGE, PageHeader } from '@/app/components/ui/kit'
import { TEAM_COLORS } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'
import { fmtMoney, basisLabel } from '@/lib/pay'

// ════════════════════════════════════════════════════════════════════════════
//  REPORTS (live) - labour cost from Rota Assignments x pay basis (same maths as
//  payroll). 8-week trend + per-team and per-basis breakdowns for the period.
// ════════════════════════════════════════════════════════════════════════════

const prettyDate = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return s } }
function mondayStr(offsetWeeks = 0) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const shiftStr = (s, days) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }

function Stat({ label, value, sub }) {
  const { T } = useTheme()
  return <Card pad={18}>
    <p style={{ fontSize: 26, fontWeight: 800, color: T.ink, margin: 0, lineHeight: 1 }}>{value}</p>
    <p style={{ fontSize: 12.5, color: T.muted, margin: '7px 0 0', fontWeight: 600 }}>{label}</p>
    {sub && <p style={{ fontSize: 11.5, color: T.faint, margin: '2px 0 0' }}>{sub}</p>}
  </Card>
}

export default function ReportsPage() {
  const { T } = useTheme()
  const BASIS_COLOR = { hourly: T.muted, salary: '#6366F1', annualised: '#14B8A6' }
  const [weekStart, setWeekStart] = useState(() => mondayStr(0))
  const [weeks, setWeeks] = useState(1)
  const [projected, setProjected] = useState(false)
  const [teams, setTeams] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('labour') // 'labour' | 'leave'

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

  const rangeLabel = effWeeks === 1 ? `w/c ${prettyDate(effStart)}` : `${prettyDate(effStart)} to ${prettyDate(shiftStr(effStart, effWeeks * 7 - 1))}`
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
        subtitle={view === 'leave' ? 'Holiday and sick, per person, for the current holiday year.' : projected ? 'Projected labour cost from your published rotas, the next 4 weeks.' : `Labour cost for ${rangeLabel}.`}
        actions={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Segmented options={[{ value: 'labour', label: 'Labour' }, { value: 'leave', label: 'Holidays & sick' }]} value={view} onChange={setView} accent={T.pink} />
          {view === 'labour' && <Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'projected', label: 'Projected' }]} value={projected ? 'projected' : 'actual'} onChange={(v) => setProjected(v === 'projected')} accent={T.pink} />}
        </div>}
      />

      {view === 'leave' && <LeaveView T={T} teamColor={teamColor} teamName={teamName} />}

      {view === 'labour' && (<>
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
                  <div title={`${prettyDate(w.weekStart)} · ${fmtMoney(w.cost)}`} style={{ width: '100%', maxWidth: 46, height: Math.max(3, h), borderRadius: 7, background: inPeriod ? `linear-gradient(180deg, ${T.pink}, ${T.pink}cc)` : T.track, transition: 'height .3s' }} />
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
      </>)}
    </div>
  )
}

// ── Holidays & sick view ──────────────────────────────────────────────────────
const leaveDate = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return s } }

function LeaveView({ T, teamColor, teamName }) {
  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { setLoading(true); fetch('/api/reports/leave').then((r) => (r.ok ? r.json() : null)).then((d) => { setLeave(d); setLoading(false) }).catch(() => setLoading(false)) }, [])

  if (loading) return <Card pad={22}><p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Loading…</p></Card>
  if (!leave || !(leave.staff || []).length) return <Card pad={22}><p style={{ fontSize: 13, color: T.faint, margin: 0 }}>No staff yet. Add your team to track holiday and sick.</p></Card>

  const rows = [...leave.staff].sort((a, b) => b.holidayRemainingDays - a.holidayRemainingDays)
  const showBanner = leave.weeksToEnd <= 8 && leave.summary?.staffWithUnused > 0
  const col = '1.6fr 1fr 0.8fr 0.8fr 1.4fr 0.9fr'
  const head = { fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase' }

  return (
    <>
      {showBanner && (
        <Card pad={16} style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, background: T.pink + '0C', border: `1px solid ${T.pink}30` }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: T.pink, flexShrink: 0, marginTop: 6 }} />
          <span style={{ fontSize: 13, color: T.body, lineHeight: 1.5 }}><b style={{ color: T.ink }}>{leave.summary.staffWithUnused} of your team have holiday to use</b> before the year ends on {leaveDate(leave.yearEnd)} ({leave.weeksToEnd} week{leave.weeksToEnd === 1 ? '' : 's'} away). Prompt them to book it in.</span>
        </Card>
      )}
      <Card pad={22}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>Holiday &amp; sick · per person</div>
          <div style={{ fontSize: 12, color: T.muted }}>Holiday year {leaveDate(leave.yearStart)} to {leaveDate(leave.yearEnd)}</div>
        </div>
        {/* header */}
        <div style={{ display: 'grid', gridTemplateColumns: col, gap: 10, padding: '0 2px 10px', borderBottom: `1px solid ${T.hair}` }}>
          <span style={head}>Name</span><span style={head}>Team</span><span style={{ ...head, textAlign: 'right' }}>Allowance</span><span style={{ ...head, textAlign: 'right' }}>Taken</span><span style={head}>Remaining</span><span style={{ ...head, textAlign: 'right' }}>Sick</span>
        </div>
        {rows.map((r) => {
          const pctUsed = r.entitlementDays ? Math.round((r.holidayTakenDays / r.entitlementDays) * 100) : 0
          const low = r.holidayRemainingDays >= 5 && leave.weeksToEnd <= 8
          return (
            <div key={r.staff_id} style={{ display: 'grid', gridTemplateColumns: col, gap: 10, alignItems: 'center', padding: '12px 2px', borderBottom: `1px solid ${T.hair}` }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{r.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: T.muted, minWidth: 0 }}><span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: teamColor[r.team_id] || T.muted }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamName[r.team_id] || 'Team'}</span></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, textAlign: 'right' }}>{r.entitlementDays}d</span>
              <span style={{ fontSize: 13, color: T.muted, textAlign: 'right' }}>{r.holidayTakenDays}d</span>
              <span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 7, borderRadius: 99, background: T.track, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, pctUsed)}%`, height: '100%', borderRadius: 99, background: teamColor[r.team_id] || T.pink }} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: low ? T.pink : T.ink, whiteSpace: 'nowrap' }}>{r.holidayRemainingDays}d left</span>
                </div>
              </span>
              <span style={{ fontSize: 13, color: T.muted, textAlign: 'right' }}>{r.sickDaysUsed}{leave.sickPaidDays ? `/${leave.sickPaidDays}` : ''}d</span>
            </div>
          )
        })}
        <p style={{ fontSize: 11.5, color: T.faint, marginTop: 14, lineHeight: 1.5 }}>Allowance is prorated by each person's working days. Taken counts approved holiday; sick is tracked separately. Set the policy in Settings, or override per person on the Staff page.</p>
      </Card>
    </>
  )
}
