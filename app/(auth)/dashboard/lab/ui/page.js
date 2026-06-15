'use client'

import { useState } from 'react'
import { T, Card, Label, Field, Input, Button, Chip, Switch, Stepper, Slider, Segmented, Tag, Dot, Avatar, ProgressBar, DayPicker, TimeRange } from '@/app/components/ui/kit'

const TEAMS = [
  { name: 'Front of House', color: '#FF1F7D' },
  { name: 'Kitchen', color: '#7C3AED' },
  { name: 'Management', color: '#0EA5E9' },
]

function Section({ title, hint, children }) {
  return <div style={{ marginBottom: 30 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <h2 style={{ fontFamily: T.font, fontSize: 15, fontWeight: 800, color: T.ink, margin: 0 }}>{title}</h2>
      {hint && <span style={{ fontSize: 12, color: T.faint }}>{hint}</span>}
    </div>
    <Card>{children}</Card>
  </div>
}
const Row = ({ children, gap = 12, style }) => <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap, ...style }}>{children}</div>

export default function StyleGuide() {
  const [sw1, setSw1] = useState(true), [sw2, setSw2] = useState(false)
  const [step, setStep] = useState(3)
  const [hours, setHours] = useState(38)
  const [seg, setSeg] = useState('week')
  const [seg2, setSeg2] = useState('all')
  const [days, setDays] = useState([0, 1, 2, 3, 4])
  const [tr, setTr] = useState([9, 17])
  const [name, setName] = useState('')
  const [teamIdx, setTeamIdx] = useState(0)
  const accent = TEAMS[teamIdx].color

  return <div style={{ fontFamily: T.font, background: '#F7F7F9', minHeight: '100vh', padding: '40px 32px' }}>
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ marginBottom: 8 }}><Tag color={T.pink}>SANDBOX</Tag></div>
      <h1 style={{ fontFamily: T.font, fontSize: 30, fontWeight: 800, color: T.ink, margin: '0 0 6px' }}>Component library</h1>
      <p style={{ fontSize: 14, color: T.muted, margin: '0 0 28px', maxWidth: 560 }}>
        Every shared component, in one place. Pages import these from <code style={{ background: '#EEE', padding: '1px 6px', borderRadius: 5, fontSize: 12 }}>app/components/ui/kit</code> instead of re-styling. Change it here, it changes everywhere.
      </p>

      {/* accent switcher — shows team-colouring on every component */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Label style={{ marginRight: 4 }}>Accent</Label>
        <Segmented options={TEAMS.map((t, i) => ({ value: i, label: t.name }))} value={teamIdx} onChange={setTeamIdx} accent={accent} />
      </div>

      <Section title="Buttons" hint="hover, focus, press are live — try them">
        <Row style={{ marginBottom: 16 }}>
          <Button accent={accent} arrow>Build rota</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete</Button>
          <Button accent={accent} disabled>Disabled</Button>
        </Row>
        <div style={{ height: 1, background: T.hair, margin: '4px 0 16px' }} />
        <Row style={{ marginBottom: 16 }}>
          <Button accent={accent} icon="＋">Add staff</Button>
          <Button accent={accent} shape="pill" arrow>Pill shape</Button>
          <Button variant="ghost" icon="↑">Upload</Button>
          <Button variant="secondary" shape="pill">Pill ghost</Button>
        </Row>
        <Row style={{ alignItems: 'flex-end' }}>
          <Button accent={accent} size="sm">Small</Button>
          <Button accent={accent} size="md">Medium</Button>
          <Button accent={accent} size="lg" arrow>Large</Button>
          <div style={{ flex: 1, minWidth: 180 }}><Button accent={accent} full size="lg">Full width</Button></div>
        </Row>
      </Section>

      <Section title="Shape & elevation scale" hint="the cohesion backbone — every component snaps to this">
        <Row gap={14} style={{ marginBottom: 18 }}>
          {[['xs', 8], ['sm', 10], ['md', 12], ['lg', 16], ['xl', 22], ['pill', 999]].map(([k, v]) => <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 48, background: '#fff', border: `1px solid ${T.line}`, borderRadius: v, boxShadow: T.shadow.sm }} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontWeight: 600 }}>r.{k}</div>
          </div>)}
        </Row>
        <Row gap={20}>
          {['sm', 'md', 'lg', 'pop'].map((k) => <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ width: 92, height: 56, background: '#fff', borderRadius: T.r.md, boxShadow: T.shadow[k] }} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 10, fontWeight: 600 }}>shadow.{k}</div>
          </div>)}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 92, height: 56, background: accent, borderRadius: T.r.md, boxShadow: T.lift(accent) }} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 10, fontWeight: 600 }}>lift(accent)</div>
          </div>
        </Row>
      </Section>

      <Section title="Inputs" hint="text · prefixed (wage) · labelled field">
        <Row gap={16} style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 200 }}><Field label="Rota name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Week of 15 Jun" /></Field></div>
          <div style={{ width: 140 }}><Field label="Hourly wage"><Input prefix="£" defaultValue="12.50" /></Field></div>
        </Row>
      </Section>

      <Section title="Toggles & steppers" hint="Switch · Stepper (type the number too)">
        <Row gap={28}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Switch on={sw1} onChange={setSw1} accent={accent} /><span style={{ fontSize: 13, fontWeight: 600, color: T.body }}>Keyholder</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Switch on={sw2} onChange={setSw2} accent={accent} /><span style={{ fontSize: 13, fontWeight: 600, color: T.body }}>Available all day</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 13, fontWeight: 600, color: T.body }}>Staff needed</span><Stepper value={step} onChange={setStep} min={1} max={12} /></div>
        </Row>
      </Section>

      <Section title="Slider" hint="for ranges — drag or click the track. No 40-click marathons for hours.">
        <div style={{ maxWidth: 420 }}><Slider value={hours} onChange={setHours} min={0} max={48} step={1} accent={accent} format={(v) => `${v} hrs / week`} /></div>
      </Section>

      <Section title="Segmented control" hint="tab-style switcher">
        <Row gap={20}>
          <Segmented options={[{ value: 'week', label: 'This week' }, { value: 'next', label: 'Next week' }]} value={seg} onChange={setSeg} accent={accent} />
          <Segmented size="sm" options={[{ value: 'all', label: 'All day' }, { value: 'hours', label: 'Set hours' }]} value={seg2} onChange={setSeg2} accent={accent} />
        </Row>
      </Section>

      <Section title="Chips & tags" hint="borderless — soft grey at rest, accent on hover, solid when selected">
        <Row style={{ marginBottom: 14 }}>
          <Chip accent={accent} icon="＋">Add shift</Chip>
          <Chip active accent={accent}>Selected</Chip>
          <Chip accent={accent} icon="↑">Extend hours</Chip>
          <Chip accent={accent}>Swap</Chip>
        </Row>
        <Row>
          <Tag color={T.green}>Published</Tag>
          <Tag color={T.faint}>Draft</Tag>
          <Tag color={T.amber}>3 flags</Tag>
          <Tag color={accent} soft={false}>{TEAMS[teamIdx].name}</Tag>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}><Dot color={accent} /> Team dot</span>
        </Row>
      </Section>

      <Section title="Avatars" hint="initials, team-tinted">
        <Row>
          {['Alex Rivera', 'Jordan Kim', 'Sam Okafor', 'Priya Patel'].map((n, i) => <Avatar key={n} name={n} color={TEAMS[i % 3].color} />)}
          <Avatar name="Big One" color={accent} size={52} />
        </Row>
      </Section>

      <Section title="Progress" hint="thin gradient bar (coverage / readiness)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
          <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>Coverage</span><span style={{ color: T.muted }}>82%</span></div><ProgressBar value={0.82} color={accent} radius={99} /></div>
          <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>Capacity</span><span style={{ color: T.muted }}>46%</span></div><ProgressBar value={0.46} height={8} color={accent} radius={99} /></div>
        </div>
      </Section>

      <Section title="Day picker" hint="presets + Mon–Sun; closed days disabled (Sun here)">
        <div style={{ maxWidth: 420 }}><DayPicker days={days} onChange={setDays} openDays={[0, 1, 2, 3, 4, 5]} accent={accent} /></div>
      </Section>

      <Section title="Time range" hint="dual-handle slider — drag the handles">
        <div style={{ maxWidth: 420 }}><TimeRange start={tr[0]} end={tr[1]} onChange={(s, e) => setTr([s, e])} accent={accent} domain={[6, 23]} /></div>
      </Section>

      <div style={{ height: 40 }} />
    </div>
  </div>
}
