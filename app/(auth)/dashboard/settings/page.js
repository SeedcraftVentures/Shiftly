'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Input, Field, Label, Switch, Segmented, Tag, TimeRange, useTheme } from '@/app/components/ui/kit'
import { TEAM_COLORS } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'

const WEEKDAYS = [0, 1, 2, 3, 4], WEEKEND = [5, 6], ALLDAYS = [0, 1, 2, 3, 4, 5, 6]

// Appearance control, the home of the app-wide light/dark switch.
function ThemeChoice() {
  const { T, theme, setTheme } = useTheme()
  const opt = (m, label, icon) => {
    const on = theme === m
    return (
      <button key={m} onClick={() => setTheme(m)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.font, fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em', padding: '9px 16px', borderRadius: T.r.pill, border: 'none', cursor: 'pointer', color: on ? T.ink : T.muted, background: on ? T.card : 'transparent', boxShadow: on ? T.shadow.sm : 'none', transition: 'all .2s' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>{label}
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Theme</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>Choose a light or dark interface. Applies across the whole app.</div>
      </div>
      <div style={{ display: 'inline-flex', padding: 3, borderRadius: T.r.pill, background: T.segBg, flexShrink: 0 }}>
        {opt('light', 'Light', <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>)}
        {opt('dark', 'Dark', <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />)}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  SETTINGS (live), configure the things onboarding set: organisation, the active
//  location, and its opening AND operating hours (two different windows), plus
//  organisation-wide location management.
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const CURRENCIES = [{ value: 'GBP', label: '£ GBP' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }]
const LOCATION_TYPES = ['Restaurant', 'Café', 'Bar', 'Takeaway', 'Hotel', 'Retail', 'Other']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DEFAULT_HOL = { basis: 'calendar', startMonth: 1, weeks: 5.6, sickPaidDays: null }
const holStart = (h) => (h.basis === 'calendar' ? 1 : h.basis === 'financial' ? 4 : (h.startMonth || 1))
const holYearLabel = (h) => { const s = holStart(h); return `${MONTHS[s - 1]} to ${MONTHS[(s + 10) % 12]}` }
const selectStyle = (T) => ({ width: '100%', boxSizing: 'border-box', fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r.md, padding: '11px 13px', outline: 'none', cursor: 'pointer' })

function Section({ title, desc, children, onSave, saving, saved, flush }) {
  const { T } = useTheme()
  return (
    <Card pad={24} style={{ marginBottom: flush ? 0 : 18, height: flush ? '100%' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: T.ink, margin: 0 }}>{title}</h2>
          {desc && <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0', maxWidth: 520 }}>{desc}</p>}
        </div>
        {onSave && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {saved && <span style={{ fontSize: 12, fontWeight: 600, color: T.green }}>✓ Saved</span>}
            <Button accent={T.pink} size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        )}
      </div>
      {children}
    </Card>
  )
}

function TeamRow({ team, color, counts, top, onRename, onDelete }) {
  const { T } = useTheme()
  const [name, setName] = useState(team.name)
  const [busy, setBusy] = useState(false)
  const c = counts || { staff: 0, shifts: 0 }
  const dirty = name.trim() && name.trim() !== team.name
  const doSave = async () => { if (!dirty) return; setBusy(true); await onRename(team.id, name.trim()); setBusy(false) }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: top ? `1px solid ${T.hair}` : 'none' }}>
      <span style={{ width: 10, height: 10, borderRadius: 99, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}><Input value={name} onChange={(e) => setName(e.target.value)} onBlur={doSave} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} /></div>
      <span style={{ fontSize: 12, color: T.faint, whiteSpace: 'nowrap' }}>{c.staff} staff · {c.shifts} shift{c.shifts === 1 ? '' : 's'}</span>
      {dirty && <Button size="sm" accent={T.pink} onClick={doSave} disabled={busy}>Save</Button>}
      <button onClick={() => onDelete(team)} title="Delete team" style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: T.r.sm, border: `1px solid ${T.line}`, background: T.card, color: T.red, cursor: 'pointer' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { T } = useTheme()
  const [loading, setLoading] = useState(true)
  const [s, setS] = useState(null) // { organization, location, hours }
  const [locations, setLocations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState('')
  const [saved, setSaved] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(null) // which day's "copy to" menu is open
  const [teams, setTeams] = useState([])
  const [teamCounts, setTeamCounts] = useState({}) // teamId -> { staff, shifts }
  const [newTeam, setNewTeam] = useState('')
  const [teamBusy, setTeamBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/locations').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/teams').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/staff').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/shifts').then((r) => (r.ok ? r.json() : null)),
    ]).then(([settings, locs, tms, staff, shifts]) => {
      if (settings) setS(settings)
      if (locs) { setLocations(locs.locations || []); setActiveId(locs.active) }
      if (tms) setTeams(tms)
      const counts = {}
      ;(tms || []).forEach((t) => { counts[t.id] = { staff: 0, shifts: 0 } })
      ;(staff || []).forEach((s) => { if (counts[s.team_id]) counts[s.team_id].staff++ })
      ;(shifts || []).forEach((sh) => { const tid = sh.team_id || sh.shift_team; if (counts[tid]) counts[tid].shifts++ })
      setTeamCounts(counts)
      setLoading(false)
    })
  }, [])

  // ── teams ──
  const addTeam = async () => {
    const name = newTeam.trim()
    if (!name) return
    setTeamBusy(true)
    try {
      const res = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      if (res.ok) { const t = await res.json(); setTeams((p) => [...p, t]); setTeamCounts((c) => ({ ...c, [t.id]: { staff: 0, shifts: 0 } })); setNewTeam('') }
    } finally { setTeamBusy(false) }
  }
  const renameTeam = async (id, name) => {
    const res = await fetch('/api/teams', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name }) })
    if (res.ok) setTeams((p) => p.map((t) => (t.id === id ? { ...t, name } : t)))
    return res.ok
  }
  const deleteTeam = async (team) => {
    const c = teamCounts[team.id] || { staff: 0, shifts: 0 }
    const extra = (c.staff || c.shifts) ? `\n\nThis also removes its ${c.staff} staff and ${c.shifts} shift${c.shifts === 1 ? '' : 's'} (and their rota assignments).` : ''
    if (!window.confirm(`Delete the "${team.name}" team?${extra}\n\nThis can't be undone.`)) return
    const res = await fetch(`/api/teams?id=${encodeURIComponent(team.id)}`, { method: 'DELETE' })
    if (res.ok) { setTeams((p) => p.filter((t) => t.id !== team.id)); setTeamCounts((c2) => { const n = { ...c2 }; delete n[team.id]; return n }) }
  }

  const copyHours = (from, targets) => {
    setS((p) => {
      const src = p.hours[from]
      const h = { ...p.hours }
      targets.forEach((t) => { if (t !== from) h[t] = { open: true, opening: [...src.opening], operating: [...src.operating] } })
      return { ...p, hours: h }
    })
    setCopyOpen(null)
  }

  const save = async (section, payload) => {
    setSaving(section); setSaved('')
    try {
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        setSaved(section); setTimeout(() => setSaved(''), 2500)
        // org/location names live in the persistent nav too, tell it to re-fetch
        if (payload.organization || payload.location) window.dispatchEvent(new Event('shiftly:locations-updated'))
      }
    } finally { setSaving('') }
  }

  const setOrg = (patch) => setS((p) => ({ ...p, organization: { ...p.organization, ...patch } }))
  const setLoc = (patch) => setS((p) => ({ ...p, location: { ...p.location, ...patch } }))
  const setDay = (i, patch) => setS((p) => ({ ...p, hours: { ...p.hours, [i]: { ...p.hours[i], ...patch } } }))
  const setHol = (patch) => setS((p) => ({ ...p, location: { ...p.location, holidays: { ...(p.location.holidays || DEFAULT_HOL), ...patch } } }))

  if (loading || !s) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font }}>
      <div style={{ width: 38, height: 38, border: `4px solid ${T.track}`, borderTopColor: T.pink, borderRadius: 99, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  }

  const loc = s.location
  const hol = loc?.holidays || DEFAULT_HOL
  return (
    <div style={{ fontFamily: T.font, maxWidth: 880, margin: '0 auto', padding: '20px 28px 56px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, margin: '0 0 4px', letterSpacing: -0.3 }}>Settings</h1>
      <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 24px' }}>Configure your organisation and {loc?.name || 'this location'}.</p>

      {/* ── Appearance ── */}
      <Section title="Appearance" desc="How Shiftly looks on this device.">
        <ThemeChoice />
      </Section>

      {/* ── Organisation + This location (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 }}>
        <Section flush title="Organisation" desc="Your business, the umbrella over every location." onSave={() => save('org', { organization: s.organization })} saving={saving === 'org'} saved={saved === 'org'}>
          <Field label="Organisation name"><Input value={s.organization.name} onChange={(e) => setOrg({ name: e.target.value })} /></Field>
          <Field label="Industry" style={{ marginTop: 14 }}><Input value={s.organization.industry} onChange={(e) => setOrg({ industry: e.target.value })} placeholder="e.g. Hospitality" /></Field>
          <Field label="Default currency" style={{ marginTop: 14 }}><Segmented options={CURRENCIES} value={s.organization.currency} onChange={(v) => setOrg({ currency: v })} accent={T.pink} /></Field>
        </Section>
        {loc && (
          <Section flush title="This location" desc="Details for the location you're currently working in." onSave={() => save('loc', { location: { name: loc.name, address: loc.address, currency: loc.currency } })} saving={saving === 'loc'} saved={saved === 'loc'}>
            <Field label="Location name"><Input value={loc.name} onChange={(e) => setLoc({ name: e.target.value })} /></Field>
            <Field label="Address" style={{ marginTop: 14 }}><Input value={loc.address} onChange={(e) => setLoc({ address: e.target.value })} placeholder="Street, city, postcode" /></Field>
            <Field label="Currency" style={{ marginTop: 14 }}><Segmented options={CURRENCIES} value={loc.currency} onChange={(v) => setLoc({ currency: v })} accent={T.pink} /></Field>
          </Section>
        )}
      </div>

      {/* ── Holidays ── */}
      {loc && (
        <Section title="Holidays &amp; sick" desc="Everyone gets the same holiday allowance, prorated by their contracted hours. Override per person on the Staff page. Taken and remaining show in Reports." onSave={() => save('holidays', { location: { holidays: s.location.holidays || DEFAULT_HOL } })} saving={saving === 'holidays'} saved={saved === 'holidays'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <Field label="Holiday year">
                <Segmented accent={T.pink} value={hol.basis} onChange={(v) => setHol({ basis: v, startMonth: v === 'calendar' ? 1 : v === 'financial' ? 4 : (hol.startMonth || 1) })} options={[{ value: 'calendar', label: 'Calendar' }, { value: 'financial', label: 'Financial' }, { value: 'custom', label: 'Custom' }]} />
              </Field>
              {hol.basis === 'custom' && (
                <Field label="Starts in" style={{ marginTop: 14 }}>
                  <select value={hol.startMonth} onChange={(e) => setHol({ startMonth: Number(e.target.value) })} style={selectStyle(T)}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
              )}
              <p style={{ fontSize: 12.5, color: T.muted, margin: '10px 0 0' }}>Runs {holYearLabel(hol)}.</p>
            </div>
            <div>
              <Field label="Entitlement (weeks)">
                <Input type="number" step="0.1" min="0" value={hol.weeks} onChange={(e) => setHol({ weeks: e.target.value === '' ? '' : Number(e.target.value) })} />
              </Field>
              <p style={{ fontSize: 12.5, color: T.muted, margin: '6px 0 0' }}>UK statutory is 5.6 weeks (28 days for a 5-day week).</p>
              <Field label="Paid sick days a year (optional)" style={{ marginTop: 16 }}>
                <Input type="number" step="1" min="0" value={hol.sickPaidDays ?? ''} onChange={(e) => setHol({ sickPaidDays: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Blank = just track" />
              </Field>
            </div>
          </div>
        </Section>
      )}

      {/* ── Teams (above hours) ── */}
      {loc && (
        <Section title="Teams" desc={`Teams within ${loc?.name || 'this location'}, e.g. kitchen, bar, front of house. Staff and shifts are organised by team.`}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {teams.length === 0 && <p style={{ fontSize: 13, color: T.faint, margin: '0 0 4px' }}>No teams yet, add your first below.</p>}
            {teams.map((t, i) => <TeamRow key={t.id} team={t} color={TEAM_COLORS[i % TEAM_COLORS.length]} counts={teamCounts[t.id]} top={i > 0} onRename={renameTeam} onDelete={deleteTeam} />)}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1 }}><Input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="New team name (e.g. Kitchen)" onKeyDown={(e) => { if (e.key === 'Enter') addTeam() }} /></div>
            <Button accent={T.pink} onClick={addTeam} disabled={teamBusy || !newTeam.trim()}>Add team</Button>
          </div>
        </Section>
      )}

      {/* ── Hours: opening vs operating ── */}
      {loc && (
        <Section title="Opening & operating hours" onSave={() => save('hours', { hours: s.hours })} saving={saving === 'hours'} saved={saved === 'hours'}
          desc="Two different windows. Opening hours are when customers can visit. Operating hours are when staff are on site, prep, deliveries, close-down, usually a little wider.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DAYS.map((dn, i) => {
              const d = s.hours[i] || { open: false }
              return (
                <div key={i} style={{ padding: '14px 0', borderTop: i ? `1px solid ${T.hair}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 96, fontSize: 14, fontWeight: 700, color: d.open ? T.ink : T.faint }}>{dn}</span>
                    <Switch on={d.open} onChange={(v) => setDay(i, { open: v })} accent={T.pink} />
                    <span style={{ fontSize: 12.5, color: T.faint }}>{d.open ? 'Open' : 'Closed'}</span>
                    {d.open && (
                      <div style={{ position: 'relative', marginLeft: 'auto' }}>
                        <button onClick={() => setCopyOpen(copyOpen === i ? null : i)} style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.pink, background: T.pink + '12', border: 'none', borderRadius: T.r.xs, padding: '6px 11px', cursor: 'pointer' }}>Copy to ▾</button>
                        {copyOpen === i && (<>
                          <div onClick={() => setCopyOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 31, background: T.card, border: `1px solid ${T.line}`, borderRadius: T.r.md, boxShadow: T.shadow.lg, padding: 6, width: 170 }}>
                            {[['All weekdays', WEEKDAYS], ['Weekend', WEEKEND], ['Every day', ALLDAYS]].map(([lbl, tgt]) => (
                              <button key={lbl} onClick={() => copyHours(i, tgt)} onMouseEnter={(e) => (e.currentTarget.style.background = T.surface)} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} style={{ width: '100%', textAlign: 'left', fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.body, background: 'none', border: 'none', borderRadius: T.r.sm, padding: '9px 10px', cursor: 'pointer', transition: 'background .1s' }}>{lbl}</button>
                            ))}
                          </div>
                        </>)}
                      </div>
                    )}
                  </div>
                  {d.open && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 14, paddingLeft: 4 }}>
                      <div>
                        <Label style={{ marginBottom: 10 }}>Open to customers</Label>
                        <TimeRange start={d.opening[0]} end={d.opening[1]} onChange={(a, b) => setDay(i, { opening: [a, b] })} domain={[4, 24]} accent={T.pink} />
                      </div>
                      <div>
                        <Label style={{ marginBottom: 10 }}>Staff on site</Label>
                        <TimeRange start={d.operating[0]} end={d.operating[1]} onChange={(a, b) => setDay(i, { operating: [a, b] })} domain={[4, 24]} accent="#6366F1" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Locations (org management) ── */}
      <Section title="Locations" desc="Every venue under your organisation. Billing is per location.">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {locations.map((l, i) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? `1px solid ${T.hair}` : 'none' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: T.pink + '14', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: 0 }}>{l.name}</p>
                {l.address && <p style={{ fontSize: 12.5, color: T.muted, margin: '2px 0 0' }}>{l.address}</p>}
              </div>
              {l.id === activeId && <Tag color={T.green}>Current</Tag>}
            </div>
          ))}
        </div>

        {addOpen ? (
          <div style={{ marginTop: 16, padding: 16, borderRadius: T.r.md, background: T.surface, border: `1px solid ${T.line}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <Field label="Location name"><Input placeholder="e.g. Camden branch" /></Field>
              <Field label="Type">
                <select style={{ width: '100%', boxSizing: 'border-box', fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, padding: '11px 13px', borderRadius: T.r.sm, border: `1px solid ${T.border}`, outline: 'none', background: T.card }}>
                  {LOCATION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Address" style={{ marginTop: 14 }}><Input placeholder="Street, city, postcode" /></Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <Button accent={T.pink} disabled>Add location</Button>
              <Button variant="ghost" size="md" onClick={() => setAddOpen(false)}>Cancel</Button>
              <span style={{ fontSize: 12, color: T.muted }}>Adding a location starts a new per-location subscription, wired up with billing.</span>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <Button variant="secondary" icon="＋" onClick={() => setAddOpen(true)}>Add location</Button>
          </div>
        )}
      </Section>
    </div>
  )
}
