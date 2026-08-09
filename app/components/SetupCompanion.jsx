'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme, Card, Button, Switch, TimeRange, Icon, Ic } from '@/app/components/ui/kit'
import { useEntitlement } from '@/app/hooks/useEntitlement'

// ════════════════════════════════════════════════════════════════════════════
//  SETUP COMPANION — first-run setup, in the app, no separate onboarding route.
//
//  A docked right-hand chat that asks one thing at a time — business name,
//  opening hours, team(s), the minimum to run the day, then staff — and writes
//  REAL data via the existing APIs as it goes. It lightly navigates the main
//  area to the matching page (Settings / Shifts / Staff) so the manager watches
//  their real app fill in. Setup doubles as learning the app.
//
//  Where it resumes is DERIVED from live data, not a stored flag: no teams ->
//  start at the beginning; teams but no shifts -> jump to coverage; shifts but
//  no staff -> jump to staff; both -> step aside (a bubble). That makes a refresh
//  mid-flow safe (no duplicate rows) and keeps it honest about reality.
//
//  Coverage -> shifts: one baseline shift per team covering all open days, sized
//  to the team's minimum. Staff get hourly_rate 0 on purpose so the dashboard
//  SetupChecklist prompts for real pay. Same payloads the old wizard used.
// ════════════════════════════════════════════════════════════════════════════

