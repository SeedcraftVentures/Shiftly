'use client'

import { useState } from 'react'
import { useTheme, Card, Button, Pill, Ring, Icon, Ic, EASE } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD v2, UX SANDBOX (mock data, nothing saves)
//  Synthesises the Claude Design "rethink": a single readiness hero (ring + the
//  two sub-meters), the Living Hours horizon as a 4-week timeline, and the
//  gap-list ("things before you publish") as the primary actionable surface -
//  all in OUR visual language (frosted kit cards, pink accent, light + dark).
// ════════════════════════════════════════════════════════════════════════════

const READINESS = 0.82
const SCHEDULE_PCT = 1.0   // do shifts cover your hours?
const CAPACITY_PCT = 0.76  // can we cover the shifts?

const HORIZON = [
  { wk: '7 Jul', label: 'Published', state: 'published' },
  { wk: '14 Jul', label: 'Preparing · 82%', state: 'preparing' },
  { wk: '21 Jul', label: 'Draft', state: 'draft' },
  { wk: '28 Jul', label: 'Not started', state: 'none' },
]

const GAPS = [
  { id: 1, title: 'Kitchen is 6h short on Thursday', tag: 'Can we cover?', tone: 'warn', desc: 'Thu close needs 3, only 2 people are available within their hours.', fix: 'Post open shift', primary: true },
  { id: 2, title: 'Maya is 3h over her max', tag: 'Fairness', tone: 'warn', desc: '41h assigned against a 38h cap. Move her Fri close to Dan?', fix: 'Rebalance' },
  { id: 3, title: 'Sam and Priya both off Sunday', tag: 'FYI', tone: 'muted', desc: 'Covered, but Bar is thin. Intentional? Dismiss to confirm.', fix: 'Dismiss', ghost: true },
]

const STATS = [
  ['Shifts filled', '61 / 64'],
  ['Hours scheduled', '312h'],
  ['Projected cost', '£4,210'],
  ['Keyholder shifts', '14 · balanced'],
]

const ACTIONS = [
  { t: 'Generate 21 Jul', s: 'Next week, one click', icon: Ic.calendar },
  { t: 'Add one-off shift', s: 'Cover a spike', icon: Ic.plus },
  { t: 'Message team', s: '3 unread swaps', icon: Ic.requests },
  { t: 'Projected cost', s: '£4,210 this week', icon: Ic.rules },
]

