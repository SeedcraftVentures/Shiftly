'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme, Card, Button, Segmented, Icon, Ic, TimeRange, Stepper, Switch } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  SANDBOX — conversational shift setup (scripted, not AI). Feel test.
//
//  Two framings, toggle at the top:
//   • "By coverage" (default) — how managers actually think. Ask how many people
//     you need on at once, then the shifts that make that up, with a LIVE coverage
//     strip showing bodies-per-hour vs the target. This is the interesting one.
//   • "By shift" — the earlier flow: define each shift directly.
//
//  Both produce the same shift-pattern shape {name,start,end,days,staff,keyholder}.
//  Nothing saves. Reads real teams from /api/teams, mock fallback.
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MOCK_TEAMS = [{ id: 'm', name: 'Management' }, { id: 'b', name: 'Bar' }, { id: 'r', name: 'Restaurant' }, { id: 'k', name: 'Kitchen' }]
const DOMAIN = [6, 24]

const fmtHour = (h) => {
  const hr = Math.floor(h) % 24, m = Math.round((h % 1) * 60)
  const ap = hr < 12 ? 'am' : 'pm'
  let hh = hr % 12; if (hh === 0) hh = 12
  return m ? `${hh}:${String(m).padStart(2, '0')}${ap}` : `${hh}${ap}`
}
const SCOPES = [{ value: 'weekday', label: 'Weekdays' }, { value: 'weekend', label: 'Weekends' }, { value: 'all', label: 'Every day' }]
const scopeDays = (s) => (s === 'weekday' ? [0, 1, 2, 3, 4] : s === 'weekend' ? [5, 6] : [0, 1, 2, 3, 4, 5, 6])

function suggestFor(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('bar')) return { name: 'Bar open', start: 17, end: 24 }
  if (n.includes('kitchen')) return { name: 'Kitchen', start: 10, end: 18 }
  if (n.includes('manage')) return { name: 'Duty manager', start: 9, end: 17 }
  if (n.includes('rest') || n.includes('foh') || n.includes('front')) return { name: 'Lunch', start: 11, end: 16 }
  return { name: 'Opener', start: 8, end: 16 }
}

// Bodies on at each hour of the day, from a set of shifts scoped to that day-type.
function coverageByHour(shifts, dayType) {
  const hours = []
  for (let h = DOMAIN[0]; h < DOMAIN[1]; h++) {
    let n = 0
    for (const s of shifts) {
      const runs = dayType === 'weekend' ? s.scope !== 'weekday' : s.scope !== 'weekend'
      if (runs && s.start <= h && s.end > h) n += s.staff
    }
    hours.push(n)
  }
  return hours
}
const peak = (arr) => arr.reduce((m, n) => Math.max(m, n), 0)

export default function SetupChat() {
  const { T } = useTheme()
  const [mode, setMode] = useState('coverage')
  const [teams, setTeams] = useState(null)

  useEffect(() => {
    let done = false
    fetch('/api/teams').then((r) => (r.ok ? r.json() : [])).then((d) => {
      if (done) return
      setTeams(Array.isArray(d) && d.length ? d.map((t) => ({ id: t.id || t.team_id, name: t.name || t.team_name })) : MOCK_TEAMS)
    }).catch(() => setTeams(MOCK_TEAMS)).finally(() => { done = true })
    return () => { done = true }
  }, [])

  if (!teams) return <div style={{ fontFamily: T.font, color: T.faint, padding: 48, textAlign: 'center' }}>Loading your teams…</div>

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 720, margin: '0 auto', padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: T.muted }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />Conversational setup · sandbox
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'coverage', label: 'By coverage' }, { value: 'byshift', label: 'By shift' }]} />
        </div>
      </div>
      {/* key remounts the flow when the framing changes, so state resets cleanly */}
      <Flow key={mode} T={T} teams={teams} mode={mode} />
    </div>
  )
}

