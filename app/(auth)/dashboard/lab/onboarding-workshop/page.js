'use client'

import { useState, useMemo } from 'react'
import { useTheme, Card, Button, DayPicker, TimeRange, Icon, Ic } from '@/app/components/ui/kit'
import { Inspector as ShiftInspector, TeamRotaGrid } from '@/app/(auth)/dashboard/shifts/page'
import { Inspector as StaffInspector, AvailabilityGrid, AvailKey } from '@/app/(auth)/dashboard/staff/page'

// ════════════════════════════════════════════════════════════════════════════
//  SANDBOX — onboarding workshop. Iterating on the companion FTUE using the REAL
//  app components (the shift + staff Inspectors, the grids), not bespoke modals.
//  Architecture: a thin upfront capture (business + hours), then a docked chat
//  companion on the RIGHT driving a real two-pane workspace on the LEFT. Nothing
//  saves. Mock data. This is a feel test, iterate freely.
// ════════════════════════════════════════════════════════════════════════════

const ALL = [0, 1, 2, 3, 4, 5, 6]
const uid = (() => { let n = 0; return () => `w${++n}` })()
const NOOP = () => {}

function buildCfg(openDays, open, close) {
  const business = Object.fromEntries(ALL.map((d) => [d, openDays.includes(d) ? [open, close] : null]))
  return { business, openDays, open, close, glance: [Math.floor(open), Math.ceil(close)], slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
}

export default function OnboardingWorkshop() {
  const { T } = useTheme()
  const [stage, setStage] = useState('basics') // basics | shifts | staff | build
  const [biz, setBiz] = useState({ name: '', openDays: [0, 1, 2, 3, 4, 5, 6], open: 9, close: 23 })
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [selShift, setSelShift] = useState(null)
  const [selStaff, setSelStaff] = useState(null)

  const cfg = useMemo(() => buildCfg(biz.openDays, biz.open, biz.close), [biz])
  const team = { id: 't1', name: biz.name.trim() || 'Your team', color: T.pink }
  const groups = [{ name: team.name, color: T.pink, shifts }]
  const staffGroups = [{ name: team.name, color: T.pink, staff }]
  const shiftObj = shifts.find((s) => s.id === selShift)
  const staffObj = staff.find((s) => s.id === selStaff)

  const addShift = () => {
    const id = uid()
    setShifts((prev) => [...prev, { id, team_id: 't1', pin: 'none', name: 'New shift', start: biz.open, end: Math.min(biz.close, biz.open + 8), days: [...biz.openDays], staff: 1, keyholder: false }])
    setSelShift(id)
  }
  const patchShift = (id, p) => setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const addStaff = () => {
    const id = uid()
    setStaff((prev) => [...prev, { id, team_id: 't1', name: 'New person', role: '', contracted: 0, max: 40, wage: 0, pay_basis: 'hourly', annual_salary: 0, annualised_hours: 0, keyholder: false, avail: Object.fromEntries(biz.openDays.map((d) => [d, true])) }])
    setSelStaff(id)
  }
  const patchStaff = (id, p) => setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))

  // ── stage 1: basics upfront (a real form, not a chat modal) ──
  if (stage === 'basics') {
    return (
      <div style={{ fontFamily: T.font, minHeight: 'calc(100vh - 32px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card solid pad={32} style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 14 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />Onboarding workshop · sandbox</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Let's set up your place</h1>
          <p style={{ fontSize: 14, color: T.muted, margin: '0 0 22px', lineHeight: 1.5 }}>Just the basics to start. Your assistant takes it from here.</p>

          <label style={lbl(T)}>Business name</label>
          <input value={biz.name} onChange={(e) => setBiz((b) => ({ ...b, name: e.target.value }))} placeholder="The Old Ship"
            style={{ width: '100%', boxSizing: 'border-box', fontFamily: T.font, fontSize: 15, fontWeight: 600, color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '11px 13px', outline: 'none', marginBottom: 18 }} />

          <label style={lbl(T)}>Open days</label>
          <div style={{ marginBottom: 18 }}><DayPicker days={biz.openDays} onChange={(d) => setBiz((b) => ({ ...b, openDays: d }))} accent={T.pink} /></div>

          <label style={lbl(T)}>Opening hours</label>
          <div style={{ marginBottom: 24 }}><TimeRange start={biz.open} end={biz.close} onChange={(s, e) => setBiz((b) => ({ ...b, open: s, close: e }))} accent={T.pink} domain={[5, 24]} /></div>

          <Button full disabled={!biz.openDays.length} onClick={() => setStage('shifts')}>Start setup</Button>
        </Card>
      </div>
    )
  }

  // ── stages 2-4: companion + real workspace ──
  return (
    <div style={{ fontFamily: T.font, color: T.body, display: 'flex', gap: 18, padding: '20px 20px 0', minHeight: 'calc(100vh - 32px)', maxWidth: 1280, margin: '0 auto' }}>
      {/* LEFT: the real app surfaces */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.02em' }}>{biz.name.trim() || 'Your week'}</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
            {['shifts', 'staff', 'build'].map((s, i) => <span key={s} style={{ width: 26, height: 6, borderRadius: 99, background: ['shifts', 'staff', 'build'].indexOf(stage) > i ? T.green : stage === s ? T.pink : T.track }} />)}
          </div>
        </div>

        {stage === 'shifts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 16 }}>
              {shiftObj
                ? <ShiftInspector key={selShift} shift={shiftObj} patch={(p) => patchShift(selShift, p)} onDelete={() => { setShifts((s) => s.filter((x) => x.id !== selShift)); setSelShift(null) }} saveState="clean" onSave={NOOP} accent={T.pink} cfg={cfg} tips />
                : <Card solid pad={20} style={{ color: T.faint, fontSize: 13.5, textAlign: 'center' }}>Pick a shift on the right to edit it here, in the real inspector.</Card>}
            </div>
            <Card solid pad={18}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>Shifts</span>
                <Button size="sm" icon={Ic.plus} onClick={addShift}>Add shift</Button>
              </div>
              {shifts.length ? <TeamRotaGrid groups={groups} cfg={cfg} selectedId={selShift} onSelect={setSelShift} />
                : <div style={{ color: T.faint, fontSize: 13.5, padding: '24px 0', textAlign: 'center' }}>No shifts yet. The assistant will help you add your cover.</div>}
            </Card>
          </div>
        )}

        {stage === 'staff' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 16 }}>
              {staffObj
                ? <StaffInspector key={selStaff} s={staffObj} patch={(p) => patchStaff(selStaff, p)} onDelete={() => { setStaff((s) => s.filter((x) => x.id !== selStaff)); setSelStaff(null) }} saveState="clean" onSave={NOOP} accent={T.pink} cfg={cfg} />
                : <Card solid pad={20} style={{ color: T.faint, fontSize: 13.5, textAlign: 'center' }}>Pick a person to edit their contract and details here.</Card>}
            </div>
            <Card solid pad={18}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>Team</span>
                <Button size="sm" icon={Ic.plus} onClick={addStaff}>Add person</Button>
              </div>
              {staff.length ? <><AvailabilityGrid groups={staffGroups} cfg={cfg} selectedId={selStaff} onSelect={setSelStaff} /><AvailKey accent={T.pink} /></>
                : <div style={{ color: T.faint, fontSize: 13.5, padding: '24px 0', textAlign: 'center' }}>No one yet. Add your team and their availability shows here.</div>}
            </Card>
          </div>
        )}

        {stage === 'build' && (
          <Card solid pad={40} style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, margin: '0 auto 16px', background: T.pink + '14', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={Ic.calendar} size={24} /></div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Ready to build</div>
            <div style={{ fontSize: 14, color: T.muted, maxWidth: 360, margin: '0 auto', lineHeight: 1.55 }}>In the real thing, this is where the rota generates and the assistant guides you through reviewing and publishing.</div>
          </Card>
        )}
      </div>

      {/* RIGHT: the docked chat companion */}
      <Companion T={T} stage={stage} shifts={shifts} staff={staff} onAddShift={addShift} onAddStaff={addStaff}
        onNext={() => setStage(stage === 'shifts' ? 'staff' : stage === 'staff' ? 'build' : 'build')}
        onBack={() => setStage(stage === 'staff' ? 'shifts' : stage === 'build' ? 'staff' : 'basics')} />
    </div>
  )
}