const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [0, 1, 2, 3, 4], WEEKEND = [5, 6]
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const PALETTE = ['#FF1F7D', '#6366F1', '#0EA5E9', '#F59E0B']
const DISMISS_KEY = 'shiftly_companion_dismissed'
const uid = (() => { let n = 0; return () => `w${++n}` })()
const defaultHours = () => Object.fromEntries(ALL.map((d) => [d, { open: true, opening: [9, 23] }]))
const fmtH = (h) => { const hr = Math.floor(h); const ap = hr < 12 || hr === 24 ? 'am' : 'pm'; let x = hr % 12; if (!x) x = 12; return `${x}${ap}` }
const hhmm = (h) => { const hr = Math.floor(h); const m = Math.round((h - hr) * 60); return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')}` }

const STEPS = ['name', 'hours', 'team', 'coverage', 'staff', 'done']
// Only navigate to a real page once its data exists, so we never drop the
// manager onto a page that assumes a location/team before we've created one.
// (name/hours/team happen in the drawer; foundation is written entering coverage.)
// The staff route is built with ?team=<id> in goRoute so they land on a team tab.
const STEP_ROUTE = { coverage: '/dashboard/shifts' }
// Footprint the open drawer occupies on wide screens, so the dashboard can
// condense to the left instead of being overlapped. Matches the fixed geometry
// below (width 384 + right margin 16 + a small gap).
export const DRAWER_W = 416

export default function SetupCompanion({ onWidth }) {
  const { T } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const { isAiTier } = useEntitlement()

  const [ready, setReady] = useState(false)
  const [hidden, setHidden] = useState(true)   // nothing to do, or dismissed
  const [open, setOpen] = useState(true)        // drawer open vs collapsed bubble
  const [mode, setMode] = useState('setup')     // 'setup' (guided build) | 'ask' (Q&A help)
  const [step, setStep] = useState('name')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [msgs, setMsgs] = useState([])
  const [name, setName] = useState('')
  const [hours, setHours] = useState(defaultHours)
  const [teams, setTeams] = useState([{ id: null, name: 'Front of house', color: PALETTE[0], min: 2 }])
  const [staffCount, setStaffCount] = useState(0)
  const [staffHours, setStaffHours] = useState(0) // sum of contracted hours added
  const [reqHours, setReqHours] = useState(0) // staff-hours needed to cover the week
  const foundationDone = useRef(false) // has /api/onboarding already run this session/workspace
  const commitFoundationCache = useRef(null) // name -> id map from foundation, for the shifts step

  const cfg = useMemo(() => {
    const openDays = ALL.filter((d) => hours[d]?.open)
    const opens = openDays.map((d) => hours[d].opening)
    const open = opens.length ? Math.min(...opens.map((o) => o[0])) : 9
    const close = opens.length ? Math.max(...opens.map((o) => o[1])) : 23
    return { openDays, open, close }
  }, [hours])

  const say = (...m) => setMsgs((prev) => [...prev, ...m])

  // Report our footprint so the dashboard layout can condense instead of overlap.
  useEffect(() => {
    const w = ready && !hidden && open ? DRAWER_W : 0
    onWidth?.(w)
    return () => onWidth?.(0)
  }, [ready, hidden, open, onWidth])

  // ── decide where to pick up, from live data ──────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') { setReady(true); return }
    let cancelled = false
    ;(async () => {
      try {
        const [tRes, sRes, stRes] = await Promise.all([
          fetch('/api/teams'), fetch('/api/shifts'), fetch('/api/staff'),
        ])
        const teamRows = tRes.ok ? await tRes.json() : []
        const shiftRows = sRes.ok ? await sRes.json() : []
        const staffRows = stRes.ok ? await stRes.json() : []
        if (cancelled) return
        const hasTeams = Array.isArray(teamRows) && teamRows.length > 0
        const hasShifts = Array.isArray(shiftRows) && shiftRows.length > 0
        const hasStaff = Array.isArray(staffRows) && staffRows.length > 0

        if (hasShifts && hasStaff) { setMode('ask'); setHidden(false); setOpen(false); setReady(true); return } // setup done -> persistent help bubble

        if (!hasTeams) {
          startAt('name', "Hey! Let's get you set up. It takes a couple of minutes, and everything happens right here so you learn the app as we go.\n\nFirst up, what's your business called?")
        } else {
          // foundation exists; adopt the real teams and their ids
          foundationDone.current = true
          setTeams(teamRows.map((t, i) => ({ id: t.id, name: t.name, color: PALETTE[i % PALETTE.length], min: 2 })))
          if (!hasShifts) {
            startAt('coverage', "Welcome back. Let's finish setup. On a normal day, what's the fewest people you need on to keep each area running? That's your baseline shift.")
          } else {
            const req = Math.round(shiftRows.reduce((a, s) => a + (Number(s.end) - Number(s.start)) * (Number(s.staff) || 1) * ((s.days || []).length || 1), 0))
            const added = staffRows.reduce((a, s) => a + (Number(s.contracted_hours ?? s.contracted) || 0), 0)
            setReqHours(req); setStaffCount(staffRows.length); setStaffHours(added)
            startAt('staff', `Almost there. Last thing, add your team. Just a name and their weekly hours to start, they fill in the rest from their own app.\n\nYou'll want about ${req} staff-hours a week to cover your shifts.`)
          }
        }
        setReady(true)
      } catch {
        if (!cancelled) { setHidden(true); setReady(true) } // never block the dashboard
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startAt = (s, greeting) => { setHidden(false); setOpen(true); setStep(s); setMsgs([{ from: 'bot', text: greeting }]) }
  const goRoute = (s) => {
    let r = STEP_ROUTE[s]
    if (s === 'staff') r = `/dashboard/staff${teams[0]?.id ? `?team=${teams[0].id}` : ''}`
    if (!r) return
    if (pathname !== r.split('?')[0]) router.push(r)
  }
  const advance = (userText, botText, next) => { say({ from: 'user', text: userText }, { from: 'bot', text: botText }); setStep(next); goRoute(next) }

  const hoursSummary = () => {
    const od = cfg.openDays
    if (!od.length) return 'Closed all week'
    const same = od.every((d) => hours[d].opening[0] === hours[od[0]].opening[0] && hours[d].opening[1] === hours[od[0]].opening[1])
    return same ? `Open ${od.length} days, ${fmtH(hours[od[0]].opening[0])} to ${fmtH(hours[od[0]].opening[1])}` : `Open ${od.length} days, hours vary`
  }

  // ── writes ───────────────────────────────────────────────────────────────────
  const commitFoundation = async () => {
    const operating_hours = {}
    for (const i of cfg.openDays) operating_hours[DAYS[i]] = { open: true, opening: hhmm(hours[i].opening[0]), closing: hhmm(hours[i].opening[1]) }
    const res = await fetch('/api/onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name: name.trim() || 'My business', industry: 'Hospitality', teams: teams.map((t) => ({ label: t.name })), operating_hours }),
    })
    if (!res.ok) throw new Error('Could not set up your business. Give it another go.')
    const teamRows = await (await fetch('/api/teams')).json()
    const idByName = Object.fromEntries((teamRows || []).map((t) => [t.name, t.id]))
    setTeams((prev) => prev.map((t) => ({ ...t, id: idByName[t.name] ?? t.id })))
    foundationDone.current = true
    return idByName
  }

  const commitShifts = async (idByName) => {
    for (const t of teams) {
      const team_id = (idByName && idByName[t.name]) || t.id
      if (!team_id) continue
      await fetch('/api/shifts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id, name: `${t.name} cover`, anchor_type: 'fixed', start: cfg.open, end: cfg.close, days: cfg.openDays, staff: t.min, keyholder: false, break_duration_mins: 0, break_type: 'unpaid' }),
      })
    }
  }

  const addStaff = async ({ name: sn, hours: sh, teamId }) => {
    const availAll = Object.fromEntries(cfg.openDays.map((i) => [i, true]))
    const res = await fetch('/api/staff', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, name: sn, contracted_hours: sh || 0, max_hours: Math.max(40, sh || 0), hourly_rate: 0, keyholder: false, availability: availAll }),
    })
    if (!res.ok) throw new Error('Could not add that person. Try again.')
    setStaffCount((c) => c + 1)
    setStaffHours((h) => h + (sh || 0))
  }

  // ── step submit handlers ─────────────────────────────────────────────────────
  const onName = (v) => { setName(v); advance(v, `Nice to meet you, ${v}. When are you open? Set your hours below. Different days can be different, and there's a "copy to" shortcut.`, 'hours') }
  const onHours = () => advance(hoursSummary(), "Got it. What do you call your team? Most places start with one, like Front of house, Bar or Kitchen. You can add more.", 'team')

  const onTeams = async (list) => {
    setBusy(true); setError(null)
    try {
      const idByName = foundationDone.current ? null : await commitFoundation()
      commitFoundationCache.current = idByName
      advance(list.join(', '), `A rota builds when your shifts cover your opening hours, and your staff cover those shifts.\n\nSo first: on a normal day, what's the fewest people you need on to keep ${list.length > 1 ? 'each area' : list[0]} running? That's your baseline.`, 'coverage')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const onCoverage = async () => {
    setBusy(true); setError(null)
    try {
      await commitShifts(commitFoundationCache.current)
      const req = Math.round(teams.reduce((a, t) => a + (cfg.close - cfg.open) * t.min * cfg.openDays.length, 0))
      setReqHours(req)
      advance(teams.map((t) => `${t.name}: ${t.min}`).join('  ·  '), `That's your shifts sorted, take a look on the left.\n\nTo cover them you'll need roughly ${req} staff-hours a week. Add your team now, just a name and their weekly hours, and I'll track how close you are.`, 'staff')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const onDone = () => { say({ from: 'user', text: `${staffCount} added` }); setMode('ask'); setOpen(false); router.push('/dashboard/generate?setup=1') }

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, '1'); setHidden(true) }

  if (!ready || hidden) return null
  if (!open) return <Bubble T={T} label={mode === 'ask' ? 'Help' : 'Finish setup'} onOpen={() => setOpen(true)} />
  if (mode === 'ask') return <AskChat T={T} isAiTier={isAiTier} onMinimise={() => setOpen(false)} />

  return (
    <Drawer T={T}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderBottom: `1px solid ${T.hair}` }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: T.pink, color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Setup assistant</div>
          <div style={{ fontSize: 11.5, color: T.faint }}>Answer here, watch it build</div>
        </div>
        <ProgressDots T={T} step={step} />
        <button onClick={() => setOpen(false)} title="Minimise" style={iconBtn(T)}><span style={{ display: 'block', width: 12, height: 2, borderRadius: 2, background: T.faint }} /></button>
        <button onClick={dismiss} title="Dismiss setup" style={iconBtn(T)}><Icon path="M6 6l12 12M6 18L18 6" size={13} stroke={2} color={T.faint} /></button>
      </div>

      {/* transcript */}
      <Transcript T={T} msgs={msgs} />

      {/* composer */}
      <div style={{ borderTop: `1px solid ${T.hair}`, padding: 13, background: T.subtle }}>
        {error && <div style={{ fontSize: 12.5, color: T.red, fontWeight: 600, marginBottom: 9 }}>{error}</div>}
        {step === 'name' && <NameComposer T={T} onSubmit={onName} />}
        {step === 'hours' && <HoursStep T={T} hours={hours} setHours={setHours} busy={busy} onNext={onHours} />}
        {step === 'team' && <TeamComposer T={T} teams={teams} setTeams={setTeams} busy={busy} onSubmit={onTeams} />}
        {step === 'coverage' && <CoverageComposer T={T} teams={teams} setTeams={setTeams} busy={busy} onSubmit={onCoverage} />}
        {step === 'staff' && <StaffComposer T={T} teams={teams} count={staffCount} req={reqHours} added={staffHours} onAdd={addStaff} say={say} onDone={onDone} />}
      </div>
    </Drawer>
  )
}