export default function DashboardV2() {
  const { T } = useTheme()
  const scheduleOk = SCHEDULE_PCT >= 1
  const readyPct = Math.round(READINESS * 100)
  const flags = GAPS.filter((g) => g.tone !== 'muted').length

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 1160, margin: '0 auto', padding: '32px 32px 64px' }}>
      {/* sandbox note */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 22 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />Dashboard v2 · gap-list concept · mock data
      </div>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Good morning, Andre</h1>
          <p style={{ fontSize: 16, color: T.muted, margin: '6px 0 0', letterSpacing: '-0.01em' }}>You're preparing the week of 14 Jul. Clear the list and you're ready to publish.</p>
        </div>
        <Button primary arrow>Review and publish</Button>
      </div>

      {/* row 1: readiness hero + living hours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 18, marginBottom: 18 }}>
        <Card pad={26} style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <Ring value={READINESS} color={readyPct >= 90 ? T.green : T.amber} size={150} stroke={15} label="readiness" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: readyPct >= 90 ? T.green : T.amber, letterSpacing: '0.03em', marginBottom: 5 }}>{readyPct >= 90 ? 'READY TO PUBLISH' : 'ALMOST READY'}</div>
            <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.5, margin: '0 0 16px', letterSpacing: '-0.01em' }}>Structure is solid. Two capacity gaps are keeping this week from a clean publish.</p>
            <SubMeter T={T} label="Do shifts cover your hours?" pct={SCHEDULE_PCT} color={scheduleOk ? T.green : T.amber} />
            <div style={{ height: 12 }} />
            <SubMeter T={T} label="Can we cover the shifts?" pct={CAPACITY_PCT} color={CAPACITY_PCT >= 1 ? T.green : T.amber} />
          </div>
        </Card>

        <Card pad={22}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>Living Hours horizon</span>
            <span style={{ fontSize: 11.5, color: T.faint, fontWeight: 600 }}>4-week promise</span>
          </div>
          <p style={{ fontSize: 12.5, color: T.muted, margin: '0 0 16px', lineHeight: 1.45 }}>Staff should always see 4 weeks ahead. You're publishing 3 deep.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {HORIZON.map((h) => <HorizonRow key={h.wk} T={T} h={h} />)}
          </div>
        </Card>
      </div>

      {/* row 2: gap list + right column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
        {/* GAP LIST */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.02em' }}>{GAPS.length} things before you publish</h2>
          </div>
          <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 16px' }}>Clear the list and the week is fair and fully covered. Nothing here blocks you.</p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <Pill color={T.green}>7 / 7 days covered</Pill>
            <Pill color={T.green}>Keyholder every open and close</Pill>
            <Pill color={T.amber}>{flags} open flags</Pill>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {GAPS.map((g) => <GapCard key={g.id} T={T} g={g} />)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap' }}>
            <Button style={{ background: T.ink, color: T.name === 'dark' ? '#0A0A0B' : '#fff' }}>Publish anyway <span style={{ opacity: 0.6, fontWeight: 600 }}>· {flags} flags</span></Button>
            <span style={{ fontSize: 12.5, color: T.muted }}>or clear the list for a green publish.</span>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card pad={22}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14, letterSpacing: '-0.01em' }}>This week at a glance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {STATS.map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: i ? 12 : 0, borderTop: i ? `1px solid ${T.hair}` : 'none' }}>
                  <span style={{ fontSize: 13, color: T.muted }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, borderTop: `1px solid ${T.hair}` }}>
                <span style={{ fontSize: 13, color: T.muted }}>Pending from staff</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: T.pink }}>3 swaps · 1 off</span>
              </div>
            </div>
          </Card>

          <Card pad={22}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14, letterSpacing: '-0.01em' }}>Quick actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ACTIONS.map((a) => <ActionTile key={a.t} T={T} a={a} />)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SubMeter({ T, label, pct, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.body, letterSpacing: '-0.01em' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: T.track, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: color, borderRadius: 999, transition: `width .5s ${EASE}` }} />
      </div>
    </div>
  )
}

function HorizonRow({ T, h }) {
  const styles = {
    published: { bg: T.green + '18', fg: T.green },
    preparing: { bg: T.amber + '18', fg: T.warnInk },
    draft: { bg: T.subtle, fg: T.muted },
    none: { bg: T.pink + '14', fg: T.pink },
  }[h.state]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 11.5, color: T.faint, width: 50, flexShrink: 0, fontWeight: 600 }}>{h.wk}</span>
      <div style={{ flex: 1, height: 28, borderRadius: 9, background: styles.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 0 12px', fontSize: 12, fontWeight: 700, color: styles.fg }}>
        {h.label}
        {h.state === 'none' && <span style={{ background: T.pink, color: '#fff', borderRadius: 7, padding: '3px 10px', fontSize: 11 }}>Start</span>}
      </div>
    </div>
  )
}

function GapCard({ T, g }) {
  const tagColor = g.tone === 'warn' ? T.amber : T.faint
  return (
    <Card pad="16px 18px" style={{ display: 'flex', alignItems: 'center', gap: 16, borderLeft: `3px solid ${g.tone === 'warn' ? T.amber : T.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>{g.title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: tagColor, background: tagColor + '1E', borderRadius: 5, padding: '2px 7px' }}>{g.tag}</span>
        </div>
        <div style={{ fontSize: 12.5, color: T.muted, letterSpacing: '-0.01em' }}>{g.desc}</div>
      </div>
      {g.primary
        ? <Button size="sm" primary>{g.fix}</Button>
        : g.ghost
          ? <Button size="sm" variant="secondary">{g.fix}</Button>
          : <Button size="sm" style={{ background: T.ink, color: T.name === 'dark' ? '#0A0A0B' : '#fff' }}>{g.fix}</Button>}
    </Card>
  )
}

function ActionTile({ T, a }) {
  const [h, setH] = useState(false)
  return (
    <button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ textAlign: 'left', fontFamily: T.font, cursor: 'pointer', border: `1px solid ${h ? T.pink : T.border}`, background: h ? T.hover : 'transparent', borderRadius: 12, padding: 13, transition: `all .2s ${EASE}` }}>
      <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 9, background: T.ink + '10', color: T.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Icon path={a.icon} size={16} />
      </span>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>{a.t}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{a.s}</div>
    </button>
  )
}
