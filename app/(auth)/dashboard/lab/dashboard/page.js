'use client'

import { useTheme, LabCanvas, Card, Ring, Pill, Btn, SectionLabel, Icon, Ic, FONT, EASE, PINK } from '../_apple/kit'

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD — UX SANDBOX v2 (mock data only, nothing saves)
//  Apple-esque: frosted surfaces, activity rings, generous whitespace, calm
//  type, system colours, light + dark. Now built on the shared _apple/kit.
// ════════════════════════════════════════════════════════════════════════════

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

const DATA = {
  firstName: 'Andre',
  locName: 'Camden Roastery',
  livingHours: { published: 3, target: 4 },
  thisWeek: { name: 'Week of 21 Jul', status: 'Published' },
  schedule: {
    pct: 0.92,
    gaps: [
      { day: 'Sat', from: '2pm', to: '4pm', kind: 'gap' },
      { day: 'Sun', from: 'open', kind: 'key' },
    ],
  },
  capacity: {
    pct: 0.86, status: 'short',
    teams: [
      { name: 'Front of House', color: PINK, have: 148, need: 148, ok: true },
      { name: 'Kitchen', color: '#5E5CE6', have: 96, need: 112, ok: false },
      { name: 'Management', color: '#30B0C7', have: 40, need: 40, ok: true },
    ],
    note: 'Kitchen is short 16h — Priya is the only cover on 3 open days. Spread availability or add staff.',
  },
  pending: 2,
  recent: [
    { name: 'Week of 21 Jul', wc: 'w/c 21 Jul', status: 'Published' },
    { name: 'Week of 14 Jul', wc: 'w/c 14 Jul', status: 'Published' },
    { name: 'Week of 7 Jul', wc: 'w/c 7 Jul', status: 'Draft' },
    { name: 'Week of 30 Jun', wc: 'w/c 30 Jun', status: 'Published' },
  ],
}