// ── the fixed drawer shell (shared by setup + ask) ────────────────────────────
function Drawer({ T, children }) {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, bottom: 16, width: 384, maxWidth: 'calc(100vw - 24px)', zIndex: 60, display: 'flex', flexDirection: 'column', fontFamily: T.font, background: T.cardSolid, border: `1px solid ${T.line}`, borderRadius: 20, overflow: 'hidden', boxShadow: T.shadow.lg }}>{children}</div>
  )
}

// ── ask mode: Q&A for manual, agentic for the AI tier ─────────────────────────
function AskChat({ T, isAiTier, onMinimise }) {
  const router = useRouter()
  const agent = !!isAiTier
  const [msgs, setMsgs] = useState([{ from: 'bot', text: agent
    ? "Hi! Tell me what you need and I'll do it. Set your cover, add staff, or build next week's rota for you to review and publish."
    : "Hi! Ask me anything about Shiftly, opening hours, shifts, staff, or building and publishing a rota." }])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDraft, setConfirmDraft] = useState(null)
  const [publishedIds, setPublishedIds] = useState(() => new Set())
  const scrollRef = useRef(null)
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, busy])

  const send = async () => {
    const text = q.trim(); if (!text || busy) return
    setMsgs((m) => [...m, { from: 'user', text }]); setQ(''); setBusy(true)
    try {
      const history = msgs.filter((m) => m.text).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))
      const res = await fetch(agent ? '/api/assistant/agent' : '/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent ? { message: text, history } : { question: text, history }),
      })
      if (res.status === 403) { const d = await res.json().catch(() => ({})); setMsgs((m) => [...m, { from: 'bot', text: d.error || "That's on the AI plan.", upgrade: true }]); return }
      const data = res.ok ? await res.json() : {}
      setMsgs((m) => [...m, { from: 'bot', text: data.reply || "Sorry, I couldn't do that. Try support@shiftly.so.", actions: data.actions, draftId: data.draftId }])
    } catch { setMsgs((m) => [...m, { from: 'bot', text: 'Something went wrong. Give it another go in a moment.' }]) }
    finally { setBusy(false) }
  }

  const publish = async (draftId) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/rotas/${draftId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Published' }) })
      if (res.ok) { setPublishedIds((s) => new Set(s).add(draftId)); setMsgs((m) => [...m, { from: 'bot', text: 'Published. Your team can see it in their app now.' }]) }
      else setMsgs((m) => [...m, { from: 'bot', text: "I couldn't publish that. Open the rota builder to publish it there." }])
    } catch { setMsgs((m) => [...m, { from: 'bot', text: 'Publish failed. Try again in a moment.' }]) }
    finally { setBusy(false); setConfirmDraft(null) }
  }

  return (
    <Drawer T={T}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderBottom: `1px solid ${T.hair}` }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: T.pink, color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{agent ? 'Shiftly assistant' : 'Ask Shiftly'}</div>
          <div style={{ fontSize: 11.5, color: T.faint }}>{agent ? 'Builds and fixes your rota' : 'How-to help, any time'}</div>
        </div>
        <button onClick={onMinimise} title="Minimise" style={iconBtn(T)}><span style={{ display: 'block', width: 12, height: 2, borderRadius: 2, background: T.faint }} /></button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 15, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {msgs.map((m, i) => {
          const bot = m.from === 'bot'
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: bot ? 'flex-start' : 'flex-end', gap: 6 }}>
              <div style={{ maxWidth: '88%', whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.5, padding: '10px 13px', borderRadius: 14, ...(bot ? { background: T.subtle, color: T.body, borderBottomLeftRadius: 4 } : { background: T.pink, color: '#fff', borderBottomRightRadius: 4, fontWeight: 600 }) }}>{m.text}</div>
              {bot && Array.isArray(m.actions) && m.actions.length > 0 && (
                <div style={{ maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 2 }}>
                  {m.actions.map((a, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted }}>
                      <Icon path={Ic.check} size={12} stroke={2.6} color={T.green} />{a}
                    </div>
                  ))}
                </div>
              )}
              {bot && m.upgrade && <Button size="sm" onClick={() => router.push('/checkout')}>See the AI plan</Button>}
              {bot && m.draftId && !publishedIds.has(m.draftId) && (
                confirmDraft === m.draftId ? (
                  <div style={{ maxWidth: '88%', background: T.cardSolid, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12.5, color: T.body, lineHeight: 1.45, marginBottom: 9 }}>Publish to your team? They'll see it on their phones straight away.</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Button size="sm" disabled={busy} onClick={() => publish(m.draftId)}>Publish</Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirmDraft(null)}>Not yet</Button>
                      <button onClick={() => router.push('/dashboard/generate')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.faint, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>Review in builder</button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" arrow onClick={() => setConfirmDraft(m.draftId)}>Review and publish</Button>
                )
              )}
            </div>
          )
        })}
        {busy && <div style={{ alignSelf: 'flex-start', fontSize: 12.5, color: T.faint, padding: '6px 4px' }}>{agent ? 'Working on it...' : 'Thinking...'}</div>}
      </div>

      <div style={{ borderTop: `1px solid ${T.hair}`, padding: 13, background: T.subtle }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={agent ? 'Tell me what to do' : 'Ask a question'} style={fieldStyle(T)} />
          <Button icon={Ic.arrow} disabled={!q.trim() || busy} onClick={send} />
        </div>
        {!agent && (
          <div style={{ fontSize: 11, color: T.faint, marginTop: 8, textAlign: 'center' }}>
            Want me to do it for you? <span onClick={() => router.push('/checkout')} style={{ color: T.pink, fontWeight: 700, cursor: 'pointer' }}>Get the AI plan</span>
          </div>
        )}
      </div>
    </Drawer>
  )
}

