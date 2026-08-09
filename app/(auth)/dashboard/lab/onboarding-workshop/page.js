'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useTheme, Card, Button, Switch, TimeRange, Icon, Ic } from '@/app/components/ui/kit'
import { TeamRotaGrid } from '@/app/(auth)/dashboard/shifts/page'
import { AvailabilityGrid, AvailKey } from '@/app/(auth)/dashboard/staff/page'

// ════════════════════════════════════════════════════════════════════════════
//  SANDBOX — onboarding as a chat panel INSIDE the real app.
//
//  No separate onboarding UI. The companion is a persistent right-hand chat that
//  asks ONE thing at a time — business name, opening hours, team, minimum to run
//  the day, then staff — and every answer edits the REAL app views on the left
//  (the Settings hours editor, the shifts grid, the staff grid). Setup IS the
//  tutorial: by the time they're done they've already used the app. Nothing saves.
// ════════════════════════════════════════════════════════════════════════════

const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4], WEEKEND = [5, 6]
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const PALETTE = ['#FF1F7D', '#6366F1', '#0EA5E9', '#F59E0B']
const uid = (() => { let n = 0; return () => `w${++n}` })()
const NOOP = () => {}
const defaultHours = () => Object.fromEntries(ALL.map((d) => [d, { open: true, opening: [9, 23] }]))
const fmtH = (h) => { const hr = Math.floor(h); const ap = hr < 12 || hr === 24 ? 'am' : 'pm'; let x = hr % 12; if (!x) x = 12; return `${x}${ap}` }

function buildCfg(hours) {
  const business = Object.fromEntries(ALL.map((d) => [d, hours[d]?.open ? [hours[d].opening[0], hours[d].opening[1]] : null]))
  const openDays = ALL.filter((d) => hours[d]?.open)
  const opens = openDays.map((d) => hours[d].opening)
  const open = opens.length ? Math.min(...opens.map((o) => o[0])) : 9
  const close = opens.length ? Math.max(...opens.map((o) => o[1])) : 23
  return { business, openDays, open, close, glance: [Math.floor(open), Math.ceil(close)], slider: [Math.max(0, Math.floor(open) - 2), Math.min(24, Math.ceil(close) + 2)] }
}

const STEPS = ['name', 'hours', 'team', 'coverage', 'staff', 'done']
const TAB = { name: 'Workspace', hours: 'Settings', team: 'Teams', coverage: 'Shifts', staff: 'Staff', done: 'Rota' }