export default function DashboardLab() {
  const { theme, setTheme, T } = useTheme()
  const cap = DATA.capacity
  const capOk = cap.status !== 'short'

  return (
    <LabCanvas T={T} theme={theme} setTheme={setTheme} note="dashboard · mock data">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 34, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.035em', lineHeight: 1.02 }}>{greeting()}, {DATA.firstName}</h1>
          <p style={{ fontSize: 17, color: T.muted, margin: '8px 0 0', letterSpacing: '-0.01em' }}>Thursday · <span style={{ color: T.body, fontWeight: 600 }}>{DATA.locName}</span></p>
        </div>
      </div>

      {/* hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 18 }}>
        <CoverageCard T={T} label="Do shifts cover your hours?" pct={DATA.schedule.pct} color={T.green}
          status={<Pill T={T} color={DATA.schedule.gaps.some(g => g.kind === 'gap') ? T.amber : T.green}>{DATA.schedule.gaps.length ? 'Minor gaps' : 'Complete'}</Pill>} cta="Review shifts">
          <p style={{ fontSize: 14, color: T.body, margin: '0 0 10px', letterSpacing: '-0.01em', fontWeight: 600 }}>of open hours have a shift</p>
          {DATA.schedule.gaps.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginTop: i ? 6 : 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: g.kind === 'key' ? T.amber : T.red, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: T.body, width: 32 }}>{g.day}</span>
              <span style={{ color: T.muted, letterSpacing: '-0.01em' }}>{g.kind === 'key' ? 'no keyholder at open' : `${g.from}–${g.to} uncovered`}</span>
            </div>
          ))}
        </CoverageCard>

        <CoverageCard T={T} label="Can we cover the shifts?" pct={cap.pct} color={capOk ? T.green : T.amber}
          status={<Pill T={T} color={capOk ? T.green : T.amber}>{capOk ? 'Covered' : 'Short on cover'}</Pill>} cta="Review staffing">
          <p style={{ fontSize: 14, color: T.body, margin: '0 0 10px', letterSpacing: '-0.01em', fontWeight: 600 }}>of shift hours covered by capacity</p>
          {cap.teams.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: i ? 5 : 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: T.body, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{t.name}</span>
              <span style={{ fontSize: 12, color: t.ok ? T.faint : T.amber, fontWeight: t.ok ? 400 : 600 }}>{t.have}h/{t.need}h</span>
            </div>
          ))}
        </CoverageCard>

        <ThisWeekPanel T={T} />
      </div>

      {!capOk && (
        <Card T={T} pad={18} style={{ marginBottom: 18, display: 'flex', gap: 13, alignItems: 'flex-start', background: T.amber + '14', border: `1px solid ${T.amber}33` }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: T.amber + '22', color: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon path={Ic.key} size={16} stroke={1.9} />
          </span>
          <p style={{ fontSize: 13.5, color: T.body, margin: '4px 0 0', lineHeight: 1.5, letterSpacing: '-0.01em' }}>{cap.note}</p>
        </Card>
      )}

      <SectionLabel T={T}>Quick actions</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 32 }}>
        <ActionTile T={T} title="Edit shifts" sub="Shift patterns" icon={Ic.shifts} />
        <ActionTile T={T} title="Manage staff" sub="Team & availability" icon={Ic.staff} />
        <ActionTile T={T} title="Scheduling rules" sub="Constraints" icon={Ic.rules} />
        <ActionTile T={T} title="Pending requests" sub={`${DATA.pending} to review`} icon={Ic.requests} accent={DATA.pending > 0} />
      </div>

      <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${T.hair}` }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Recent rotas</span>
          <Btn T={T} primary arrow>New rota</Btn>
        </div>
        {DATA.recent.map((r, i) => <RotaRow key={i} T={T} r={r} top={i > 0} />)}
      </Card>
    </LabCanvas>
  )
}

function ThisWeekPanel({ T }) {
  const w = DATA.thisWeek
  const published = w.status === 'Published'
  return (
    <Card T={T} pad={28} style={{ display: 'flex', flexDirection: 'column', minHeight: 260 }}>
      <SectionLabel T={T} right={<Pill T={T} color={published ? T.green : T.amber}>{w.status}</Pill>}>This week</SectionLabel>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 30, fontWeight: 700, color: T.ink, margin: '4px 0 6px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>{w.name}</p>
        <p style={{ fontSize: 15, color: T.muted, margin: 0, letterSpacing: '-0.01em' }}>Every shift is scheduled and live for the team.</p>
      </div>
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.body, letterSpacing: '-0.01em' }}>Living Hours · 4 weeks ahead</span>
          <span style={{ fontSize: 13, color: T.muted }}>{DATA.livingHours.published}/{DATA.livingHours.target}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: DATA.livingHours.target }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 8, borderRadius: 999, background: i < DATA.livingHours.published ? T.green : T.track, transition: `background .5s ${EASE}` }} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20 }}><Btn T={T} arrow>View rota</Btn></div>
    </Card>
  )
}

function CoverageCard({ T, label, pct, color, status, children, cta }) {
  return (
    <Card T={T} pad={28} style={{ display: 'flex', flexDirection: 'column', minHeight: 260 }}>
      <SectionLabel T={T} right={status}>{label}</SectionLabel>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
        <Ring T={T} value={pct} color={color} size={104} stroke={11} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
      <div style={{ flex: 1 }} />
      <button style={{ marginTop: 18, alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: T.pink, letterSpacing: '-0.01em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{cta}
        <Icon path={Ic.chevron} size={14} stroke={2.4} /></button>
    </Card>
  )
}

function ActionTile({ T, title, sub, icon, accent }) {
  return (
    <Card T={T} interactive pad={20} style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
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

function RotaRow({ T, r, top }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 24px', cursor: 'pointer', borderTop: top ? `1px solid ${T.hair}` : 'none' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.hover }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: T.pink + '16', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon path={Ic.shifts} size={19} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, margin: 0, letterSpacing: '-0.01em' }}>{r.name}</p>
        <p style={{ fontSize: 13, color: T.muted, margin: '2px 0 0' }}>{r.wc}</p>
      </div>
      <Pill T={T} color={r.status === 'Published' ? T.green : T.amber}>{r.status}</Pill>
      <Icon path={Ic.chevron} size={17} stroke={2} color={T.faint} />
    </div>
  )
}