// ── bubble launcher ────────────────────────────────────────────────────────────
function Bubble({ T, label, onOpen }) {
  return (
    <button onClick={onOpen} title={label} style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 60, width: 54, height: 54, borderRadius: 999, border: 'none', cursor: 'pointer', background: T.pink, color: '#fff', fontWeight: 800, fontSize: 20, boxShadow: T.shadow.lg, fontFamily: T.font }}>S</button>
  )
}
const iconBtn = (T) => ({ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' })

function ProgressDots({ T, step }) {
  const idx = STEPS.indexOf(step)
  return <div style={{ display: 'flex', gap: 4 }}>{STEPS.slice(0, 5).map((s, i) => <span key={s} style={{ width: 6, height: 6, borderRadius: 99, background: i < idx ? T.green : i === idx ? T.pink : T.track }} />)}</div>
}

function Transcript({ T, msgs }) {
  const ref = useRef(null)
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 15, display: 'flex', flexDirection: 'column', gap: 9 }}>
      {msgs.map((m, i) => {
        const bot = m.from === 'bot'
        return (
          <div key={i} style={{ display: 'flex', justifyContent: bot ? 'flex-start' : 'flex-end' }}>
            <div style={{ maxWidth: '88%', whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.5, padding: '10px 13px', borderRadius: 14, ...(bot ? { background: T.subtle, color: T.body, borderBottomLeftRadius: 4 } : { background: T.pink, color: '#fff', borderBottomRightRadius: 4, fontWeight: 600 }) }}>{m.text}</div>
          </div>
        )
      })}
    </div>
  )
}

