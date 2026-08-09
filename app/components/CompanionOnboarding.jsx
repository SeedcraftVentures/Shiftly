'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, Card, Button, Switch } from '@/app/components/ui/kit'

// ════════════════════════════════════════════════════════════════════════════
//  COMPANION ONBOARDING — the FTUE. Replaces the old multi-step wizard.
//  Welcome -> the companion walks the manager through a Minimum Viable Week:
//  when you're open, how many people you need each day per team, who they are.
//  From that it creates teams + shift patterns + staff, then drops them on the
//  rota builder ready to generate. A couple of minutes to a publishable rota.
//
//  Coverage -> shifts: a shift pattern holds ONE headcount for all its days, so
//  per-day cover ("3 Mon, 4 Fri") becomes one opening-hours pattern per distinct
//  count, grouped by the days that share it. Respects the schema, no migration.
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TEAM_SUGGESTIONS = ['Front of House', 'Kitchen', 'Bar', 'Management']

const uid = (() => { let n = 0; return () => `t${++n}` })()
const decimalHour = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h + (m || 0) / 60 }
const fmtHour = (h) => { const hr = Math.floor(h) % 24; const ap = hr < 12 ? 'am' : 'pm'; let hh = hr % 12; if (hh === 0) hh = 12; return `${hh}${ap}` }
function nextMondayISO() {
  const d = new Date()
  d.setDate(d.getDate() + ((8 - (d.getDay() || 7)) % 7 || 7))
  return d.toISOString().slice(0, 10)
}
const HOURS = Array.from({ length: 25 }, (_, h) => h)

