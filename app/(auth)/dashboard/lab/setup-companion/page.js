'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme, Card, Button, Segmented, Icon, Ic, TimeRange, Stepper, Switch } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  SANDBOX, setup COMPANION. The better shape: the real editing canvas stays,
//  a chat companion docks on the right (Airtable-style, not an overlay) and walks
//  you through, coverage-first. You watch shifts + cover fill in on the LEFT as
//  the assistant guides on the RIGHT. Nothing saves. Feel test.
// ════════════════════════════════════════════════════════════════════════════

const MOCK_TEAMS = [{ id: 'm', name: 'Management' }, { id: 'b', name: 'Bar' }, { id: 'r', name: 'Restaurant' }, { id: 'k', name: 'Kitchen' }]
const DOMAIN = [6, 24]
const SCOPES = [{ value: 'weekday', label: 'Weekdays' }, { value: 'weekend', label: 'Weekends' }, { value: 'all', label: 'Every day' }]

const fmtHour = (h) => {
  const hr = Math.floor(h) % 24, m = Math.round((h % 1) * 60)
  const ap = hr < 12 ? 'am' : 'pm'; let hh = hr % 12; if (hh === 0) hh = 12
  return m ? `${hh}:${String(m).padStart(2, '0')}${ap}` : `${hh}${ap}`
}
const suggestFor = (name) => {
  const n = (name || '').toLowerCase()
  if (n.includes('bar')) return { name: 'Bar open', start: 17, end: 24 }
  if (n.includes('kitchen')) return { name: 'Kitchen', start: 10, end: 18 }
  if (n.includes('manage')) return { name: 'Duty manager', start: 9, end: 17 }
  if (n.includes('rest') || n.includes('foh') || n.includes('front')) return { name: 'Lunch', start: 11, end: 16 }
  return { name: 'Opener', start: 8, end: 16 }
}
const newDraft = (team) => ({ ...suggestFor(team.name), staff: 1, scope: 'weekday', keyholder: false })
function coverageByHour(shifts) {
  const out = []
  for (let h = DOMAIN[0]; h < DOMAIN[1]; h++) out.push(shifts.reduce((n, s) => n + (s.scope !== 'weekend' && s.start <= h && s.end > h ? s.staff : 0), 0))
  return out
}
const peak = (a) => a.reduce((m, n) => Math.max(m, n), 0)

