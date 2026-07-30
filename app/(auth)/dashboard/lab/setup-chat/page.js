'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme, Card, Button, Icon, Ic, DayPicker, TimeRange, Stepper, Switch } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  SANDBOX — conversational shift setup (scripted, not AI).
//  Instead of the drag-and-drop TimelineBuilder, this walks a manager through
//  "how do you run your week", team by team, in a chat-like flow with light
//  structured inputs. It ends in an editable week. Nothing saves; this is a feel
//  test. Reads real teams from /api/teams, falls back to a realistic mock set.
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MOCK_TEAMS = [{ id: 'm', name: 'Management' }, { id: 'b', name: 'Bar' }, { id: 'r', name: 'Restaurant' }, { id: 'k', name: 'Kitchen' }]

const fmtHour = (h) => {
  const hr = Math.floor(h) % 24, m = Math.round((h % 1) * 60)
  const ap = hr < 12 ? 'am' : 'pm'
  let hh = hr % 12; if (hh === 0) hh = 12
  return m ? `${hh}:${String(m).padStart(2, '0')}${ap}` : `${hh}${ap}`
}
const fmtDays = (d) => {
  const s = [...d].sort((a, b) => a - b)
  if (s.length === 7) return 'every day'
  if (s.length === 5 && s.every((x) => x < 5)) return 'weekdays'
  if (s.length === 2 && s[0] === 5 && s[1] === 6) return 'weekends'
  return s.map((i) => DAYS[i]).join(', ')
}

// A sensible starting shift per kind of team, so the manager usually just tweaks
// and confirms rather than filling a blank form. This is the "it knows how
// hospitality runs" feel, done with a lookup, no AI.
function suggestFor(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('bar')) return { name: 'Bar open', start: 17, end: 24 }
  if (n.includes('kitchen')) return { name: 'Kitchen', start: 10, end: 18 }
  if (n.includes('manage')) return { name: 'Duty manager', start: 9, end: 17 }
  if (n.includes('rest') || n.includes('foh') || n.includes('front')) return { name: 'Lunch', start: 11, end: 16 }
  return { name: 'Opener', start: 8, end: 16 }
}
const freshDraft = (team) => ({ ...suggestFor(team.name), days: [0, 1, 2, 3, 4], staff: 1, keyholder: false })

