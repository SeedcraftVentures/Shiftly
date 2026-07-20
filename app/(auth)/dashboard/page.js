'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Card, Button, Pill, Ring, Icon, Ic, fmtTime, useTheme, EASE } from '@/app/components/ui/kit'
import { TEAM_COLORS, cfgFromLocation, mapStaffForCoverage, readiness, scheduleCoverage, coverageBottlenecks, locationKeyholderGaps } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD (live), Apple-esque. Same data/derivations as before (coverage via
//  the Staff engine, Living Hours horizon, this-week rota), now rendered with the
//  shared kit's rings / frosted cards / pills to match the lab reference exactly.
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
// Snap any date to its nearest Monday, tolerant of rotas saved a day off (e.g. a Sunday).
function nearestMonday(dateStr) {
  const [y, m, dd] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, dd)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() + (dow <= 3 ? -dow : 7 - dow))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DashboardPage() {
  const { T } = useTheme()
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

  // ── derived (unchanged engine + inputs, so verdicts match the Staff page) ────
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
    const khGaps = locationKeyholderGaps(mapped, data.shifts || [], cfg)
    const anyShort = teamRows.some((x) => !x.r.coverableAtMax || x.bottlenecks.length > 0)
    return { teamRows, bottlenecks, khGaps, req: Math.round(req), maxh: Math.round(maxh), readiness: req === 0 ? 1 : Math.min(1, maxh / req), status: anyShort ? 'short' : 'ok' }
  }, [data])

  const schedule = useMemo(() => {
    if (!data) return null
    const cfg = cfgFromLocation(data.location)
    const mapped = (data.staff || []).map(mapStaffForCoverage)
    return scheduleCoverage(data.shifts || [], mapped, cfg)
  }, [data])

  const horizon = useMemo(() => {
    if (!data) return null
    const next4 = [0, 1, 2, 3].map((i) => mondayStr(i))
    const pubMondays = new Set(data.rotas.filter((r) => r.status === 'Published').map((r) => nearestMonday(r.week_start)))
    return { published: next4.filter((wk) => pubMondays.has(wk)).length, firstGap: next4.find((wk) => !pubMondays.has(wk)) }
  }, [data])

  const thisWeek = useMemo(() => {
    if (!data) return null
    const wk = mondayStr(0)
    const rota = data.rotas.find((r) => nearestMonday(r.week_start) === wk)
    return { wk, rota }
  }, [data])

  const recentRotas = useMemo(() => (data?.rotas || []).slice(0, 4), [data])

  if (checking || !data) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font }}>
      <div style={{ width: 38, height: 38, border: `4px solid ${T.track}`, borderTopColor: T.pink, borderRadius: 99, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  }

  const firstName = user?.firstName || 'there'
  const capOk = coverage.status !== 'short'
  const scheduleColor = schedule.hasGaps ? T.red : schedule.hasKeyGaps ? T.amber : T.green
  const hasWarn = coverage.bottlenecks.length > 0 || coverage.khGaps.noKeyholder || coverage.khGaps.openMissing.length > 0 || coverage.khGaps.closeMissing.length > 0
  // overall readiness = the weaker of the two coverage answers (your limiting factor)
  // NB: named readyVal, not `readiness`, to avoid shadowing the imported readiness() helper
  const readyVal = Math.min(schedule.coveredPct, coverage.readiness)
  const readyPct = Math.round(readyVal * 100)
  const ringColor = readyPct >= 95 ? T.green : readyPct >= 60 ? T.amber : T.red
  const readyLabel = readyPct >= 95 ? 'READY TO PUBLISH' : 'ALMOST READY'
  const readyLine = (!schedule.hasGaps && !schedule.hasKeyGaps && capOk)
    ? "You're fully covered and ready to publish."
    : !capOk ? 'Staffing is short on some shifts. Add availability or staff.'
      : 'Some open hours still need a shift or a keyholder.'

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 1120, margin: '0 auto', padding: '40px 32px 64px' }}>
      {/* header */}
      <div style={{ marginBottom: 34 }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.035em', lineHeight: 1.02 }}>{greeting()}, {firstName}</h1>
        <p style={{ fontSize: 17, color: T.muted, margin: '8px 0 0', letterSpacing: '-0.01em' }}>{DAYNAMES[new Date().getDay()]}{data.locName ? <> · <span style={{ color: T.body, fontWeight: 600 }}>{data.locName}</span></> : null}</p>
      </div>

      {/* hero row: merged coverage (2/3) + this week (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 18, marginBottom: 18 }}>
        <Card pad={28} style={{ display: 'flex', gap: 26, alignItems: 'center', minHeight: 220 }}>
          <Ring value={readyVal} color={ringColor} size={142} stroke={14} label="readiness" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: ringColor, letterSpacing: '0.03em', marginBottom: 5 }}>{readyLabel}</div>
            <p style={{ fontSize: 14.5, color: T.muted, lineHeight: 1.5, margin: '0 0 18px', letterSpacing: '-0.01em' }}>{readyLine}</p>
            <SubMeter label="Do shifts cover your hours?" pct={schedule.coveredPct} color={scheduleColor} onClick={() => router.push('/dashboard/shifts')} />
            <div style={{ height: 14 }} />
            <SubMeter label="Can we cover the shifts?" pct={coverage.readiness} color={capOk ? T.green : T.amber} onClick={() => router.push('/dashboard/staff')} />
          </div>
        </Card>

        <ThisWeekPanel thisWeek={thisWeek} horizon={horizon} router={router} />
      </div>

      {/* capacity warning (frosted amber) */}
      {hasWarn && (
        <Card pad={18} style={{ marginBottom: 18, display: 'flex', gap: 13, alignItems: 'flex-start', background: T.amber + '14', border: `1px solid ${T.amber}33` }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: T.amber + '22', color: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon path={Ic.key} size={16} stroke={1.9} />
          </span>
          <div style={{ flex: 1 }}>
            {coverage.bottlenecks.slice(0, 2).map((b, i) => (
              <p key={i} style={{ fontSize: 13.5, color: T.body, margin: i ? '6px 0 0' : 0, lineHeight: 1.5, letterSpacing: '-0.01em' }}><b style={{ color: T.ink }}>{b.name}</b> ({b.team}) is the only cover every open day, they'd work {b.essential} days but can do {b.maxDays}. Spread availability or add staff.</p>
            ))}
            {(coverage.khGaps.noKeyholder || coverage.khGaps.openMissing.length > 0 || coverage.khGaps.closeMissing.length > 0) && (
              <p style={{ fontSize: 13.5, color: T.body, margin: coverage.bottlenecks.length ? '6px 0 0' : 0, lineHeight: 1.5, letterSpacing: '-0.01em' }}>{coverage.khGaps.noKeyholder
                ? 'No keyholders set, mark someone as a keyholder so the location can open and close.'
                : `No keyholder available to ${coverage.khGaps.openMissing.length ? `open ${coverage.khGaps.openMissing.map((d) => DSHORT[d]).join(', ')}` : ''}${coverage.khGaps.openMissing.length && coverage.khGaps.closeMissing.length ? ' · ' : ''}${coverage.khGaps.closeMissing.length ? `close ${coverage.khGaps.closeMissing.map((d) => DSHORT[d]).join(', ')}` : ''} (one keyholder covers the whole location).`}</p>
            )}
          </div>
        </Card>
      )}

      {/* quick actions */}
      <p style={{ fontSize: 12.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase', margin: '0 0 14px' }}>Quick actions</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 32 }}>
        <ActionTile title="Edit shifts" sub="Shift patterns" icon={Ic.shifts} onClick={() => router.push('/dashboard/shifts')} />
        <ActionTile title="Manage staff" sub="Team & availability" icon={Ic.staff} onClick={() => router.push('/dashboard/staff')} />
        <ActionTile title="Scheduling rules" sub="Constraints" icon={Ic.rules} onClick={() => router.push('/dashboard/rules')} />
        <ActionTile title="Pending requests" sub={`${data.pending} to review`} icon={Ic.requests} accent={data.pending > 0} onClick={() => router.push('/dashboard/requests')} />
      </div>

      {/* recent rotas */}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${T.hair}` }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Recent rotas</span>
          <Button size="sm" arrow onClick={() => router.push('/dashboard/generate')}>New rota</Button>
        </div>
        {recentRotas.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: '0 0 4px' }}>No rotas yet</p>
            <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 16px' }}>Build your first rota to get started.</p>
            <Button arrow onClick={() => router.push('/dashboard/generate')}>Build a rota</Button>
          </div>
        ) : (
          recentRotas.map((r, i) => <RotaRow key={r.id} r={r} top={i > 0} onClick={() => router.push(`/dashboard/generate?rota=${r.id}`)} />)
        )}
      </Card>
    </div>
  )
}

// ── sub-meter: one coverage answer as a clickable labelled progress bar ──
function SubMeter({ label, pct, color, onClick }) {
  const { T } = useTheme()
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: T.font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: h ? T.pink : T.body, letterSpacing: '-0.01em', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color .15s' }}>
          {label}<Icon path={Ic.chevron} size={12} stroke={2.4} color={h ? T.pink : T.faint} style={{ transform: h ? 'translateX(2px)' : 'none', transition: 'transform .2s' }} />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: T.track, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: color, borderRadius: 999, transition: `width .5s ${EASE}` }} />
      </div>
    </button>
  )
}

function ThisWeekPanel({ thisWeek, horizon, router }) {
  const { T } = useTheme()
  const rota = thisWeek.rota
  const published = rota?.status === 'Published'
  return (
    <Card pad={28} style={{ display: 'flex', flexDirection: 'column', minHeight: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase' }}>This week</span>
        {rota ? <Pill color={published ? T.green : T.amber}>{rota.status}</Pill> : <Pill color={T.faint}>Not built</Pill>}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 26, fontWeight: 700, color: T.ink, margin: '4px 0 6px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>{rota ? (rota.name || `Week of ${prettyDate(thisWeek.wk)}`) : 'No rota yet'}</p>
        <p style={{ fontSize: 15, color: T.muted, margin: 0, letterSpacing: '-0.01em' }}>{rota ? `w/c ${prettyDate(thisWeek.wk)}` : `Nothing scheduled for w/c ${prettyDate(thisWeek.wk)}`}</p>
      </div>
      {horizon && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.body, letterSpacing: '-0.01em' }}>Living Hours · 4 weeks ahead</span>
            <span style={{ fontSize: 13, color: T.muted }}>{horizon.published}/4</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 8, borderRadius: 999, background: i < horizon.published ? T.green : T.track, transition: `background .5s ${EASE}` }} />
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        {rota
          ? <Button variant={published ? 'secondary' : 'primary'} arrow={!published} onClick={() => router.push(`/dashboard/generate?rota=${rota.id}`)}>{published ? 'View rota' : 'Open & finish'}</Button>
          : <Button arrow onClick={() => router.push(`/dashboard/generate?start=${thisWeek.wk}`)}>Build this week's rota</Button>}
      </div>
    </Card>
  )
}

function ActionTile({ title, sub, icon, onClick, accent }) {
  const { T } = useTheme()
  return (
    <Card interactive pad={20} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
      <span style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (accent ? T.pink : T.ink) + '12', color: accent ? T.pink : T.ink }}>
        <Icon path={icon} size={21} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: accent ? T.pink : T.ink, margin: 0, letterSpacing: '-0.01em' }}>{title}</p>
        <p style={{ fontSize: 13, color: T.muted, margin: '2px 0 0', letterSpacing: '-0.01em' }}>{sub}</p>
      </div>
    </Card>
  )
}

function RotaRow({ r, top, onClick }) {
  const { T } = useTheme()
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 15, padding: '15px 24px', background: h ? T.hover : 'transparent', border: 'none', borderTop: top ? `1px solid ${T.hair}` : 'none', cursor: 'pointer', fontFamily: T.font, textAlign: 'left', transition: `background .25s ${EASE}` }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: T.pink + '16', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon path={Ic.calendar} size={19} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{r.name || `Week of ${prettyDate(r.week_start)}`}</p>
        <p style={{ fontSize: 13, color: T.muted, margin: '2px 0 0' }}>w/c {prettyDate(r.week_start)}</p>
      </div>
      <Pill color={r.status === 'Published' ? T.green : T.amber}>{r.status}</Pill>
      <Icon path={Ic.chevron} size={17} stroke={2} color={T.faint} style={{ transform: h ? 'translateX(2px)' : 'none', transition: `transform .3s ${EASE}` }} />
    </button>
  )
}