const fieldStyle = (T) => ({ flex: 1, minWidth: 0, boxSizing: 'border-box', fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 11, padding: '11px 13px', outline: 'none' })

function NameComposer({ T, onSubmit }) {
  const [v, setV] = useState('')
  const go = () => { const x = v.trim(); if (x) onSubmit(x) }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="The Old Ship" style={fieldStyle(T)} />
      <Button icon={Ic.arrow} disabled={!v.trim()} onClick={go} />
    </div>
  )
}

function HoursStep({ T, hours, setHours, busy, onNext }) {
  const [copyOpen, setCopyOpen] = useState(null)
  const setDay = (i, patch) => setHours((h) => ({ ...h, [i]: { ...h[i], ...patch } }))
  const copyTo = (from, targets) => { const src = hours[from].opening; setHours((h) => { const n = { ...h }; targets.forEach((t) => { if (t !== from) n[t] = { open: true, opening: [...src] } }); return n }); setCopyOpen(null) }
  const anyOpen = ALL.some((d) => hours[d]?.open)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${T.hair}`, borderRadius: 12, padding: '2px 12px', background: T.cardSolid }}>
        {DAYS.map((dn, i) => {
          const d = hours[i] || { open: false }
          return (
            <div key={i} style={{ padding: '11px 0', borderTop: i ? `1px solid ${T.hair}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 74, fontSize: 13, fontWeight: 700, color: d.open ? T.ink : T.faint }}>{dn}</span>
                <Switch on={d.open} onChange={(v) => setDay(i, { open: v })} accent={T.pink} size={0.9} />
                {d.open && (
                  <div style={{ position: 'relative', marginLeft: 'auto' }}>
                    <button onClick={() => setCopyOpen(copyOpen === i ? null : i)} style={{ fontFamily: T.font, fontSize: 11.5, fontWeight: 700, color: T.pink, background: T.pink + '12', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>Copy to</button>
                    {copyOpen === i && (<>
                      <div onClick={() => setCopyOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 71, background: T.cardSolid, border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: T.shadow.lg, padding: 6, width: 160 }}>
                        {[['All weekdays', WEEKDAYS], ['Weekend', WEEKEND], ['Every day', ALL]].map(([label, tgt]) => (
                          <button key={label} onClick={() => copyTo(i, tgt)} style={{ width: '100%', textAlign: 'left', fontFamily: T.font, fontSize: 12.5, fontWeight: 600, color: T.body, background: 'none', border: 'none', borderRadius: 8, padding: '8px 9px', cursor: 'pointer' }}>{label}</button>
                        ))}
                      </div>
                    </>)}
                  </div>
                )}
                {!d.open && <span style={{ marginLeft: 'auto', fontSize: 12, color: T.faint }}>Closed</span>}
              </div>
              {d.open && <div style={{ marginTop: 12 }}><TimeRange start={d.opening[0]} end={d.opening[1]} onChange={(a, b) => setDay(i, { opening: [a, b] })} domain={[4, 24]} accent={T.pink} /></div>}
            </div>
          )
        })}
      </div>
      <Button full arrow disabled={!anyOpen || busy} onClick={onNext}>{busy ? 'Saving...' : 'Hours look right'}</Button>
    </div>
  )
}

