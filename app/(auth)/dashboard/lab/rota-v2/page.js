'use client'

import { useTheme, Card, Button, Icon, Ic, EASE } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  ROTA BUILDER v2, UX SANDBOX (mock data, nothing saves)
//  Adopts the Claude Design ideas on OUR visual language: a "solver shows its
//  working" banner (trust), and the live compliance + contracted-hours in a
//  right-hand INSPECTOR panel beside the grid (not listed underneath).
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Mon 14', 'Tue 15', 'Wed 16', 'Thu 17', 'Fri 18', 'Sat 19', 'Sun 20']
const TEAM = { FoH: '#FF1F7D', Bar: '#5E5CE6', Kitchen: '#30B0C7' }

// cell = null (off) | { t, team } | { unfilled:true, t, team }
const ROWS = [
  { name: 'Jordan', kh: true, h: 36, max: 38, tone: 'ok', cells: [{ t: '08-16', team: 'FoH', sub: 'open' }, null, { t: '08-16', team: 'FoH', sub: 'open' }, { t: '08-16', team: 'FoH' }, null, { t: '10-18', team: 'FoH' }, null] },
  { name: 'Maya', kh: true, h: 41, max: 38, tone: 'over', cells: [null, { t: '12-20', team: 'Bar', sub: 'close' }, { t: '12-20', team: 'Bar', sub: 'close' }, { t: '12-20', team: 'Bar' }, { t: '16-24', team: 'Bar' }, null, null] },
  { name: 'Dan', kh: false, h: 28, max: 40, tone: 'under', cells: [{ t: '16-24', team: 'Bar' }, null, { t: '16-24', team: 'Bar' }, null, null, { t: '16-24', team: 'Bar' }, null] },
  { name: 'Priya', kh: false, h: 30, max: 32, tone: 'ok', cells: [null, { t: '09-17', team: 'Kitchen' }, { t: '09-17', team: 'Kitchen' }, null, { t: '09-17', team: 'Kitchen' }, { t: '11-19', team: 'Kitchen' }, null] },
  { name: 'Sam', kh: false, h: 24, max: 30, tone: 'under', cells: [{ t: '09-17', team: 'Kitchen' }, null, null, { unfilled: true, t: '16-24', team: 'Kitchen' }, { t: '09-17', team: 'Kitchen' }, null, { t: '10-18', team: 'Kitchen' }] },
  { name: 'Aisha', kh: false, h: 32, max: 32, tone: 'ok', cells: [{ t: '10-18', team: 'FoH' }, { t: '10-18', team: 'FoH' }, null, null, { t: '10-18', team: 'FoH' }, { t: '12-20', team: 'FoH' }, null] },
]

const RULES = [
  { ok: true, label: 'Keyholder at every open and close' },
  { ok: true, label: 'Min 11h rest between shifts' },
  { ok: true, label: 'Max 5 consecutive days' },
  { ok: false, label: 'Maya over max hours', detail: '41 / 38' },
  { ok: false, label: '1 unfilled shift', detail: 'Kitchen, Thu' },
]