// ── the docked companion (right) ──────────────────────────────────────────────
function Companion({ T, stage, shifts, staff, onAddShift, onAddStaff, onNext, onBack }) {
  const script = {
    shifts: { title: 'Your shifts', body: "Let's build your cover. Add a shift for a busy period, then set its times, days and how many people you need on it. I'll show it on the grid.", cta: shifts.length ? 'Next: your team' : null, add: 'Add a shift', onAdd: onAddShift },
    staff: { title: 'Your team', body: 'Now add your people. Just a name and their contract to start. Tap a day on the grid to set when they can work. They fill in the rest from their own app.', cta: staff.length ? 'Next: build the rota' : null, add: 'Add a person', onAdd: onAddStaff },
    build: { title: "That's the hard part done", body: 'You have your shifts and your team. Generate the rota and I will walk you through reviewing and publishing it.', cta: 'Generate the rota', onAdd: null },
  }[stage]

  return (
    <div style={{ width: 360, flexShrink: 0, position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
      <Card solid pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: `1px solid ${T.hair}` }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, background: T.pink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>S</span>
          <div><div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>Setup assistant</div><div style={{ fontSize: 11, color: T.faint }}>I'll guide, you edit on the left</div></div>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ background: T.subtle, borderRadius: 14, borderBottomLeftRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{script.title}</div>
            <p style={{ fontSize: 13, color: T.body, lineHeight: 1.55, margin: 0 }}>{script.body}</p>
          </div>
          {script.onAdd && <Button full size="sm" icon={Ic.plus} onClick={script.onAdd} style={{ marginBottom: 10 }}>{script.add}</Button>}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={onBack}>Back</Button>
            {script.cta && <Button size="sm" style={{ marginLeft: 'auto' }} onClick={onNext}>{script.cta}</Button>}
          </div>
        </div>
      </Card>
    </div>
  )
}

const lbl = (T) => ({ fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 7 })