export default function CompanionOnboarding() {
  const { T } = useTheme()
  const router = useRouter()
  const [stage, setStage] = useState('welcome') // welcome | basics | coverage | staff | building
  const [error, setError] = useState(null)

  const [biz, setBiz] = useState({ name: '', open: 9, close: 23, openDays: [0, 1, 2, 3, 4, 5, 6] })
  const [teams, setTeams] = useState([{ id: uid(), name: 'Front of House', cover: { 0: 2, 1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 2 } }])
  const [staff, setStaff] = useState([])

  const build = async () => {
    setStage('building'); setError(null)
    try {
      // 1. Foundation: org + location + hours + a Location Rules row + the teams.
      const operating_hours = {}
      for (const i of biz.openDays) {
        operating_hours[DAY_NAMES[i]] = { open: true, opening: `${String(Math.floor(biz.open)).padStart(2, '0')}:00`, closing: `${String(Math.floor(biz.close)).padStart(2, '0')}:00` }
      }
      const onbRes = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: biz.name.trim() || 'My business', industry: 'Hospitality', teams: teams.map((t) => ({ label: t.name })), operating_hours }),
      })
      if (!onbRes.ok) throw new Error('Could not set up your business. Try again.')

      // 2. Map team names -> ids (onboarding does not return them).
      const teamRows = await (await fetch('/api/teams')).json()
      const idByName = Object.fromEntries((teamRows || []).map((t) => [t.name, t.id]))

      // 3. Coverage -> shift patterns: one opening-hours pattern per distinct
      //    headcount, covering the days that share it. Skips days with 0 cover.
      for (const team of teams) {
        const team_id = idByName[team.name]
        if (!team_id) continue
        const byCount = {}
        for (const i of biz.openDays) {
          const n = team.cover[i] || 0
          if (n > 0) (byCount[n] ||= []).push(i)
        }
        for (const [count, days] of Object.entries(byCount)) {
          await fetch('/api/shifts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id, name: `${team.name} cover`, anchor_type: 'fixed', start: biz.open, end: biz.close, days, staff: Number(count), keyholder: false, break_duration_mins: 0, break_type: 'unpaid' }),
          })
        }
      }

      // 4. Staff: minimal (name + hours + team + keyholder), available all week by
      //    default so the solver can place them. They refine the rest in the app.
      const availAll = Object.fromEntries(biz.openDays.map((i) => [i, true]))
      for (const s of staff) {
        const team_id = idByName[teams.find((t) => t.id === s.teamId)?.name]
        if (!team_id || !s.name.trim()) continue
        await fetch('/api/staff', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          // hourly_rate 0 on purpose: leaves pay UNSET so the setup checklist can
          // prompt the manager to enter real pay (payroll and reports need it).
          body: JSON.stringify({ team_id, name: s.name.trim(), contracted_hours: s.hours || 0, max_hours: Math.max(40, s.hours || 0), hourly_rate: 0, keyholder: !!s.keyholder, availability: availAll }),
        })
      }

      // 5. Onto the builder to generate + publish (the companion continues there).
      router.push('/dashboard/generate?setup=1')
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.')
      setStage('staff')
    }
  }

  if (stage === 'welcome') return <Welcome T={T} onStart={() => setStage('basics')} />

  return (
    <div style={{ fontFamily: T.font, minHeight: '100vh', background: T.appBg }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 20px 60px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* LEFT: the week building up */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.02em' }}>{biz.name.trim() || 'Your week'}</h1>
          </div>
          <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 18px' }}>Your minimum working week. You will fine-tune it on the rota and your team fill in the rest.</p>
          <Canvas T={T} biz={biz} teams={teams} staff={staff} stage={stage} />
        </div>

        {/* RIGHT: the companion */}
        <div style={{ width: 380, flexShrink: 0, position: 'sticky', top: 20 }}>
          <Card solid pad={0} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: `1px solid ${T.hair}` }}>
              <span style={{ width: 28, height: 28, borderRadius: 9, background: T.pink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>S</span>
              <div><div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>Setup assistant</div><div style={{ fontSize: 11, color: T.faint }}>A couple of minutes, then you publish</div></div>
            </div>
            <div style={{ padding: 18 }}>
              {stage === 'basics' && <BasicsStep T={T} biz={biz} setBiz={setBiz} onNext={() => setStage('coverage')} />}
              {stage === 'coverage' && <CoverageStep T={T} teams={teams} setTeams={setTeams} openDays={biz.openDays} onBack={() => setStage('basics')} onNext={() => { if (!staff.length) setStaff([{ id: uid(), name: '', hours: 0, teamId: teams[0]?.id, keyholder: false }]); setStage('staff') }} />}
              {stage === 'staff' && <StaffStep T={T} staff={staff} setStaff={setStaff} teams={teams} error={error} onBack={() => setStage('coverage')} onBuild={build} />}
              {stage === 'building' && <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ width: 30, height: 30, margin: '0 auto 12px', border: `3px solid ${T.track}`, borderTopColor: T.pink, borderRadius: 999, animation: 'spin .7s linear infinite' }} /><div style={{ fontSize: 13.5, color: T.body }}>Setting up your week…</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── welcome full-screen ───────────────────────────────────────────────────────
function Welcome({ T, onStart }) {
  return (
    <div style={{ fontFamily: T.font, minHeight: '100vh', background: T.appBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card solid pad={40} style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <span style={{ width: 52, height: 52, borderRadius: 15, margin: '0 auto 20px', background: T.pink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24 }}>S</span>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: T.ink, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Welcome to Shiftly</h1>
        <p style={{ fontSize: 15, color: T.body, margin: '0 0 20px', lineHeight: 1.55 }}>Build your rotas in three steps:</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
          {['Set shifts', 'Set staff', 'Build'].map((s, i) => (
            <span key={s} style={{ fontSize: 12.5, fontWeight: 700, color: T.pink, background: T.pink + '14', borderRadius: 999, padding: '7px 14px' }}>{i + 1}. {s}</span>
          ))}
        </div>
        <p style={{ fontSize: 14, color: T.muted, margin: '0 0 26px', lineHeight: 1.55 }}>Let's get you set up and ready to publish rotas as quickly as we can. Your companion will walk you through it.</p>
        <Button full onClick={onStart}>Let's go</Button>
      </Card>
    </div>
  )
}

// ── step 1: basics ────────────────────────────────────────────────────────────
function BasicsStep({ T, biz, setBiz, onNext }) {
  const set = (p) => setBiz((b) => ({ ...b, ...p }))
  const toggleDay = (i) => set({ openDays: biz.openDays.includes(i) ? biz.openDays.filter((d) => d !== i) : [...biz.openDays, i].sort((a, b) => a - b) })
  const field = { fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', outline: 'none' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13.5, color: T.body, margin: 0, lineHeight: 1.5 }}>First, the basics. What's the place called, and when are you open?</p>
      <div>
        <label style={lbl(T)}>Business name</label>
        <input value={biz.name} onChange={(e) => set({ name: e.target.value })} placeholder="The Old Ship" style={{ ...field, width: '100%', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={lbl(T)}>Open days</label>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {DAYS.map((d, i) => {
            const on = biz.openDays.includes(i)
            return <button key={d} onClick={() => toggleDay(i)} style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? T.pink : T.subtle, color: on ? '#fff' : T.body }}>{d}</button>
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}><label style={lbl(T)}>Opens</label><select value={biz.open} onChange={(e) => set({ open: Number(e.target.value) })} style={{ ...field, width: '100%' }}>{HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}</select></div>
        <div style={{ flex: 1 }}><label style={lbl(T)}>Closes</label><select value={biz.close} onChange={(e) => set({ close: Number(e.target.value) })} style={{ ...field, width: '100%' }}>{HOURS.slice(1).map((h) => <option key={h} value={h}>{fmtHour(h % 24 === 0 ? 24 : h)}</option>)}</select></div>
      </div>
      <Button full disabled={!biz.openDays.length || biz.close <= biz.open} onClick={onNext}>Next: who you need on</Button>
    </div>
  )
}

// ── step 2: coverage per team per day ─────────────────────────────────────────
function CoverageStep({ T, teams, setTeams, openDays, onBack, onNext }) {
  const setCover = (tid, day, n) => setTeams((ts) => ts.map((t) => (t.id === tid ? { ...t, cover: { ...t.cover, [day]: n } } : t)))
  const setName = (tid, name) => setTeams((ts) => ts.map((t) => (t.id === tid ? { ...t, name } : t)))
  const addTeam = (name) => setTeams((ts) => [...ts, { id: uid(), name: name || 'New team', cover: Object.fromEntries(openDays.map((i) => [i, 1])) }])
  const removeTeam = (tid) => setTeams((ts) => ts.filter((t) => t.id !== tid))
  const unusedSuggestions = TEAM_SUGGESTIONS.filter((s) => !teams.some((t) => t.name === s))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13.5, color: T.body, margin: 0, lineHeight: 1.5 }}>Now the cover. For each team, how many people do you need on at once, each day? Think of your minimum to run the place.</p>
      {teams.map((team) => (
        <Card key={team.id} solid pad={12} style={{ border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input value={team.name} onChange={(e) => setName(team.id, e.target.value)} style={{ flex: 1, fontFamily: T.font, fontSize: 13.5, fontWeight: 700, color: T.ink, background: 'transparent', border: 'none', borderBottom: `1.5px solid ${T.border}`, padding: '2px 0', outline: 'none' }} />
            {teams.length > 1 && <button onClick={() => removeTeam(team.id)} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 16 }}>×</button>}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {openDays.map((i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, marginBottom: 3 }}>{DAYS[i]}</div>
                <input type="number" min={0} max={30} value={team.cover[i] ?? 0} onChange={(e) => setCover(team.id, i, Math.max(0, Number(e.target.value)))} style={{ width: 34, fontFamily: T.font, fontSize: 14, fontWeight: 700, textAlign: 'center', color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 0', outline: 'none' }} />
              </div>
            ))}
          </div>
        </Card>
      ))}
      {unusedSuggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {unusedSuggestions.map((s) => <button key={s} onClick={() => addTeam(s)} style={{ fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.pink, background: T.pink + '12', border: `1px solid ${T.pink}33`, borderRadius: 999, padding: '6px 11px', cursor: 'pointer' }}>+ {s}</button>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="sm" onClick={onBack}>Back</Button>
        <Button size="sm" style={{ marginLeft: 'auto' }} onClick={onNext}>Next: add your team</Button>
      </div>
    </div>
  )
}

// ── step 3: staff ─────────────────────────────────────────────────────────────
function StaffStep({ T, staff, setStaff, teams, error, onBack, onBuild }) {
  const set = (id, p) => setStaff((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const add = () => setStaff((s) => [...s, { id: uid(), name: '', hours: 0, teamId: teams[0]?.id, keyholder: false }])
  const remove = (id) => setStaff((s) => s.filter((x) => x.id !== id))
  const field = { fontFamily: T.font, fontSize: 13.5, fontWeight: 600, color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 9, padding: '9px 11px', outline: 'none' }
  const named = staff.filter((s) => s.name.trim()).length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13.5, color: T.body, margin: 0, lineHeight: 1.5 }}>Add your team. Just first names and their usual weekly hours for now. They fill in the rest from their own app, and you set pay on the Staff tab.</p>
      {staff.map((s) => (
        <Card key={s.id} solid pad={11} style={{ border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
            <input value={s.name} onChange={(e) => set(s.id, { name: e.target.value })} placeholder="First name" style={{ ...field, flex: 1 }} />
            <div style={{ width: 88 }}><input type="number" min={0} max={60} value={s.hours || ''} onChange={(e) => set(s.id, { hours: Number(e.target.value) })} placeholder="hrs" style={{ ...field, width: '100%', boxSizing: 'border-box' }} /></div>
            {staff.length > 1 && <button onClick={() => remove(s.id)} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>×</button>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {teams.length > 1 && (
              <select value={s.teamId} onChange={(e) => set(s.id, { teamId: e.target.value })} style={{ ...field, flex: 1, padding: '7px 9px' }}>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: teams.length > 1 ? 0 : 'auto' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>Keyholder</span>
              <Switch on={s.keyholder} onChange={(v) => set(s.id, { keyholder: v })} accent={T.pink} />
            </span>
          </div>
        </Card>
      ))}
      <button onClick={add} style={{ fontFamily: T.font, fontSize: 12.5, fontWeight: 700, color: T.pink, background: 'none', border: `1px dashed ${T.border}`, borderRadius: 10, padding: '9px 0', cursor: 'pointer' }}>+ Add another</button>
      {error && <div style={{ fontSize: 12.5, color: T.red }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button variant="secondary" size="sm" onClick={onBack}>Back</Button>
        <span style={{ fontSize: 11.5, color: T.faint, marginLeft: 'auto' }}>{named || 'no'} added</span>
        <Button size="sm" disabled={!named} onClick={onBuild}>Build my rota</Button>
      </div>
    </div>
  )
}

// ── left canvas: the week building up ─────────────────────────────────────────
function Canvas({ T, biz, teams, staff }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card solid pad={16}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Open</div>
        {biz.openDays.length ? (
          <div style={{ fontSize: 14, color: T.body }}>{biz.openDays.map((i) => DAYS[i]).join(', ')} · {fmtHour(biz.open)} to {fmtHour(biz.close % 24 === 0 ? 24 : biz.close)}</div>
        ) : <div style={{ fontSize: 13.5, color: T.faint }}>Set your open days and hours…</div>}
      </Card>

      {teams.map((team) => {
        const total = biz.openDays.reduce((n, i) => Math.max(n, team.cover[i] || 0), 0)
        const people = staff.filter((s) => s.teamId === team.id && s.name.trim())
        return (
          <Card key={team.id} solid pad={16}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{team.name}</span>
              <span style={{ fontSize: 11.5, color: T.muted }}>peak {total} on</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: people.length ? 12 : 0 }}>
              {biz.openDays.map((i) => {
                const n = team.cover[i] || 0
                const max = Math.max(total, 1)
                return (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '70%', height: `${(n / max) * 100}%`, minHeight: n ? 4 : 0, borderRadius: 3, background: T.pink, transition: 'height .2s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: T.faint, marginTop: 3 }}>{DAYS[i]}</div>
                  </div>
                )
              })}
            </div>
            {people.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {people.map((s) => <span key={s.id} style={{ fontSize: 12, fontWeight: 600, color: T.body, background: T.subtle, borderRadius: 999, padding: '4px 10px' }}>{s.name}{s.keyholder ? <span style={{ color: T.pink, fontWeight: 700 }}> · key</span> : ''}</span>)}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

const lbl = (T) => ({ fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 })