function Flow({ T, teams, mode }) {
  const [log, setLog] = useState([])
  const [teamIdx, setTeamIdx] = useState(0)
  const [stage, setStage] = useState('intro') // intro | weekday | weekend | shifts | menu | summary
  const [draft, setDraft] = useState(null)
  const [targets, setTargets] = useState({}) // team_id -> { weekday, weekend }
  const [patterns, setPatterns] = useState([]) // { team_id, team, name, start, end, staff, scope, days, keyholder }
  const scroller = useRef(null)

  const say = useCallback((from, text) => setLog((l) => [...l, { from, text, id: l.length + Math.random() }]), [])
  const team = teams[teamIdx]
  const teamShifts = patterns.filter((p) => p.team_id === team?.id)

  // opening lines
  useEffect(() => {
    const names = teams.map((t) => t.name)
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
    say('bot', `Let's map your week. From onboarding you run ${teams.length} teams: ${list}.`)
    if (mode === 'coverage') say('bot', `Think in terms of cover, not shifts. On a typical weekday, how many ${names[0]} do you need on at once during your busy period?`)
    else say('bot', `We'll go team by team. What shifts does ${names[0]} normally run?`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { scroller.current?.scrollTo({ top: 9e6, behavior: 'smooth' }) }, [log, stage, draft])

  const nextTeam = () => {
    const n = teamIdx + 1
    if (n < teams.length) {
      setTeamIdx(n); setDraft(null)
      if (mode === 'coverage') { say('bot', `On to ${teams[n].name}. On a typical weekday, how many do you need on at once?`); setStage('weekday') }
      else { say('bot', `On to ${teams[n].name}. What shifts do they run?`); setStage('intro') }
    } else {
      say('bot', `That's your whole week mapped. Here it is, tweak anything.`); setStage('summary')
    }
  }

  // ── coverage-mode handlers ──
  const answerWeekday = (n) => {
    setTargets((t) => ({ ...t, [team.id]: { ...t[team.id], weekday: n } }))
    say('you', `${n} on a weekday`)
    say('bot', `And at the weekend?`)
    setStage('weekend')
  }
  const answerWeekend = (n) => {
    setTargets((t) => ({ ...t, [team.id]: { ...t[team.id], weekend: n } }))
    say('you', `${n} at the weekend`)
    const wd = targets[team.id]?.weekday ?? n
    say('bot', `Now the shifts that make up your ${wd} on a weekday. What does a typical ${team.name} shift look like? I'll show the cover building up as you go.`)
    setDraft({ ...suggestFor(team.name), staff: 1, scope: 'weekday', keyholder: false })
    setStage('shifts')
  }

  // ── by-shift-mode handler ──
  const startShift = () => { setDraft({ ...suggestFor(team.name), staff: 1, scope: 'weekday', keyholder: false }); setStage('shifts') }

  const addShift = () => {
    setPatterns((p) => [...p, { team_id: team.id, team: team.name, ...draft, days: scopeDays(draft.scope) }])
    say('you', `${draft.name}, ${fmtHour(draft.start)} to ${fmtHour(draft.end)}, ${draft.staff} on, ${SCOPES.find((s) => s.value === draft.scope).label.toLowerCase()}${draft.keyholder ? ', keyholder' : ''}`)
    const after = [...teamShifts, draft]
    if (mode === 'coverage') {
      const pk = peak(coverageByHour(after, 'weekday'))
      const tgt = targets[team.id]?.weekday ?? 0
      if (pk >= tgt && tgt > 0) say('bot', `That covers your ${tgt} at peak. Add more if you like, or move on.`)
      else say('bot', `That's ${pk} at peak, you're after ${tgt}. Add ${tgt - pk} more, or bump the numbers on a shift.`)
    } else {
      say('bot', `Got it. Anything else for ${team.name}, or move on?`)
    }
    setDraft(null); setStage('menu')
  }

  const teamCount = (id) => patterns.filter((p) => p.team_id === id).length

  return (
    <>
      {/* progress dots */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        {teams.map((tm, i) => (
          <span key={tm.id} title={tm.name} style={{ width: 24, height: 6, borderRadius: 99, background: i < teamIdx || stage === 'summary' ? T.green : i === teamIdx ? T.pink : T.track }} />
        ))}
      </div>

      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {log.map((m) => <Bubble key={m.id} T={T} from={m.from} text={m.text} />)}

        {/* live coverage strip while entering shifts in coverage mode */}
        {mode === 'coverage' && (stage === 'shifts' || stage === 'menu') && teamShifts.length > 0 && (
          <CoverageStrip T={T} shifts={teamShifts} target={targets[team?.id]?.weekday ?? 0} label={`${team.name} · weekday cover`} />
        )}

        {stage === 'summary' && <Summary T={T} teams={teams} patterns={patterns} targets={targets} mode={mode} setPatterns={setPatterns} />}
        <div style={{ height: 4 }} />
      </div>

      {/* composer */}
      <div style={{ marginTop: 12 }}>
        {stage === 'intro' && mode === 'byshift' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={startShift}>Add a shift for {team.name}</Button>
            {teamCount(team.id) === 0 && <Button variant="secondary" onClick={nextTeam}>{team.name} runs no set shifts, skip</Button>}
          </div>
        )}

        {stage === 'weekday' && <NumberAsk T={T} label={`On at once (weekday)`} initial={3} onAnswer={answerWeekday} />}
        {stage === 'weekend' && <NumberAsk T={T} label={`On at once (weekend)`} initial={targets[team.id]?.weekday ?? 3} onAnswer={answerWeekend} />}

        {stage === 'shifts' && draft && (
          <ShiftComposer T={T} team={team} draft={draft} setDraft={setDraft} onAdd={addShift} onCancel={() => setStage(teamShifts.length ? 'menu' : (mode === 'coverage' ? 'weekend' : 'intro'))} />
        )}

        {stage === 'menu' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button icon={Ic.plus} onClick={() => { setDraft({ ...suggestFor(team.name), staff: 1, scope: 'weekday', keyholder: false }); setStage('shifts') }}>Another {team.name} shift</Button>
            <Button variant="secondary" onClick={nextTeam}>{teamIdx + 1 < teams.length ? `That's all, next team` : `That's everything`}</Button>
          </div>
        )}

        {stage === 'summary' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12.5, color: T.faint }}>Sandbox, nothing saves. {patterns.length} shifts across {teams.length} teams.</span>
            <Button style={{ marginLeft: 'auto' }} onClick={() => { setPatterns([]); setTargets({}); setLog([]); setTeamIdx(0); setStage(mode === 'coverage' ? 'weekday' : 'intro') }}>Start over</Button>
          </div>
        )}
      </div>
    </>
  )
}

