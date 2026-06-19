'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { T, Card, Button, Tag, ProgressBar, fmtTime } from '@/app/components/ui/kit'
import { TEAM_COLORS, cfgFromLocation, mapStaffForCoverage, readiness, scheduleCoverage, coverageBottlenecks, locationKeyholderGaps } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD (live) — wired to the NEW schema: /api/rotas (name/week_start/status),
//  live coverage via getCoverageMetrics over /api/shifts + /api/staff. No templates.
// ════════════════════════════════════════════════════════════════════════════

const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DSHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // index 0 = Mon (coverage convention)
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const prettyDate = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return s } }
function mondayStr(offsetWeeks = 0) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0 = Mon
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Snap any date to its nearest Monday — tolerant of rotas saved a day off (e.g. a Sunday).
function nearestMonday(dateStr) {
  const [y, m, dd] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, dd)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() + (dow <= 3 ? -dow : 7 - dow))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Verdict mirrors the Staff page's CapacityLine: covered when max capacity ≥ required.
const COVERED = { label: 'Covered', color: T.green }
const SHORT = { label: 'Short on cover', color: T.red }

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [data, setData] = useState(null) // { teams, staff, shifts, rotas, locName, pending }

  // employee → redirect; manager → load
  useEffect(() => {
    if (!isLoaded || !user) return
    const run = async () => {
      const key = `shiftly_user_type_${user.id}`
      const cached = localStorage.getItem(key)
      if (cached === 'employee') { router.replace('/employee'); return }
      if (cached !== 'manager') {
        try {
          const r = await fetch('/api/auth/user-type'); const d = await r.json()
          if (d.type === 'employee') { localStorage.setItem(key, 'employee'); router.replace('/employee'); return }
          localStorage.setItem(key, 'manager')
        } catch {}
      }
      setChecking(false)
    }
    run()
  }, [isLoaded, user, router])

  useEffect(() => {
    if (checking) return
    const j = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([j('/api/teams'), j('/api/staff'), j('/api/shifts'), j('/api/rotas'), j('/api/locations'), j('/api/requests'), j('/api/location')])
      .then(([teams, staff, shifts, rotas, loc, requests, location]) => {
        const activeLoc = (loc?.locations || []).find((l) => l.id === loc?.active)
        const pending = Array.isArray(requests) ? requests.filter((r) => (r.status || '').toLowerCase() === 'pending').length : 0
        setData({ teams: teams || [], staff: staff || [], shifts: shifts || [], rotas: rotas || [], location, locName: activeLoc?.name || '', pending })
      })
  }, [checking])

  // ── derived ────────────────────────────────────────────────────────────────
  // Coverage uses the SAME engine + inputs as the Staff page (open-day-aware
  // required hours; verdict = max capacity ≥ required), so verdicts match exactly.
  const coverage = useMemo(() => {
    if (!data) return null
    const cfg = cfgFromLocation(data.location)
    const mapped = (data.staff || []).map(mapStaffForCoverage)
    const teamRows = (data.teams || []).map((t, i) => {
      const ts = data.shifts.filter((s) => s.team_id === t.id)
      const tp = mapped.filter((s) => s.team_id === t.id)
      return { team: t, color: TEAM_COLORS[i % TEAM_COLORS.length], r: readiness(tp, ts, cfg), bottlenecks: coverageBottlenecks(tp, ts, cfg) }
    })
    const req = teamRows.reduce((a, x) => a + x.r.req, 0)
    const maxh = teamRows.reduce((a, x) => a + x.r.maxh, 0)
    const bottlenecks = teamRows.flatMap((x) => x.bottlenecks.map((b) => ({ ...b, team: x.team.name })))
    const khGaps = locationKeyholderGaps(mapped, data.shifts || [], cfg) // location-wide, all teams
    const anyShort = teamRows.some((x) => !x.r.coverableAtMax || x.bottlenecks.length > 0)
    return { teamRows, bottlenecks, khGaps, req: Math.round(req), maxh: Math.round(maxh), readiness: req === 0 ? 1 : Math.min(1, maxh / req), status: anyShort ? 'short' : 'ok' }
  }, [data])

  // The OTHER question: do the shifts span the operating hours (location-wide)?
  const schedule = useMemo(() => {
    if (!data) return null
    const cfg = cfgFromLocation(data.location)
    const mapped = (data.staff || []).map(mapStaffForCoverage)
    return scheduleCoverage(data.shifts || [], mapped, cfg)
  }, [data])

  // Living Hours: staff deserve 4 weeks' notice. How many of the next 4 weeks are published?
  const horizon = useMemo(() => {
    if (!data) return null
    const next4 = [0, 1, 2, 3].map((i) => mondayStr(i)) // this week + next 3
    const pubMondays = new Set(data.rotas.filter((r) => r.status === 'Published').map((r) => nearestMonday(r.week_start)))
    return { published: next4.filter((wk) => pubMondays.has(wk)).length, firstGap: next4.find((wk) => !pubMondays.has(wk)) }
  }, [data])

  const thisWeek = useMemo(() => {
    if (!data) return null
    const wk = mondayStr(0)
    const rota = data.rotas.find((r) => r.week_start === wk)
    return { wk, rota }
  }, [data])

  const recentRotas = useMemo(() => (data?.rotas || []).slice(0, 4), [data])

  if (checking || !data) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font }}>
      <div style={{ width: 38, height: 38, border: '4px solid #EEE', borderTopColor: T.pink, borderRadius: 99, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  }

  const firstName = user?.firstName || 'there'
  const cov = coverage.status === 'short' ? SHORT : COVERED

  return (
    <div style={{ fontFamily: T.font, maxWidth: 1080, margin: '0 auto', padding: '28px 28px 56px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, margin: 0, letterSpacing: -0.3 }}>{greeting()}, {firstName}</h1>
          <p style={{ fontSize: 13.5, color: T.muted, margin: '5px 0 0' }}>
            {DAYNAMES[new Date().getDay()]}{data.locName ? <> · <span style={{ fontWeight: 600, color: T.body }}>{data.locName}</span></> : null}
          </p>
        </div>
      </div>

      {/* Living Hours — persists 4 weeks ahead; turns green with a tick once met */}
      {horizon && (() => {
        const met = horizon.published >= 4
        const accent = met ? T.green : T.pink
        return (
          <Card pad={18} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: accent + '0A', border: `1px solid ${accent}2E` }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {met
                ? <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: T.ink, margin: 0 }}>{met ? 'Meeting the Living Hours standard' : 'Give your staff 4 weeks’ notice'}</p>
              <p style={{ fontSize: 12.5, color: T.muted, margin: '3px 0 8px' }}>
                {met
                  ? <>Your staff have <b style={{ color: T.ink }}>4 weeks’ advance notice</b> of their shifts. Keep it up to stay compliant.</>
                  : <>The UK Living Hours standard is 4 weeks’ advance notice of shifts. You’ve published <b style={{ color: T.ink }}>{horizon.published} of the next 4 weeks</b>.</>}
              </p>
              <div style={{ maxWidth: 280 }}><ProgressBar value={horizon.published / 4} height={7} color={accent} radius={99} /></div>
            </div>
            {!met && horizon.firstGap && <Button accent={T.pink} arrow onClick={() => router.push(`/dashboard/generate?start=${horizon.firstGap}`)}>Build w/c {prettyDate(horizon.firstGap)}</Button>}
          </Card>
        )
      })()}

      {/* hero — reads left→right: do shifts cover hours? → can we cover shifts? → build it */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* THIS WEEK (right) */}
        <Card pad={22} style={{ order: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>This week</span>
            {thisWeek.rota
              ? <Tag color={thisWeek.rota.status === 'Published' ? T.green : T.amber}>{thisWeek.rota.status}</Tag>
              : <Tag color={T.faint}>Not built</Tag>}
          </div>
          {thisWeek.rota ? (
            <>
              <p style={{ fontSize: 20, fontWeight: 800, color: T.ink, margin: '0 0 4px' }}>{thisWeek.rota.name || `Week of ${prettyDate(thisWeek.wk)}`}</p>
              <p style={{ fontSize: 13, color: T.muted, margin: '0 0 18px' }}>w/c {prettyDate(thisWeek.wk)}</p>
              <Button variant={thisWeek.rota.status === 'Published' ? 'secondary' : 'primary'} accent={T.pink} onClick={() => router.push(`/dashboard/generate?rota=${thisWeek.rota.id}`)}>
                {thisWeek.rota.status === 'Published' ? 'View rota' : 'Open & finish'}
              </Button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 20, fontWeight: 800, color: T.ink, margin: '0 0 4px' }}>No rota yet</p>
              <p style={{ fontSize: 13, color: T.muted, margin: '0 0 18px' }}>Nothing scheduled for w/c {prettyDate(thisWeek.wk)}</p>
              <Button accent={T.pink} arrow onClick={() => router.push(`/dashboard/generate?start=${thisWeek.wk}`)}>Build this week's rota</Button>
            </>
          )}
        </Card>

        {/* COVERAGE — can we cover the shifts? (middle) */}
        <Card pad={22} style={{ order: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>Can we cover the shifts?</span>
            <Tag color={cov.color}>{cov.label}</Tag>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: T.ink }}>{Math.round(coverage.readiness * 100)}%</span>
            <span style={{ fontSize: 13, color: T.muted }}>of shift hours covered by capacity</span>
          </div>
          <ProgressBar value={coverage.readiness} height={9} color={cov.color} radius={99} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {coverage.teamRows.length === 0 && <p style={{ fontSize: 13, color: T.faint, margin: 0 }}>No teams yet.</p>}
            {coverage.teamRows.map(({ team, color, r, bottlenecks }) => {
              const st = (r.coverableAtMax && bottlenecks.length === 0) ? COVERED : SHORT
              return <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.body, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                <span style={{ fontSize: 12, color: T.faint }}>{Math.round(r.maxh)}h / {Math.round(r.req)}h</span>
                <Tag color={st.color}>{st.label}</Tag>
              </div>
            })}
          </div>
          {coverage.bottlenecks.length > 0 && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: T.r.sm, background: T.amber + '12', border: `1px solid ${T.amber}30` }}>
            {coverage.bottlenecks.slice(0, 3).map((b, i) => <p key={i} style={{ fontSize: 12, color: '#92660B', margin: i ? '6px 0 0' : 0, lineHeight: 1.45 }}><b>{b.name}</b> ({b.team}) is the only cover available every open day — they'd work {b.essential} days but can do {b.maxDays}. Spread availability or add staff.</p>)}
          </div>}
          {(coverage.khGaps.noKeyholder || coverage.khGaps.openMissing.length > 0 || coverage.khGaps.closeMissing.length > 0) && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: T.r.sm, background: T.amber + '12', border: `1px solid ${T.amber}30` }}>
            <p style={{ fontSize: 12, color: '#92660B', margin: 0, lineHeight: 1.45 }}>🔑 {coverage.khGaps.noKeyholder
              ? 'No keyholders set — mark someone as a keyholder so the location can open and close.'
              : `No keyholder available to ${coverage.khGaps.openMissing.length ? `open ${coverage.khGaps.openMissing.map((d) => DSHORT[d]).join(', ')}` : ''}${coverage.khGaps.openMissing.length && coverage.khGaps.closeMissing.length ? ' · ' : ''}${coverage.khGaps.closeMissing.length ? `close ${coverage.khGaps.closeMissing.map((d) => DSHORT[d]).join(', ')}` : ''} (one keyholder covers the whole location).`}</p>
          </div>}
          <button onClick={() => router.push('/dashboard/staff')} style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: T.font, fontSize: 12.5, fontWeight: 700, color: T.pink }}>Review staffing →</button>
        </Card>

        {/* SCHEDULE COVERAGE — do the shifts cover the open hours? (left) */}
        <Card pad={22} style={{ order: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>Do shifts cover your hours?</span>
            <Tag color={schedule.hasGaps ? T.red : schedule.hasKeyGaps ? T.amber : T.green}>{schedule.hasGaps ? 'Gaps' : schedule.hasKeyGaps ? 'No keyholder' : 'Complete'}</Tag>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: T.ink }}>{Math.round(schedule.coveredPct * 100)}%</span>
            <span style={{ fontSize: 13, color: T.muted }}>of open hours have a shift</span>
          </div>
          <ProgressBar value={schedule.coveredPct} height={9} color={schedule.hasGaps ? T.red : T.green} radius={99} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 16 }}>
            {!schedule.hasGaps && !schedule.hasKeyGaps && <p style={{ fontSize: 13, color: T.green, fontWeight: 600, margin: 0 }}>✓ Every open hour is scheduled, with a keyholder at open and close.</p>}
            {schedule.dayGaps.slice(0, 4).map((g, i) => (
              <div key={`g${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: T.red, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: T.body, width: 30 }}>{DSHORT[g.day]}</span>
                <span style={{ color: T.muted }}>{fmtTime(g.from)}–{fmtTime(g.to)} uncovered</span>
              </div>
            ))}
            {schedule.keyGaps.slice(0, 3).map((k, i) => (
              <div key={`k${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: T.amber, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: T.body, width: 30 }}>{DSHORT[k.day]}</span>
                <span style={{ color: T.muted }}>no keyholder at {k.when} ({fmtTime(k.time)})</span>
              </div>
            ))}
            {(schedule.dayGaps.length > 4 || schedule.keyGaps.length > 3) && <p style={{ fontSize: 12, color: T.faint, margin: 0 }}>+ more on the Shifts page</p>}
          </div>
          <button onClick={() => router.push('/dashboard/shifts')} style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: T.font, fontSize: 12.5, fontWeight: 700, color: T.pink }}>Review shifts →</button>
        </Card>
      </div>

      {/* quick actions — above recent rotas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
        <ActionTile title="Edit shifts" sub="Shift patterns" onClick={() => router.push('/dashboard/shifts')} />
        <ActionTile title="Manage staff" sub="Team & availability" onClick={() => router.push('/dashboard/staff')} />
        <ActionTile title="Scheduling rules" sub="Constraints" onClick={() => router.push('/dashboard/rules')} />
        <ActionTile title="Pending requests" sub={`${data.pending} to review`} accent={data.pending > 0} onClick={() => router.push('/dashboard/requests')} />
      </div>

      {/* recent rotas */}
      <Card pad={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${T.hair}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>Recent rotas</span>
          <Button accent={T.pink} size="sm" arrow onClick={() => router.push('/dashboard/generate')}>New rota</Button>
        </div>
        {recentRotas.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: '0 0 4px' }}>No rotas yet</p>
            <p style={{ fontSize: 13, color: T.muted, margin: '0 0 16px' }}>Build your first rota to get started.</p>
            <Button accent={T.pink} arrow onClick={() => router.push('/dashboard/generate')}>Build a rota</Button>
          </div>
        ) : (
          <div>
            {recentRotas.map((r, i) => <RotaRow key={r.id} r={r} top={i > 0} onClick={() => router.push(`/dashboard/generate?rota=${r.id}`)} />)}
          </div>
        )}
      </Card>

    </div>
  )
}

