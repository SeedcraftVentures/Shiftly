'use client'

import { useState, useEffect } from 'react'
import { T, Card, Button, Input, Field, Label, Switch, Segmented, Tag, TimeRange } from '@/app/components/ui/kit'
import { TEAM_COLORS } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'

const WEEKDAYS = [0, 1, 2, 3, 4], WEEKEND = [5, 6], ALLDAYS = [0, 1, 2, 3, 4, 5, 6]

// ════════════════════════════════════════════════════════════════════════════
//  SETTINGS (live) — configure the things onboarding set: organisation, the active
//  location, and its opening AND operating hours (two different windows), plus
//  organisation-wide location management.
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const CURRENCIES = [{ value: 'GBP', label: '£ GBP' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }]
const LOCATION_TYPES = ['Restaurant', 'Café', 'Bar', 'Takeaway', 'Hotel', 'Retail', 'Other']

function Section({ title, desc, children, onSave, saving, saved }) {
  return (
    <Card pad={24} style={{ marginBottom: 18 }}>
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
      <button onClick={() => onDelete(team)} title="Delete team" style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: T.r.sm, border: `1px solid ${T.line}`, background: '#fff', color: T.red, cursor: 'pointer' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  )
}

export default function SettingsPage() {
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
        // org/location names live in the persistent nav too — tell it to re-fetch
        if (payload.organization || payload.location) window.dispatchEvent(new Event('shiftly:locations-updated'))
      }
    } finally { setSaving('') }
  }

  const setOrg = (patch) => setS((p) => ({ ...p, organization: { ...p.organization, ...patch } }))
  const setLoc = (patch) => setS((p) => ({ ...p, location: { ...p.location, ...patch } }))
  const setDay = (i, patch) => setS((p) => ({ ...p, hours: { ...p.hours, [i]: { ...p.hours[i], ...patch } } }))

  if (loading || !s) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font }}>
      <div style={{ width: 38, height: 38, border: '4px solid #EEE', borderTopColor: T.pink, borderRadius: 99, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  }

  const loc = s.location
  return (
    <div style={{ fontFamily: T.font, maxWidth: 760, margin: '0 auto', padding: '28px 28px 56px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, margin: '0 0 4px', letterSpacing: -0.3 }}>Settings</h1>
      <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 24px' }}>Configure your organisation and {loc?.name || 'this location'}.</p>

      {/* ── Organisation ── */}
      <Section title="Organisation" desc="Your business — the umbrella over every location." onSave={() => save('org', { organization: s.organization })} saving={saving === 'org'} saved={saved === 'org'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <Field label="Organisation name"><Input value={s.organization.name} onChange={(e) => setOrg({ name: e.target.value })} /></Field>
          <Field label="Industry"><Input value={s.organization.industry} onChange={(e) => setOrg({ industry: e.target.value })} placeholder="e.g. Hospitality" /></Field>
        </div>
        <Field label="Default currency" style={{ marginTop: 16 }}><Segmented options={CURRENCIES} value={s.organization.currency} onChange={(v) => setOrg({ currency: v })} accent={T.pink} /></Field>
      </Section>

      {/* ── Location details ── */}
      {loc && (
        <Section title="This location" desc="Details for the location you're currently working in." onSave={() => save('loc', { location: { name: loc.name, address: loc.address, currency: loc.currency } })} saving={saving === 'loc'} saved={saved === 'loc'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Field label="Location name"><Input value={loc.name} onChange={(e) => setLoc({ name: e.target.value })} /></Field>
            <Field label="Currency"><Segmented options={CURRENCIES} value={loc.currency} onChange={(v) => setLoc({ currency: v })} accent={T.pink} /></Field>
          </div>
          <Field label="Address" style={{ marginTop: 16 }}><Input value={loc.address} onChange={(e) => setLoc({ address: e.target.value })} placeholder="Street, city, postcode" /></Field>
        </Section>
      )}

      {/* ── Hours: opening vs operating ── */}
      {loc && (
        <Section title="Opening & operating hours" onSave={() => save('hours', { hours: s.hours })} saving={saving === 'hours'} saved={saved === 'hours'}
          desc="Two different windows. Opening hours are when customers can visit. Operating hours are when staff are on site — prep, deliveries, close-down — usually a little wider.">
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
                          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 31, background: '#fff', border: `1px solid ${T.line}`, borderRadius: T.r.md, boxShadow: T.shadow.lg, padding: 6, width: 170 }}>
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

      {/* ── Teams ── */}
      {loc && (
        <Section title="Teams" desc={`Teams within ${loc?.name || 'this location'} — e.g. kitchen, bar, front of house. Staff and shifts are organised by team.`}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {teams.length === 0 && <p style={{ fontSize: 13, color: T.faint, margin: '0 0 4px' }}>No teams yet — add your first below.</p>}
            {teams.map((t, i) => <TeamRow key={t.id} team={t} color={TEAM_COLORS[i % TEAM_COLORS.length]} counts={teamCounts[t.id]} top={i > 0} onRename={renameTeam} onDelete={deleteTeam} />)}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1 }}><Input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="New team name (e.g. Kitchen)" onKeyDown={(e) => { if (e.key === 'Enter') addTeam() }} /></div>
            <Button accent={T.pink} onClick={addTeam} disabled={teamBusy || !newTeam.trim()}>Add team</Button>
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
                <select style={{ width: '100%', boxSizing: 'border-box', fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, padding: '11px 13px', borderRadius: T.r.sm, border: '1px solid #E5E7EB', outline: 'none', background: '#fff' }}>
                  {LOCATION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Address" style={{ marginTop: 14 }}><Input placeholder="Street, city, postcode" /></Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <Button accent={T.pink} disabled>Add location</Button>
              <Button variant="ghost" size="md" onClick={() => setAddOpen(false)}>Cancel</Button>
              <span style={{ fontSize: 12, color: T.muted }}>Adding a location starts a new per-location subscription — wired up with billing.</span>
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