function TeamComposer({ T, teams, setTeams, busy, onSubmit }) {
  const [val, setVal] = useState('')
  const add = () => { const v = val.trim(); if (!v) return; setTeams((p) => [...p, { id: null, name: v, color: PALETTE[p.length % PALETTE.length], min: 2 }]); setVal('') }
  const remove = (name) => setTeams((p) => (p.length > 1 ? p.filter((t) => t.name !== name) : p))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {teams.map((t) => (
          <span key={t.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 8px 6px 11px', borderRadius: 999, background: T.cardSolid, border: `1px solid ${T.line}`, fontSize: 12.5, fontWeight: 700, color: T.ink }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />{t.name}
            {teams.length > 1 && <button onClick={() => remove(t.name)} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add another team" style={fieldStyle(T)} />
        <Button variant="secondary" icon={Ic.plus} onClick={add} />
      </div>
      <Button full arrow disabled={busy} onClick={() => onSubmit(teams.map((t) => t.name))}>{busy ? 'Saving...' : "That's my teams"}</Button>
    </div>
  )
}

function CoverageComposer({ T, teams, setTeams, busy, onSubmit }) {
  const setMin = (name, d) => setTeams((p) => p.map((t) => (t.name === name ? { ...t, min: Math.max(1, t.min + d) } : t)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {teams.map((t) => (
        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: T.cardSolid, border: `1px solid ${T.line}` }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color }} />
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{t.name}</span>
          <button onClick={() => setMin(t.name, -1)} style={stepBtn(T)}>–</button>
          <span style={{ width: 22, textAlign: 'center', fontSize: 15, fontWeight: 800, color: T.ink }}>{t.min}</span>
          <button onClick={() => setMin(t.name, 1)} style={stepBtn(T)}>+</button>
        </div>
      ))}
      <Button full arrow disabled={busy} onClick={onSubmit}>{busy ? 'Saving...' : "That's my baseline"}</Button>
    </div>
  )
}
const stepBtn = (T) => ({ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.body, fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, lineHeight: 1 })

function HoursMeter({ T, req, added }) {
  const pct = Math.min(100, Math.round((added / req) * 100))
  const enough = added >= req
  const shortH = Math.max(0, Math.round(req - added))
  const morePeople = Math.max(1, Math.ceil(shortH / 32)) // ~32h as a sensible default contract
  return (
    <div style={{ background: T.cardSolid, border: `1px solid ${T.line}`, borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 7 }}>
        <span style={{ color: T.ink }}>{Math.round(added)} of ~{req} staff-hours</span>
        <span style={{ color: enough ? T.green : T.pink }}>{enough ? 'Enough to cover' : `~${shortH}h short`}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: T.track, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: enough ? T.green : T.pink, borderRadius: 99, transition: 'width .25s' }} />
      </div>
      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 7, lineHeight: 1.45 }}>
        {enough ? "You've got enough hours to cover your week. Add more anytime." : `Add about ${morePeople} more ${morePeople === 1 ? 'person' : 'people'}, or lower a team's minimum. You can still build now and tweak on the rota.`}
      </div>
    </div>
  )
}