export default function SetupCompanion() {
  const { T } = useTheme()
  const [teams, setTeams] = useState(null)
  const [targets, setTargets] = useState({}) // id -> {weekday, weekend}
  const [patterns, setPatterns] = useState([]) // {team_id, ...shift}
  const [teamIdx, setTeamIdx] = useState(0)
  const [stage, setStage] = useState('welcome') // welcome | cover | build | done
  const [draft, setDraft] = useState(null)
  const [log, setLog] = useState([])
  const [wd, setWd] = useState(3)
  const [we, setWe] = useState(4)
  const scroller = useRef(null)

  const say = useCallback((from, text) => setLog((l) => [...l, { from, text, id: l.length + Math.random() }]), [])

  useEffect(() => {
    let done = false
    fetch('/api/teams').then((r) => (r.ok ? r.json() : [])).then((d) => {
      if (done) return
      setTeams(Array.isArray(d) && d.length ? d.map((t) => ({ id: t.id || t.team_id, name: t.name || t.team_name })) : MOCK_TEAMS)
    }).catch(() => setTeams(MOCK_TEAMS)).finally(() => { done = true })
    return () => { done = true }
  }, [])

  useEffect(() => {
    if (!teams || log.length) return
    say('bot', `Hi. I'll set up your shifts with you. You run ${teams.length} teams; we'll take them one at a time, and you'll see it build on the left as we go.`)
    say('bot', `Ready when you are.`)
  }, [teams, log.length, say])

  useEffect(() => { scroller.current?.scrollTo({ top: 9e6, behavior: 'smooth' }) }, [log])

  if (!teams) return <div style={{ fontFamily: T.font, color: T.faint, padding: 48, textAlign: 'center' }}>Loading your teams…</div>
  const team = teams[teamIdx]

  const startTeamCover = (idx) => {
    const tm = teams[idx]
    setWd(3); setWe(4)
    say('bot', `Let's start with ${tm.name}. Forget shift times for a second. On a typical weekday, how many ${tm.name} do you need on the floor at once when it's busy? And at the weekend?`)
    setStage('cover')
  }

  const begin = () => startTeamCover(0)

  const setCover = () => {
    setTargets((t) => ({ ...t, [team.id]: { weekday: wd, weekend: we } }))
    say('you', `${wd} on a weekday, ${we} at the weekend`)
    say('bot', `Great, that's your target. Now let's build the shifts that add up to ${wd}. I have opened the first one on the left, set the times and how many are on it, and watch the cover fill.`)
    setDraft(newDraft(team))
    setStage('build')
  }

  const addShift = () => {
    setPatterns((p) => [...p, { team_id: team.id, ...draft }])
    const after = patterns.filter((p) => p.team_id === team.id).concat(draft)
    const pk = peak(coverageByHour(after))
    const tgt = targets[team.id]?.weekday ?? 0
    say('you', `Added ${draft.name}, ${fmtHour(draft.start)} to ${fmtHour(draft.end)}, ${draft.staff} on`)
    if (pk >= tgt) say('bot', `That's your ${tgt} covered at peak. Add another if you run more, or move to the next team.`)
    else say('bot', `You're at ${pk} of ${tgt} at peak. Add ${tgt - pk} more, or bump the numbers on one.`)
    setDraft(null)
  }

  const nextTeam = () => {
    const n = teamIdx + 1
    if (n < teams.length) { setTeamIdx(n); setDraft(null); startTeamCover(n) }
    else { setDraft(null); say('bot', `That's your whole week set up. Everything on the left is editable, and in the real thing this is where you'd hit save.`); setStage('done') }
  }

  return (
    <div style={{ fontFamily: T.font, color: T.body, display: 'flex', gap: 16, height: 'calc(100vh - 32px)', padding: '16px 16px 0', maxWidth: 1240, margin: '0 auto' }}>
      {/* ── LEFT: the real canvas, filling live ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.02em' }}>Your week</h1>
          <span style={{ fontSize: 12, color: T.faint }}>· setup companion · sandbox</span>
        </div>
        <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 18px' }}>The assistant on the right is filling this in with you. Everything here stays editable.</p>

        {teams.map((tm, i) => {
          const shifts = patterns.filter((p) => p.team_id === tm.id)
          const tgt = targets[tm.id]
          const active = i === teamIdx && stage !== 'welcome' && stage !== 'done'
          const showDraft = active && draft
          if (!tgt && !shifts.length && !active) return null
          return (
            <div key={tm.id} style={{ marginBottom: 18, opacity: !active && stage !== 'done' && (tgt || shifts.length) ? 0.9 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: active ? T.pink : T.ink, letterSpacing: '-0.01em' }}>{tm.name}</span>
                {tgt && <span style={{ fontSize: 11.5, color: T.muted }}>needs {tgt.weekday} weekday · {tgt.weekend} weekend</span>}
                {active && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: T.pink, background: T.pink + '14', borderRadius: 999, padding: '3px 9px' }}>setting up</span>}
              </div>

              {(shifts.length > 0 || showDraft) && (
                <CoverageStrip T={T} shifts={showDraft ? [...shifts, draft] : shifts} target={tgt?.weekday ?? 0} />
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {shifts.map((p, idx) => <ShiftCard key={idx} T={T} p={p} onRemove={() => setPatterns((all) => all.filter((x) => x !== p))} />)}
                {showDraft && <Inspector T={T} team={tm} draft={draft} setDraft={setDraft} onAdd={addShift} onCancel={() => setDraft(null)} />}
              </div>

              {active && !tgt && stage === 'cover' && (
                <Card solid pad={14} style={{ marginTop: 8, borderStyle: 'dashed', borderColor: T.border, color: T.faint, fontSize: 13 }}>
                  Waiting for your coverage numbers from the assistant…
                </Card>
              )}
            </div>
          )
        })}
      </div>

      {/* ── RIGHT: docked companion ── */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: T.shadowHover, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: `1px solid ${T.hair}` }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, background: T.pink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>S</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>Setup assistant</div>
            <div style={{ fontSize: 11, color: T.faint }}>Guides you, you stay in control</div>
          </div>
        </div>

        <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {log.map((m) => <Bubble key={m.id} T={T} from={m.from} text={m.text} />)}
        </div>

        <div style={{ padding: 14, borderTop: `1px solid ${T.hair}` }}>
          {stage === 'welcome' && <Button full onClick={begin}>Start setup</Button>}

          {stage === 'cover' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row T={T} label="On at once, weekday"><Stepper value={wd} onChange={setWd} min={0} max={30} accent={T.pink} /></Row>
              <Row T={T} label="On at once, weekend"><Stepper value={we} onChange={setWe} min={0} max={30} accent={T.pink} /></Row>
              <Button full onClick={setCover}>That's the cover</Button>
            </div>
          )}

          {stage === 'build' && draft && (
            <div style={{ fontSize: 12.5, color: T.muted, textAlign: 'center', lineHeight: 1.5 }}>
              Set the shift on the left, then <b style={{ color: T.ink }}>Add this shift</b>. I'll update the cover.
            </div>
          )}
          {stage === 'build' && !draft && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="secondary" icon={Ic.plus} onClick={() => setDraft(newDraft(team))}>Another shift</Button>
              <Button size="sm" onClick={nextTeam} style={{ marginLeft: 'auto' }}>{teamIdx + 1 < teams.length ? 'Next team' : 'Finish'}</Button>
            </div>
          )}

          {stage === 'done' && (
            <Button full variant="secondary" onClick={() => { setPatterns([]); setTargets({}); setLog([]); setTeamIdx(0); setDraft(null); setStage('welcome') }}>Start over</Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ T, label, children }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.body }}>{label}</span>{children}
  </div>
}