export default function OnboardingWorkshop() {
  const { T } = useTheme()
  const [step, setStep] = useState('name')
  const [msgs, setMsgs] = useState([{ from: 'bot', text: "Hey! I'll help you build your first rota. It takes a couple of minutes, and you'll learn the app as we go since everything happens right here.\n\nFirst up, what's your business called?" }])
  const [name, setName] = useState('')
  const [hours, setHours] = useState(defaultHours)
  const [teams, setTeams] = useState([{ id: 't1', name: 'Front of house', color: PALETTE[0], min: 2 }])
  const [staff, setStaff] = useState([])

  const cfg = useMemo(() => buildCfg(hours), [hours])
  // shifts derive live from each team's "minimum to run the day"
  const shifts = useMemo(() => teams.map((t) => ({ id: t.id + '-base', team_id: t.id, pin: 'none', name: 'Open', start: cfg.open, end: cfg.close, days: cfg.openDays, staff: t.min, keyholder: false })), [teams, cfg])
  const shiftGroups = teams.map((t) => ({ name: t.name, color: t.color, shifts: shifts.filter((s) => s.team_id === t.id) }))
  const staffGroups = teams.map((t) => ({ name: t.name, color: t.color, staff: staff.filter((s) => s.team_id === t.id) }))

  const say = (...m) => setMsgs((prev) => [...prev, ...m])
  const advance = (userText, botText, next) => { say({ from: 'user', text: userText }, { from: 'bot', text: botText }); setStep(next) }

  const hoursSummary = () => { const od = cfg.openDays; if (!od.length) return 'Closed all week'; const same = od.every((d) => hours[d].opening[0] === hours[od[0]].opening[0] && hours[d].opening[1] === hours[od[0]].opening[1]); const range = `${fmtH(hours[od[0]].opening[0])} to ${fmtH(hours[od[0]].opening[1])}`; return same ? `Open ${od.length} days, ${range}` : `Open ${od.length} days, hours vary` }

  return (
    <div style={{ fontFamily: T.font, color: T.body, display: 'flex', gap: 16, padding: 16, height: 'calc(100vh - 32px)', boxSizing: 'border-box', maxWidth: 1360, margin: '0 auto' }}>
      {/* ── LEFT: the real app ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppChrome T={T} name={name} tab={TAB[step]}>
          {step === 'name' && (
            <Hero T={T} icon={Ic.staff} title={name.trim() ? name.trim() : 'Your workspace'} sub={name.trim() ? "That's you. Answer on the right to keep going." : 'Tell me your business name on the right and it lands here.'} />
          )}
          {step === 'hours' && <HoursEditor T={T} hours={hours} setHours={setHours} />}
          {step === 'team' && <TeamsView T={T} teams={teams} />}
          {step === 'coverage' && (
            <Panel T={T} title="Shifts" hint="One baseline shift per team, sized to your minimum. You'll refine these later.">
              <TeamRotaGrid groups={shiftGroups} cfg={cfg} selectedId={null} onSelect={NOOP} />
            </Panel>
          )}
          {step === 'staff' && (
            <Panel T={T} title="Staff" hint={staff.length ? 'Tap a day to change when someone can work. They finish their own profile in the app.' : 'Add your team on the right. They show up here as you go.'}>
              {staff.length ? <><AvailabilityGrid groups={staffGroups} cfg={cfg} selectedId={null} onSelect={NOOP} /><AvailKey accent={T.pink} /></>
                : <Empty T={T}>No one yet. Add your first person on the right.</Empty>}
            </Panel>
          )}
          {step === 'done' && <Hero T={T} icon={Ic.calendar} title="Ready to build" sub={`${teams.length} team, ${staff.length} people, ${cfg.openDays.length} days a week. Hit build on the right and your rota generates right here.`} />}
        </AppChrome>
      </div>

      {/* ── RIGHT: the companion chat ── */}
      <Companion T={T} msgs={msgs} step={step}
        name={name} setName={setName}
        teams={teams} setTeams={setTeams}
        staff={staff} setStaff={setStaff} cfg={cfg}
        onName={(v) => advance(v, `Nice to meet you, ${v}. When are you open? Set your hours on the left. Different days can be different, and there's a "copy to" shortcut.`, 'hours')}
        onHours={() => advance(hoursSummary(), "Got it. What do you call your team? Most places start with one, like Front of house, Bar or Kitchen. You can add more.", 'team')}
        onTeams={(names) => advance(names.join(', '), `Nice. On a normal day, what's the fewest people you need on just to keep ${names.length > 1 ? 'each area' : names[0]} running? That's your baseline shift.`, 'coverage')}
        onCoverage={() => advance(teams.map((t) => `${t.name}: ${t.min}`).join('  ·  '), "That's your shifts sorted. Last thing, add your team. Just a name and their weekly hours to start, they fill in the rest from their own app.", 'staff')}
        onStaff={() => advance(`${staff.length} added`, `You're all set${name.trim() ? ', ' + name.trim() : ''}. Hours, shifts and your team, all done. Ready to build your first rota?`, 'done')}
        say={say}
      />
    </div>
  )
}

// ── the real-app frame around the left content ────────────────────────────────
function AppChrome({ T, name, tab, children }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.cardSolid, border: `1px solid ${T.line}`, borderRadius: 20, overflow: 'hidden', boxShadow: T.shadow.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: `1px solid ${T.hair}` }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: T.pink, color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{name.trim() || 'Shiftly'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['Workspace', 'Settings', 'Teams', 'Shifts', 'Staff', 'Rota'].map((t) => (
            <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 8, color: t === tab ? T.pink : T.faint, background: t === tab ? T.pink + '12' : 'transparent' }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>{children}</div>
    </div>
  )
}

function Panel({ T, title, hint, children }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em' }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: T.muted, margin: '4px 0 16px', maxWidth: 520, lineHeight: 1.5 }}>{hint}</div>}
      {children}
    </div>
  )
}
function Empty({ T, children }) { return <div style={{ color: T.faint, fontSize: 14, padding: '48px 0', textAlign: 'center' }}>{children}</div> }
function Hero({ T, icon, title, sub }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: T.pink + '14', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Icon path={icon} size={28} stroke={1.8} /></div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 15.5, color: T.muted, maxWidth: 420, lineHeight: 1.55 }}>{sub}</div>
    </div>
  )
}