export default function SetupChat() {
  const { T } = useTheme()
  const [teams, setTeams] = useState(null)
  const [log, setLog] = useState([]) // { from:'bot'|'you', text }
  const [stage, setStage] = useState('intro') // intro | entry | summary
  const [teamIdx, setTeamIdx] = useState(0)
  const [draft, setDraft] = useState(null)
  const [patterns, setPatterns] = useState([]) // { team_id, team, ...shift }
  const scroller = useRef(null)

  const say = useCallback((from, text) => setLog((l) => [...l, { from, text, id: l.length }]), [])

  // Load real teams; fall back to a realistic mock so the demo always runs.
  useEffect(() => {
    let done = false
    fetch('/api/teams').then((r) => (r.ok ? r.json() : [])).then((d) => {
      if (done) return
      const list = Array.isArray(d) && d.length ? d.map((t) => ({ id: t.id || t.team_id, name: t.name || t.team_name })) : MOCK_TEAMS
      setTeams(list)
    }).catch(() => setTeams(MOCK_TEAMS)).finally(() => { done = true })
    return () => { done = true }
  }, [])

  // Opening line once teams are known.
  useEffect(() => {
    if (!teams || log.length) return
    const names = teams.map((t) => t.name)
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
    say('bot', `Let's set up your week. From your onboarding you run ${teams.length} teams: ${list}.`)
    say('bot', `We'll go through them one at a time. What shifts does your ${names[0]} team normally run?`)
  }, [teams, log.length, say])

  useEffect(() => { scroller.current?.scrollTo({ top: 9e6, behavior: 'smooth' }) }, [log, stage, draft])

  const startEntry = () => { setDraft(freshDraft(teams[teamIdx])); setStage('entry') }

  const addShift = () => {
    const team = teams[teamIdx]
    setPatterns((p) => [...p, { team_id: team.id, team: team.name, ...draft }])
    say('you', `${draft.name}, ${fmtHour(draft.start)} to ${fmtHour(draft.end)}, ${fmtDays(draft.days)}, ${draft.staff} on${draft.keyholder ? ', keyholder' : ''}`)
    say('bot', `Got it. Anything else for ${team.name}, or move on?`)
    setDraft(null)
    setStage('team-menu')
  }

  const nextTeamOrDone = () => {
    const next = teamIdx + 1
    if (next < teams.length) {
      setTeamIdx(next)
      say('bot', `On to ${teams[next].name}. What shifts do they run?`)
      setDraft(null)
      setStage('intro')
    } else {
      say('bot', `That's your whole week mapped. Here it is, tweak anything that's not right.`)
      setStage('summary')
    }
  }

  if (!teams) {
    return <div style={{ fontFamily: T.font, color: T.faint, padding: 48, textAlign: 'center' }}>Loading your teams…</div>
  }

  const team = teams[teamIdx]
  const teamCount = (id) => patterns.filter((p) => p.team_id === id).length

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 720, margin: '0 auto', padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
      {/* sandbox tag + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: T.muted }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />Conversational setup · sandbox
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {teams.map((tm, i) => (
            <span key={tm.id} title={tm.name} style={{ width: 24, height: 6, borderRadius: 99, background: i < teamIdx || stage === 'summary' ? T.green : i === teamIdx ? T.pink : T.track }} />
          ))}
        </div>
      </div>

      {/* transcript */}
      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {log.map((m) => <Bubble key={m.id} T={T} from={m.from} text={m.text} />)}

        {stage === 'summary' && <Summary T={T} teams={teams} patterns={patterns} setPatterns={setPatterns} />}
        <div style={{ height: 4 }} />
      </div>

      {/* composer — changes with the stage */}
      <div style={{ marginTop: 12 }}>
        {stage === 'intro' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={startEntry}>Add a shift for {team.name}</Button>
            {teamCount(team.id) === 0 && teams.length > 1 && (
              <Button variant="secondary" onClick={nextTeamOrDone}>{team.name} runs no set shifts, skip</Button>
            )}
          </div>
        )}

        {stage === 'entry' && draft && (
          <ShiftComposer T={T} team={team} draft={draft} setDraft={setDraft} onAdd={addShift} onCancel={() => setStage(teamCount(team.id) ? 'team-menu' : 'intro')} />
        )}

        {stage === 'team-menu' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button onClick={startEntry} icon={Ic.plus}>Another {team.name} shift</Button>
            <Button variant="secondary" onClick={nextTeamOrDone}>
              {teamIdx + 1 < teams.length ? `That's all, next team` : `That's everything`}
            </Button>
          </div>
        )}

        {stage === 'summary' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12.5, color: T.faint }}>Sandbox, nothing saves. {patterns.length} shift patterns across {teams.length} teams.</span>
            <Button style={{ marginLeft: 'auto' }} onClick={() => { setPatterns([]); setLog([]); setTeamIdx(0); setStage('intro') }}>Start over</Button>
          </div>
        )}
      </div>
    </div>
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

// ── inline shift composer (uses the real kit controls) ────────────────────────
function ShiftComposer({ T, team, draft, setDraft, onAdd, onCancel }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  return (
    <Card solid pad={16} style={{ border: `1px solid ${T.pink}44` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Shift name"
          style={{ flex: 1, fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.ink, background: 'transparent', border: 'none', borderBottom: `1.5px solid ${T.border}`, padding: '4px 2px', outline: 'none' }}
        />
        <span style={{ fontSize: 12, color: T.faint }}>for {team.name}</span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <TimeRange start={draft.start} end={draft.end} onChange={(s, e) => set({ start: s, end: e })} accent={T.pink} domain={[6, 24]} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Which days</div>
        <DayPicker days={draft.days} onChange={(d) => set({ days: d })} accent={T.pink} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>People needed</div>
          <Stepper value={draft.staff} onChange={(n) => set({ staff: n })} min={1} max={20} accent={T.pink} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Keyholder on</div>
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

// ── editable summary (the "manual editing" half) ──────────────────────────────
function Summary({ T, teams, patterns, setPatterns }) {
  const remove = (idx) => setPatterns((p) => p.filter((_, i) => i !== idx))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 6 }}>
      {teams.map((tm) => {
        const rows = patterns.map((p, i) => ({ p, i })).filter((x) => x.p.team_id === tm.id)
        if (!rows.length) return null
        return (
          <div key={tm.id}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 2px 8px' }}>{tm.name}</div>
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
                        {fmtHour(p.start)} to {fmtHour(p.end)} · {fmtDays(p.days)} · {p.staff} on{p.keyholder ? ' · keyholder' : ''}
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