function CoverageStrip({ T, shifts, target }) {
  const hours = coverageByHour(shifts)
  const pk = peak(hours), max = Math.max(pk, target, 1), met = target > 0 && pk >= target
  return (
    <div style={{ background: T.subtle, borderRadius: 12, padding: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>Weekday cover through the day</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: met ? T.green : T.warnInk }}>peak {pk}{target ? ` / ${target}` : ''}{met ? ' ✓' : ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
        {hours.map((n, i) => <div key={i} style={{ flex: 1, height: `${(n / max) * 100}%`, minHeight: n ? 3 : 0, borderRadius: 2, background: target && n < target ? T.amber + '99' : T.pink, transition: 'height .2s' }} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {[6, 12, 18, 24].map((h) => <span key={h} style={{ fontSize: 9.5, color: T.faint }}>{fmtHour(h % 24)}</span>)}
      </div>
    </div>
  )
}

function ShiftCard({ T, p, onRemove }) {
  return (
    <Card solid pad={12}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: T.pink + '16', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={Ic.shifts} size={16} stroke={1.8} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{p.name}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{fmtHour(p.start)} to {fmtHour(p.end)} · {p.staff} on · {SCOPES.find((s) => s.value === p.scope)?.label.toLowerCase()}{p.keyholder ? ' · keyholder' : ''}</div>
        </div>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 17, padding: 4 }} title="Remove">×</button>
      </div>
    </Card>
  )
}

// The real inspector editor, on the LEFT, the assistant opens this and you fill it.
function Inspector({ T, team, draft, setDraft, onAdd, onCancel }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  return (
    <Card solid pad={16} style={{ border: `1.5px solid ${T.pink}66`, boxShadow: `0 0 0 4px ${T.pink}12` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Shift name"
          style={{ flex: 1, fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.ink, background: 'transparent', border: 'none', borderBottom: `1.5px solid ${T.border}`, padding: '4px 2px', outline: 'none' }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.pink }}>new {team.name} shift</span>
      </div>
      <div style={{ marginBottom: 14 }}><TimeRange start={draft.start} end={draft.end} onChange={(s, e) => set({ start: s, end: e })} accent={T.pink} domain={DOMAIN} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div><div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>How many on it</div><Stepper value={draft.staff} onChange={(n) => set({ staff: n })} min={1} max={20} accent={T.pink} /></div>
        <div style={{ flex: 1, minWidth: 170 }}><div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Runs</div><Segmented size="sm" full value={draft.scope} onChange={(v) => set({ scope: v })} options={SCOPES} /></div>
        <div><div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>Keyholder</div><Switch on={draft.keyholder} onChange={(v) => set({ keyholder: v })} accent={T.pink} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onAdd} style={{ marginLeft: 'auto' }}>Add this shift</Button>
      </div>
    </Card>
  )
}

function Bubble({ T, from, text }) {
  const you = from === 'you'
  return (
    <div style={{ display: 'flex', justifyContent: you ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '88%', padding: '9px 12px', borderRadius: 14, borderBottomRightRadius: you ? 4 : 14, borderBottomLeftRadius: you ? 14 : 4, background: you ? T.pink : T.subtle, color: you ? '#fff' : T.body, fontSize: 13.5, lineHeight: 1.5 }}>{text}</div>
    </div>
  )
}