// recent-rota row with a subtle hover (consistent with the app's interactive surfaces)
function RotaRow({ r, top, onClick }) {
  const [h, setH] = useState(false)
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: h ? T.surface : 'none', border: 'none', borderTop: top ? `1px solid ${T.hair}` : 'none', cursor: 'pointer', fontFamily: T.font, textAlign: 'left', transition: 'background .12s' }}>
    <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: (r.status === 'Published' ? T.green : T.amber) + '14', color: r.status === 'Published' ? T.green : T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || `Week of ${prettyDate(r.week_start)}`}</p>
      <p style={{ fontSize: 12.5, color: T.muted, margin: '2px 0 0' }}>w/c {prettyDate(r.week_start)}</p>
    </div>
    <Tag color={r.status === 'Published' ? T.green : T.amber}>{r.status}</Tag>
  </button>
}

function ActionTile({ title, sub, onClick, accent }) {
  const [h, setH] = useState(false)
  return <Card pad={18} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${h ? T.pink : T.line}`, boxShadow: h ? T.shadow.lg : T.shadow.md, transform: h ? 'translateY(-2px)' : 'none', transition: 'transform .12s, box-shadow .15s, border-color .12s' }}>
    <div>
      <p style={{ fontSize: 14, fontWeight: 700, color: accent ? T.pink : T.ink, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 12, color: T.muted, margin: '3px 0 0' }}>{sub}</p>
    </div>
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={h ? T.pink : T.faint} style={{ transform: h ? 'translateX(2px)' : 'none', transition: 'transform .15s, stroke .12s' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  </Card>
}