// ── per-day opening hours (the Settings treatment) ────────────────────────────
function HoursEditor({ T, hours, setHours }) {
  const [copyOpen, setCopyOpen] = useState(null)
  const setDay = (i, patch) => setHours((h) => ({ ...h, [i]: { ...h[i], ...patch } }))
  const copyTo = (from, targets) => { const src = hours[from].opening; setHours((h) => { const n = { ...h }; targets.forEach((t) => { if (t !== from) n[t] = { open: true, opening: [...src] } }); return n }); setCopyOpen(null) }
  return (
    <Panel T={T} title="Opening hours" hint="When are you open? Set each day, or set one and copy it across. Closed days are left out of your rota.">
      <Card solid pad={4} style={{ maxWidth: 560 }}>
        <div style={{ padding: '4px 14px' }}>
          {DAYS.map((dn, i) => {
            const d = hours[i] || { open: false }
            return (
              <div key={i} style={{ padding: '14px 0', borderTop: i ? `1px solid ${T.hair}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 96, fontSize: 14, fontWeight: 700, color: d.open ? T.ink : T.faint }}>{dn}</span>
                  <Switch on={d.open} onChange={(v) => setDay(i, { open: v })} accent={T.pink} />
                  <span style={{ fontSize: 13, color: T.faint }}>{d.open ? 'Open' : 'Closed'}</span>
                  {d.open && (
                    <div style={{ position: 'relative', marginLeft: 'auto' }}>
                      <button onClick={() => setCopyOpen(copyOpen === i ? null : i)} style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.pink, background: T.pink + '12', border: 'none', borderRadius: 8, padding: '6px 11px', cursor: 'pointer' }}>Copy to</button>
                      {copyOpen === i && (<>
                        <div onClick={() => setCopyOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 31, background: T.cardSolid, border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: T.shadow.lg, padding: 6, width: 170 }}>
                          {[['All weekdays', WEEKDAYS], ['Weekend', WEEKEND], ['Every day', ALL]].map(([label, tgt]) => (
                            <button key={label} onClick={() => copyTo(i, tgt)} style={{ width: '100%', textAlign: 'left', fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.body, background: 'none', border: 'none', borderRadius: 8, padding: '9px 10px', cursor: 'pointer' }}>{label}</button>
                          ))}
                        </div>
                      </>)}
                    </div>
                  )}
                </div>
                {d.open && <div style={{ marginTop: 14, paddingLeft: 2, maxWidth: 360 }}><TimeRange start={d.opening[0]} end={d.opening[1]} onChange={(a, b) => setDay(i, { opening: [a, b] })} domain={[4, 24]} accent={T.pink} /></div>}
              </div>
            )
          })}
        </div>
      </Card>
    </Panel>
  )
}

function TeamsView({ T, teams }) {
  return (
    <Panel T={T} title="Teams" hint="A team is an area you rota separately, like Front of house, Bar or Kitchen. They share your opening hours.">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {teams.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', borderRadius: 12, background: T.subtle, border: `1px solid ${T.hair}` }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: t.color }} />
            <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{t.name}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── the persistent chat companion (right) ─────────────────────────────────────
function Companion({ T, msgs, step, name, setName, teams, setTeams, staff, setStaff, cfg, onName, onHours, onTeams, onCoverage, onStaff, say }) {
  const scrollRef = useRef(null)
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])

  return (
    <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', background: T.cardSolid, border: `1px solid ${T.line}`, borderRadius: 20, overflow: 'hidden', boxShadow: T.shadow.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${T.hair}` }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: T.pink, color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Setup assistant</div><div style={{ fontSize: 11.5, color: T.faint }}>Answer here, watch it build on the left</div></div>
        <ProgressDots T={T} step={step} />
      </div>

      {/* transcript */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => <Bubble key={i} T={T} from={m.from}>{m.text}</Bubble>)}
      </div>

      {/* composer, one control per step */}
      <div style={{ borderTop: `1px solid ${T.hair}`, padding: 14, background: T.subtle }}>
        {step === 'name' && <NameComposer T={T} name={name} setName={setName} onSubmit={onName} />}
        {step === 'hours' && <NextComposer T={T} label="Hours look right" onSubmit={onHours} />}
        {step === 'team' && <TeamComposer T={T} teams={teams} setTeams={setTeams} onSubmit={onTeams} />}
        {step === 'coverage' && <CoverageComposer T={T} teams={teams} setTeams={setTeams} onSubmit={onCoverage} />}
        {step === 'staff' && <StaffComposer T={T} teams={teams} staff={staff} setStaff={setStaff} cfg={cfg} say={say} onDone={onStaff} />}
        {step === 'done' && <NextComposer T={T} label="Build my rota" onSubmit={NOOP} icon={Ic.calendar} />}
      </div>
    </div>
  )
}

function ProgressDots({ T, step }) {
  const idx = STEPS.indexOf(step)
  return <div style={{ display: 'flex', gap: 5 }}>{STEPS.slice(0, 5).map((s, i) => <span key={s} style={{ width: 7, height: 7, borderRadius: 99, background: i < idx ? T.green : i === idx ? T.pink : T.track }} />)}</div>
}

function Bubble({ T, from, children }) {
  const bot = from === 'bot'
  return (
    <div style={{ display: 'flex', justifyContent: bot ? 'flex-start' : 'flex-end' }}>
      <div style={{ maxWidth: '86%', whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.5, padding: '10px 13px', borderRadius: 14, ...(bot
        ? { background: T.subtle, color: T.body, borderBottomLeftRadius: 4 }
        : { background: T.pink, color: '#fff', borderBottomRightRadius: 4, fontWeight: 600 }) }}>{children}</div>
    </div>
  )
}

const fieldStyle = (T) => ({ flex: 1, minWidth: 0, boxSizing: 'border-box', fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 11, padding: '11px 13px', outline: 'none' })

function NameComposer({ T, name, setName, onSubmit }) {
  const go = () => { const v = name.trim(); if (v) onSubmit(v) }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="The Old Ship" style={fieldStyle(T)} />
      <Button icon={Ic.arrow} disabled={!name.trim()} onClick={go} />
    </div>
  )
}

function NextComposer({ T, label, onSubmit, icon }) {
  return <Button full onClick={onSubmit} icon={icon} arrow={!icon}>{label}</Button>
}

function TeamComposer({ T, teams, setTeams, onSubmit }) {
  const [val, setVal] = useState('')
  const add = () => { const v = val.trim(); if (!v) return; setTeams((p) => [...p, { id: uid(), name: v, color: PALETTE[p.length % PALETTE.length], min: 2 }]); setVal('') }
  const remove = (id) => setTeams((p) => (p.length > 1 ? p.filter((t) => t.id !== id) : p))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {teams.map((t) => (
          <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 8px 6px 11px', borderRadius: 999, background: T.cardSolid, border: `1px solid ${T.line}`, fontSize: 12.5, fontWeight: 700, color: T.ink }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />{t.name}
            {teams.length > 1 && <button onClick={() => remove(t.id)} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add another team" style={fieldStyle(T)} />
        <Button variant="secondary" icon={Ic.plus} onClick={add} />
      </div>
      <Button full arrow onClick={() => onSubmit(teams.map((t) => t.name))}>That's my teams</Button>
    </div>
  )
}

function CoverageComposer({ T, teams, setTeams, onSubmit }) {
  const setMin = (id, d) => setTeams((p) => p.map((t) => (t.id === id ? { ...t, min: Math.max(1, t.min + d) } : t)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {teams.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: T.cardSolid, border: `1px solid ${T.line}` }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color }} />
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{t.name}</span>
          <button onClick={() => setMin(t.id, -1)} style={stepBtn(T)}>–</button>
          <span style={{ width: 24, textAlign: 'center', fontSize: 15, fontWeight: 800, color: T.ink }}>{t.min}</span>
          <button onClick={() => setMin(t.id, 1)} style={stepBtn(T)}>+</button>
        </div>
      ))}
      <Button full arrow onClick={onSubmit}>That's my baseline</Button>
    </div>
  )
}
const stepBtn = (T) => ({ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.body, fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, lineHeight: 1 })

function StaffComposer({ T, teams, staff, setStaff, cfg, say, onDone }) {
  const [nm, setNm] = useState('')
  const [hrs, setHrs] = useState('')
  const [team, setTeam] = useState(teams[0].id)
  const add = () => {
    const v = nm.trim(); if (!v) return
    const contracted = parseInt(hrs, 10) || 0
    setStaff((p) => [...p, { id: uid(), team_id: team, name: v, role: '', contracted, max: 40, wage: 0, pay_basis: 'hourly', annual_salary: 0, annualised_hours: 0, keyholder: false, avail: Object.fromEntries(cfg.openDays.map((d) => [d, true])) }])
    say({ from: 'user', text: `${v}${contracted ? `, ${contracted}h` : ''}` })
    setNm(''); setHrs('')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input autoFocus value={nm} onChange={(e) => setNm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Name" style={{ ...fieldStyle(T), flex: 2 }} />
        <input value={hrs} onChange={(e) => setHrs(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Hrs" inputMode="numeric" style={{ ...fieldStyle(T), flex: 1, width: 52 }} />
        <Button icon={Ic.plus} disabled={!nm.trim()} onClick={add} />
      </div>
      {teams.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {teams.map((t) => (
            <button key={t.id} onClick={() => setTeam(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: T.font, fontSize: 12, fontWeight: 700, border: `1px solid ${team === t.id ? t.color : T.line}`, background: team === t.id ? t.color + '14' : T.cardSolid, color: team === t.id ? T.ink : T.muted }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: t.color }} />{t.name}
            </button>
          ))}
        </div>
      )}
      <Button full arrow variant={staff.length ? 'primary' : 'secondary'} disabled={!staff.length} onClick={onDone}>{staff.length ? `That's everyone (${staff.length})` : 'Add someone to continue'}</Button>
    </div>
  )
}