export default function RotaV2() {
  const { T } = useTheme()
  const dark = T.name === 'dark'
  const toneColor = (tone) => (tone === 'over' ? T.amber : tone === 'under' ? T.faint : T.green)

  const cellBlock = (c) => {
    if (!c) return <div style={{ background: T.subtle, borderRadius: 9 }} />
    if (c.unfilled) return (
      <div style={{ background: T.amber + '14', border: `1px dashed ${T.amber}66`, borderRadius: 9, padding: '7px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: T.warnInk }}>{c.t}</span>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: T.warnInk }}>unfilled</span>
      </div>
    )
    const col = TEAM[c.team]
    return (
      <div style={{ background: dark ? col + 'D0' : col + '18', border: dark ? 'none' : `1px solid ${col}33`, borderRadius: 9, padding: '7px 8px', boxShadow: T.shadow.sm }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: dark ? '#fff' : col }}>{c.t}</span>
        <span style={{ display: 'block', fontSize: 9.5, color: dark ? 'rgba(255,255,255,.8)' : T.muted }}>{c.team}{c.sub ? ` · ${c.sub}` : ''}</span>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 1240, margin: '0 auto', padding: '32px 32px 64px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 18 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />Rota Builder v2 · right-hand compliance inspector · mock data
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Rota Builder</h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.segBg, borderRadius: 999, padding: '4px 6px' }}>
          <span style={{ color: T.faint, padding: '0 4px', cursor: 'pointer' }}>‹</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>14-20 Jul</span>
          <span style={{ color: T.faint, padding: '0 4px', cursor: 'pointer' }}>›</span>
        </div>
        <div style={{ display: 'inline-flex', background: T.segBg, borderRadius: 999, padding: 3, gap: 2 }}>
          {['1 wk', '2 wk', '4 wk'].map((w, i) => (
            <span key={w} style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, color: i === 0 ? T.ink : T.faint, background: i === 0 ? T.card : 'transparent', boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,.12)' : 'none' }}>{w}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Button size="sm" variant="secondary"><Icon path="M4 4v5h5M20 20v-5h-5M20 9A8 8 0 0 0 6 5M4 15a8 8 0 0 0 14 4" size={14} stroke={2} />Regenerate</Button>
          <Button size="sm" variant="secondary">Save draft</Button>
          <Button size="sm" primary>Publish</Button>
        </div>
      </div>

      {/* solver banner */}
      <Card pad="12px 16px" style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: T.green + '1E', color: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon path={Ic.check} size={13} stroke={3} /></span>
        <span style={{ fontSize: 13, color: T.body }}>Solver filled <b style={{ color: T.ink }}>61 of 64 shifts</b> honouring contracts and rules · <span style={{ color: T.faint }}>2.1s</span></span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: T.pink, cursor: 'pointer' }}>Explain choices</span>
      </Card>

      {/* grid + inspector */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Card solid pad={20} style={{ flex: 1, minWidth: 520, overflowX: 'auto' }}>
          <div style={{ minWidth: 760 }}>
            {/* header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '128px repeat(7,1fr)', gap: 6, marginBottom: 8 }}>
              <div />
              {DAYS.map((d, i) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: i === 3 ? T.warnInk : T.faint, background: i === 3 ? T.amber + '14' : 'transparent', borderRadius: 6, padding: '3px 0', letterSpacing: '0.02em' }}>{d.toUpperCase()}</div>
              ))}
            </div>
            {/* rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ROWS.map((r) => (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '128px repeat(7,1fr)', gap: 6, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 4px' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, display: 'flex', alignItems: 'center', gap: 5 }}>{r.name}{r.kh && <span style={{ width: 14, height: 14, borderRadius: 4, background: T.pink, color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>K</span>}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: toneColor(r.tone) }}>{r.h} / {r.max}h{r.tone === 'over' ? ' !' : ''}</span>
                  </div>
                  {r.cells.map((c, i) => <div key={i} style={{ minHeight: 40 }}>{cellBlock(c)}</div>)}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: T.faint, marginTop: 12 }}>Drag a shift onto another person to reassign · click a block to edit · edits save on Publish.</div>
          </div>
        </Card>

        {/* RIGHT INSPECTOR */}
        <Card solid pad={20} style={{ width: 280, flexShrink: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 3 }}>Live compliance</div>
          <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 16 }}>Updates as you edit. Nothing blocks publish.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {RULES.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12 }}>
                <span style={{ width: 16, height: 16, borderRadius: 999, flexShrink: 0, background: r.ok ? T.green + '1E' : T.amber + '1E', color: r.ok ? T.green : T.warnInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, marginTop: 1 }}>{r.ok ? '✓' : '!'}</span>
                <span style={{ color: T.body }}>{r.label}{r.detail && <span style={{ color: T.faint }}> ({r.detail})</span>}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: T.hair, marginBottom: 16 }} />
          <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 12 }}>Contracted hours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROWS.filter((r) => r.h > 0).map((r) => {
              const c = toneColor(r.tone)
              return (
                <div key={r.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}><span style={{ color: T.body }}>{r.name}</span><span style={{ color: c, fontWeight: 600 }}>{r.h} / {r.max}</span></div>
                  <div style={{ height: 6, borderRadius: 4, background: T.track, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.round((r.h / r.max) * 100))}%`, height: '100%', background: c }} /></div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
