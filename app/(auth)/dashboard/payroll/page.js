'use client'

import { useState, useEffect, useMemo } from 'react'
import { T, Card, Button, Tag, Segmented, PAGE, PageHeader } from '@/app/components/ui/kit'
import { TEAM_COLORS } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'
import { periodCost, effectiveHourlyRate, basisLabel, fmtMoney } from '@/lib/pay'

// ════════════════════════════════════════════════════════════════════════════
//  PAYROLL (live), gross pay per staff for a period, from Rota Assignments × pay
//  basis (lib/pay). Period-navigable so you can pull up any past week.
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

export default function PayrollPage() {
  const [weekStart, setWeekStart] = useState(() => mondayStr(0))
  const [weeks, setWeeks] = useState(1)
  const [projected, setProjected] = useState(false)
  const [teams, setTeams] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Projected = the next 4 weeks from this Monday, published rotas only.
  const effStart = projected ? mondayStr(0) : weekStart
  const effWeeks = projected ? 4 : weeks

  useEffect(() => { fetch('/api/teams').then((r) => r.ok ? r.json() : []).then((t) => setTeams(t || [])).catch(() => {}) }, [])

  useEffect(() => {
    setLoading(true)
    const q = `start=${effStart}&weeks=${effWeeks}${projected ? '&status=Published' : ''}`
    fetch(`/api/payroll?${q}`).then((r) => r.ok ? r.json() : null).then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [effStart, effWeeks, projected])

  const teamColor = useMemo(() => Object.fromEntries(teams.map((t, i) => [t.id, TEAM_COLORS[i % TEAM_COLORS.length]])), [teams])
  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams])

  const rows = useMemo(() => (data?.staff || []).map((s) => ({ ...s, gross: periodCost(s, s.hours, data.weeks), rate: effectiveHourlyRate(s) })), [data])
  const totalGross = rows.reduce((a, r) => a + r.gross, 0)
  const totalHours = rows.reduce((a, r) => a + r.hours, 0)
  const paid = rows.filter((r) => r.gross > 0).length
  const avgRate = totalHours ? totalGross / totalHours : 0

  // group by team in /api/teams order
  const groups = useMemo(() => {
    const byTeam = {}
    for (const r of rows) { (byTeam[r.team_id] = byTeam[r.team_id] || []).push(r) }
    return teams.filter((t) => byTeam[t.id]?.length).map((t) => ({ team: t, color: teamColor[t.id], rows: byTeam[t.id], gross: byTeam[t.id].reduce((a, r) => a + r.gross, 0), hours: byTeam[t.id].reduce((a, r) => a + r.hours, 0) }))
  }, [rows, teams, teamColor])

  const rangeLabel = effWeeks === 1 ? `w/c ${prettyDate(effStart)}` : `${prettyDate(effStart)} – ${prettyDate(shiftStr(effStart, effWeeks * 7 - 1))}`

  const downloadCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [['Staff', 'Team', 'Pay basis', 'Hours', 'Rate (per hour)', 'Gross pay'].map(esc).join(',')]
    for (const r of rows) lines.push([r.name, teamName[r.team_id] || '', basisLabel(r.pay_basis), r.hours, r.rate.toFixed(2), r.gross.toFixed(2)].map(esc).join(','))
    lines.push('')
    lines.push(['Total', '', '', Math.round(totalHours), '', totalGross.toFixed(2)].map(esc).join(','))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `payroll-${effStart}-${effWeeks}wk${projected ? '-projected' : ''}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ fontFamily: T.font, ...PAGE }}>
      <PageHeader
        title="Payroll"
        subtitle={projected ? 'Projected from your published rotas — the next 4 weeks.' : `Gross pay for ${rangeLabel}.`}
        actions={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {rows.length > 0 && <Button variant="secondary" size="md" onClick={downloadCsv}>Download CSV</Button>}
          <Segmented options={[{ value: 'actual', label: 'Actual' }, { value: 'projected', label: 'Projected' }]} value={projected ? 'projected' : 'actual'} onChange={(v) => setProjected(v === 'projected')} accent={T.pink} />
        </div>}
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

      {/* summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Stat label="Total gross pay" value={fmtMoney(totalGross)} sub={`${weeks} week${weeks > 1 ? 's' : ''}`} />
        <Stat label="Hours scheduled" value={`${Math.round(totalHours)}h`} />
        <Stat label="Staff paid" value={paid} />
        <Stat label="Blended cost / hour" value={fmtMoney(avgRate)} />
      </div>

      {/* table */}
      {loading ? (
        <Card pad={40} style={{ textAlign: 'center', color: T.muted, fontSize: 14 }}>Loading…</Card>
      ) : rows.length === 0 ? (
        <Card pad={40} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: '0 0 4px' }}>No assignments in this period</p>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Build a rota for {rangeLabel} to see payroll.</p>
        </Card>
      ) : (
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {/* header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${T.line}`, fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            <span>Staff</span><span>Basis</span><span style={{ textAlign: 'right' }}>Hours</span><span style={{ textAlign: 'right' }}>Rate</span><span style={{ textAlign: 'right' }}>Gross</span>
          </div>
          {groups.map((g) => (
            <div key={g.team.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: T.surface, borderBottom: `1px solid ${T.hair}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: T.body }}><span style={{ width: 9, height: 9, borderRadius: 99, background: g.color }} />{g.team.name}</span>
                <span style={{ fontSize: 12.5, color: T.muted }}>{Math.round(g.hours)}h · <b style={{ color: T.ink }}>{fmtMoney(g.gross)}</b></span>
              </div>
              {g.rows.map((r) => (
                <div key={r.staff_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr', gap: 8, padding: '12px 20px', borderBottom: `1px solid ${T.hair}`, alignItems: 'center', fontSize: 13.5 }}>
                  <span style={{ fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <span><Tag color={BASIS_COLOR[r.pay_basis] || T.muted}>{basisLabel(r.pay_basis)}</Tag></span>
                  <span style={{ textAlign: 'right', color: T.body }}>{Math.round(r.hours * 10) / 10}h</span>
                  <span style={{ textAlign: 'right', color: T.muted }}>{fmtMoney(r.rate)}{r.pay_basis === 'hourly' ? '/hr' : ''}</span>
                  <span style={{ textAlign: 'right', fontWeight: 800, color: T.ink }}>{fmtMoney(r.gross)}</span>
                </div>
              ))}
            </div>
          ))}
          {/* total */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr', gap: 8, padding: '14px 20px', alignItems: 'center', fontSize: 14 }}>
            <span style={{ fontWeight: 800, color: T.ink }}>Total</span><span /><span style={{ textAlign: 'right', fontWeight: 700, color: T.body }}>{Math.round(totalHours)}h</span><span /><span style={{ textAlign: 'right', fontWeight: 800, color: T.pink }}>{fmtMoney(totalGross)}</span>
          </div>
        </Card>
      )}

      <p style={{ fontSize: 11.5, color: T.faint, marginTop: 14, textAlign: 'center' }}>Salary &amp; annualised staff are costed at a fixed amount per period; hourly staff by hours worked.</p>
    </div>
  )
}