function StaffComposer({ T, teams, count, req, added, onAdd, say, onDone }) {
  const [nm, setNm] = useState('')
  const [hrs, setHrs] = useState('')
  const [team, setTeam] = useState(teams[0]?.id || teams[0]?.name)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const add = async () => {
    const v = nm.trim(); if (!v || busy) return
    const teamId = teams.find((t) => (t.id || t.name) === team)?.id
    if (!teamId) { setErr('That team is not ready yet. Refresh and try again.'); return }
    const contracted = parseInt(hrs, 10) || 0
    setBusy(true); setErr(null)
    try {
      await onAdd({ name: v, hours: contracted, teamId })
      say({ from: 'user', text: `${v}${contracted ? `, ${contracted}h` : ''}` })
      setNm(''); setHrs('')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {req > 0 && <HoursMeter T={T} req={req} added={added || 0} />}
      {err && <div style={{ fontSize: 12.5, color: T.red, fontWeight: 600 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input autoFocus value={nm} onChange={(e) => setNm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Name" style={{ ...fieldStyle(T), flex: 2 }} />
        <input value={hrs} onChange={(e) => setHrs(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Hrs" inputMode="numeric" style={{ ...fieldStyle(T), flex: 1, width: 52 }} />
        <Button icon={Ic.plus} disabled={!nm.trim() || busy} onClick={add} />
      </div>
      {teams.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {teams.map((t) => {
            const key = t.id || t.name
            return (
              <button key={key} onClick={() => setTeam(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: T.font, fontSize: 12, fontWeight: 700, border: `1px solid ${team === key ? t.color : T.line}`, background: team === key ? t.color + '14' : T.cardSolid, color: team === key ? T.ink : T.muted }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: t.color }} />{t.name}
              </button>
            )
          })}
        </div>
      )}
      <Button full arrow variant={count ? 'primary' : 'secondary'} disabled={!count} onClick={onDone}>{count ? `Build my rota (${count} added)` : 'Add someone to continue'}</Button>
    </div>
  )
}