// ── number ask (coverage target) ──────────────────────────────────────────────
function NumberAsk({ T, label, initial, onAnswer }) {
  const [n, setN] = useState(initial)
  return (
    <Card solid pad={14} style={{ border: `1px solid ${T.pink}44`, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>{label}</span>
      <Stepper value={n} onChange={setN} min={0} max={30} accent={T.pink} />
      <Button size="sm" style={{ marginLeft: 'auto' }} onClick={() => onAnswer(n)}>That's right</Button>
    </Card>
  )
}

// ── live coverage strip ───────────────────────────────────────────────────────
function CoverageStrip({ T, shifts, target, label }) {
  const hours = coverageByHour(shifts, 'weekday')
  const pk = peak(hours)
  const max = Math.max(pk, target, 1)
  const met = target > 0 && pk >= target
  return (
    <Card solid pad={13}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: met ? T.green : T.warnInk }}>
          peak {pk}{target ? ` / ${target} needed` : ''}{met ? ' ✓' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 46 }}>
        {hours.map((n, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ height: `${(n / max) * 100}%`, minHeight: n ? 3 : 0, borderRadius: 3, background: target && n < target ? T.amber + '99' : T.pink, transition: 'height .2s' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        {[6, 12, 18, 24].map((h) => <span key={h} style={{ fontSize: 10, color: T.faint }}>{fmtHour(h % 24)}</span>)}
      </div>
    </Card>
  )
}

// ── message bubble ────────────────────────────────────────────────────────────
function Bubble({ T, from, text }) {
  const you = from === 'you'
  return (
    <div style={{ display: 'flex', justifyContent: you ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '82%', padding: '10px 14px', borderRadius: 16,
        borderBottomRightRadius: you ? 4 : 16, borderBottomLeftRadius: you ? 16 : 4,
        background: you ? T.pink : T.cardSolid, color: you ? '#fff' : T.body,
        border: you ? 'none' : `1px solid ${T.border}`, fontSize: 14, lineHeight: 1.5,
        boxShadow: you ? `0 4px 12px ${T.pink}2E` : T.shadow.sm,
      }}>{text}</div>
    </div>
  )
}

// ── inline shift composer ─────────────────────────────────────────────────────
function ShiftComposer({ T, team, draft, setDraft, onAdd, onCancel }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  return (
    <Card solid pad={16} style={{ border: `1px solid ${T.pink}44` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Shift name"
          style={{ flex: 1, fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.ink, background: 'transparent', border: 'none', borderBottom: `1.5px solid ${T.border}`, padding: '4px 2px', outline: 'none' }} />
        <span style={{ fontSize: 12, color: T.faint }}>for {team.name}</span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <TimeRange start={draft.start} end={draft.end} onChange={(s, e) => set({ start: s, end: e })} accent={T.pink} domain={DOMAIN} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>How many on it</div>
          <Stepper value={draft.staff} onChange={(n) => set({ staff: n })} min={1} max={20} accent={T.pink} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Runs</div>
          <Segmented size="sm" full value={draft.scope} onChange={(v) => set({ scope: v })} options={SCOPES} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Keyholder</div>
          <Switch on={draft.keyholder} onChange={(v) => set({ keyholder: v })} accent={T.pink} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onAdd} style={{ marginLeft: 'auto' }}>Add this shift</Button>
      </div>
    </Card>
  )
}

// ── editable summary ──────────────────────────────────────────────────────────
function Summary({ T, teams, patterns, targets, mode, setPatterns }) {
  const remove = (idx) => setPatterns((p) => p.filter((_, i) => i !== idx))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 6 }}>
      {teams.map((tm) => {
        const rows = patterns.map((p, i) => ({ p, i })).filter((x) => x.p.team_id === tm.id)
        if (!rows.length) return null
        const tgt = targets[tm.id]
        return (
          <div key={tm.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 2px 8px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase' }}>{tm.name}</span>
              {mode === 'coverage' && tgt && <span style={{ fontSize: 11.5, color: T.muted }}>needs {tgt.weekday} weekday · {tgt.weekend} weekend</span>}
            </div>
            {mode === 'coverage' && <div style={{ marginBottom: 8 }}><CoverageStrip T={T} shifts={rows.map((r) => r.p)} target={tgt?.weekday ?? 0} label={`${tm.name} · weekday cover`} /></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(({ p, i }) => (
                <Card key={i} solid pad={13}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: T.pink + '16', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon path={Ic.shifts} size={18} stroke={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{p.name}</div>
                      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
                        {fmtHour(p.start)} to {fmtHour(p.end)} · {p.staff} on · {SCOPES.find((s) => s.value === p.scope)?.label.toLowerCase() || 'every day'}{p.keyholder ? ' · keyholder' : ''}
                      </div>
                    </div>
                    <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 18, padding: 6 }} title="Remove">×</button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
