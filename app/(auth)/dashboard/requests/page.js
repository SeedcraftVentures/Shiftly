'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTheme, Card, Button, Segmented, Select, Icon, Ic, Avatar, Tag } from '@/app/components/ui/kit'

// ── Inbox, manager view over Requests + Announcements + Escalations ──────────
// Backed by /api/requests, /api/notifications/announce, /api/notifications/escalations.
// Requests are org-scoped server-side to the active location's teams.

const TYPE_META = {
  holiday: { label: 'Time off', group: 'Time off', color: '#5E5CE6' },
  sick: { label: 'Sick leave', group: 'Sick leave', color: '#FF9F0A' },
  swap: { label: 'Shift swap', group: 'Shift swaps', color: '#30B0C7' },
  cover: { label: 'Cover', group: 'Cover', color: '#FF375F' },
  availability: { label: 'Availability', group: 'Availability', color: '#86868B' },
}
const GROUP_ORDER = ['Time off', 'Sick leave', 'Shift swaps', 'Cover', 'Availability']

function fmtDate(d) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return d }
}
function dateRange(r) {
  const a = fmtDate(r.start_date), b = fmtDate(r.end_date)
  if (a && b && a !== b) return `${a} to ${b}`
  return a || fmtDate(r.shift_date) || 'Date TBC'
}
function hoursOpen(created) {
  return Math.max(0, Math.round((Date.now() - new Date(created).getTime()) / 3600000))
}

export default function InboxPage() {
  const { T } = useTheme()
  const [tab, setTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/requests')
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } catch { /* leave as-is */ } finally { setLoading(false) }
  }, [])

  const loadEscalations = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/escalations')
      const data = await res.json()
      setEscalations(data?.escalations || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadRequests(); loadEscalations() }, [loadRequests, loadEscalations])

  const pendingCount = requests.filter((r) => r.direction === 'incoming' && r.status === 'pending').length

  const tabs = [
    { value: 'requests', label: pendingCount ? `Requests · ${pendingCount}` : 'Requests' },
    { value: 'announcements', label: 'Announcements' },
    { value: 'escalations', label: escalations.length ? `Escalations · ${escalations.length}` : 'Escalations' },
  ]

  return (
    <div style={{ fontFamily: T.font, color: T.body, maxWidth: 860, margin: '0 auto', padding: '40px 32px 64px' }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em' }}>Inbox</h1>
      <p style={{ fontSize: 16, color: T.muted, margin: '6px 0 22px', letterSpacing: '-0.01em' }}>Staff requests, shift swaps and announcements.</p>

      <div style={{ marginBottom: 22 }}>
        <Segmented options={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === 'requests' && <RequestsTab T={T} requests={requests} loading={loading} reload={loadRequests} />}
      {tab === 'announcements' && <AnnouncementsTab T={T} />}
      {tab === 'escalations' && <EscalationsTab T={T} escalations={escalations} />}
    </div>
  )
}

// ── Requests ─────────────────────────────────────────────────────────────────
function RequestsTab({ T, requests, loading, reload }) {
  const [status, setStatus] = useState('pending')
  const [showLog, setShowLog] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [impact, setImpact] = useState(null)
  const [impacts, setImpacts] = useState({})

  // Work out the coverage cost of every pending absence up front, so the warning
  // sits under the request rather than appearing only after clicking Approve.
  // It also means Approve responds instantly instead of showing "Checking...".
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/requests/impact')
        const data = await res.json()
        if (!cancelled) setImpacts(data?.impacts || {})
      } catch { /* the inline hint is a bonus; never break the list over it */ }
    })()
    return () => { cancelled = true }
  }, [requests])

  const incoming = requests.filter((r) => r.direction === 'incoming')
  const filtered = status === 'all' ? incoming : incoming.filter((r) => r.status === status)

  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    items: filtered.filter((r) => (TYPE_META[r.type]?.group || 'Time off') === g),
  })).filter((g) => g.items.length)

  const act = async (id, newStatus, notes) => {
    setBusyId(id)
    try {
      await fetch('/api/requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, manager_notes: notes ?? undefined }),
      })
      await reload()
    } finally { setBusyId(null) }
  }

  // Approving absence can strand shifts, so confirm the cost before committing.
  // Nothing is ever blocked: the manager sees the price and decides.
  const approve = async (r) => {
    const known = impacts[r.id]
    if (known?.hasImpact) { setImpact({ request: r, ...known }); return }
    // No cached answer yet (batch still loading, or it failed): check just this one.
    if (!known) {
      setBusyId(r.id)
      try {
        const res = await fetch(`/api/requests/impact?id=${r.id}`)
        const fresh = await res.json()
        if (res.ok && fresh?.hasImpact) { setImpact({ request: r, ...fresh }); return }
      } catch { /* fall through and approve normally */ }
      finally { setBusyId(null) }
    }
    await act(r.id, 'approved')
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Segmented size="sm" value={status} onChange={setStatus} options={[
          { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' },
        ]} />
        <Button size="sm" icon={Ic.plus} onClick={() => setShowLog(true)}>Log request</Button>
      </div>

      {loading ? (
        <Card pad={40} style={{ textAlign: 'center', color: T.faint }}>Loading requests…</Card>
      ) : groups.length === 0 ? (
        <EmptyState T={T} icon={Ic.requests} title={status === 'pending' ? 'Nothing to action' : 'No requests here'}
          body={status === 'pending' ? 'When your team requests time off or swaps, it lands here to approve.' : 'No requests match this filter.'} />
      ) : (
        groups.map((g) => (
          <div key={g.name} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 2px 10px' }}>{g.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {g.items.map((r) => <RequestCard key={r.id} T={T} r={r} busy={busyId === r.id} onAct={act} onApprove={approve} impact={impacts[r.id]} />)}
            </div>
          </div>
        ))
      )}

      {showLog && <LogRequestModal T={T} onClose={() => setShowLog(false)} onSaved={() => { setShowLog(false); reload() }} />}
      {impact && <ImpactModal T={T} data={impact} onClose={() => setImpact(null)}
        onConfirm={async () => { const id = impact.request.id; setImpact(null); await act(id, 'approved') }} />}
    </>
  )
}

function RequestCard({ T, r, busy, onAct, onApprove, impact }) {
  const meta = TYPE_META[r.type] || TYPE_META.holiday
  const name = r.staff?.name || 'Team member'
  const statusColor = r.status === 'approved' ? T.green : r.status === 'rejected' ? T.red : T.pink

  return (
    <Card pad={16}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar name={name} color={meta.color} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{name}</span>
            <Tag color={meta.color}>{meta.label}</Tag>
            {r.status !== 'pending' && <Tag color={statusColor}>{r.status}</Tag>}
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
            {dateRange(r)}{r.swap_staff ? ` · with ${r.swap_staff.name}` : ''}
          </div>
          {r.reason && <div style={{ fontSize: 13, color: T.body, marginTop: 6, lineHeight: 1.45 }}>{r.reason}</div>}
          {r.manager_notes && r.status !== 'pending' && (
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 6, fontStyle: 'italic' }}>Note: {r.manager_notes}</div>
          )}
          {/* Coverage cost, shown before the manager commits rather than after.
              Matches the dashboard's frosted amber capacity warning. */}
          {r.status === 'pending' && impact?.hasImpact && <ImpactNote T={T} impact={impact} />}
        </div>
        {r.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => {
              const note = window.prompt('Add a note for the employee (optional):', '')
              if (note === null) return
              onAct(r.id, 'rejected', note || null)
            }}>Deny</Button>
            <Button size="sm" disabled={busy} onClick={() => onApprove(r)}>{busy ? 'Checking…' : 'Approve'}</Button>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Announcements ────────────────────────────────────────────────────────────
function AnnouncementsTab({ T }) {
  const [teams, setTeams] = useState([])
  const [scope, setScope] = useState('all')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [sent, setSent] = useState([])

  const loadSent = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?type=announcement&sent=true&limit=100')
      const data = await res.json()
      const rows = data?.notifications || []
      // Announcements fan out to many recipients, dedupe by message + minute.
      const seen = new Set(), unique = []
      for (const n of rows) {
        const key = `${n.message}|${(n.created_at || '').slice(0, 16)}`
        if (seen.has(key)) continue
        seen.add(key); unique.push(n)
      }
      setSent(unique)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch('/api/teams').then((r) => r.json()).then((d) => setTeams(Array.isArray(d) ? d : [])).catch(() => {})
    loadSent()
  }, [loadSent])

  const send = async () => {
    if (!message.trim()) return
    setSending(true); setFeedback(null)
    try {
      const body = scope === 'all' ? { all_teams: true, message } : { team_id: scope, message }
      const res = await fetch('/api/notifications/announce', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')
      setMessage('')
      setFeedback(data.sent > 0 ? `Sent to ${data.sent} ${data.sent === 1 ? 'person' : 'people'}.` : 'Saved. No connected staff to notify yet. They will see it once they join the app.')
      loadSent()
    } catch (e) {
      setFeedback(e.message || 'Could not send.')
    } finally { setSending(false) }
  }

  return (
    <>
      <Card pad={20} style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 12, letterSpacing: '-0.02em' }}>New announcement</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <Select value={scope} onChange={(e) => setScope(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="all">All teams (this location)</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <textarea
          value={message} onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          placeholder="Write a message for your team…" rows={3}
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: T.font, fontSize: 14, fontWeight: 500, color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', outline: 'none', resize: 'vertical', lineHeight: 1.5 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12 }}>
          <span style={{ fontSize: 12, color: feedback ? T.pink : T.faint }}>{feedback || `${message.length}/1000`}</span>
          <Button size="sm" disabled={sending || !message.trim()} onClick={send}>{sending ? 'Sending…' : 'Send announcement'}</Button>
        </div>
      </Card>

      <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 2px 10px' }}>Sent</div>
      {sent.length === 0 ? (
        <EmptyState T={T} icon={Ic.requests} title="No announcements yet" body="Broadcasts you send to your team will be listed here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sent.map((n) => (
            <Card key={n.id} pad={14}>
              <div style={{ fontSize: 13.5, color: T.body, lineHeight: 1.5 }}>{n.message}</div>
              <div style={{ fontSize: 12, color: T.faint, marginTop: 6 }}>{fmtDate(n.created_at)}</div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

// ── Escalations ──────────────────────────────────────────────────────────────
function EscalationsTab({ T, escalations }) {
  if (!escalations.length) {
    return <EmptyState T={T} icon={Ic.check} title="All clear" body="No requests have been sitting unclaimed. Swaps and cover that go 24 hours without a pickup show up here." />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {escalations.map((e) => {
        const h = hoursOpen(e.created_at)
        const critical = h >= 48
        return (
          <Card key={e.id} pad={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: (critical ? T.red : T.amber) + '22', color: critical ? T.red : T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon path={Ic.shifts} size={18} stroke={1.9} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{e.staff_name || 'A team member'} · {TYPE_META[e.type]?.label || e.type}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Open for {h}h with no pickup{e.start_date ? ` · ${fmtDate(e.start_date)}` : ''}</div>
              </div>
              <Tag color={critical ? T.red : T.amber}>{critical ? 'Critical' : 'Attention'}</Tag>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Log request modal ────────────────────────────────────────────────────────
function LogRequestModal({ T, onClose, onSaved }) {
  const [teams, setTeams] = useState([])
  const [staff, setStaff] = useState([])
  const [teamId, setTeamId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [type, setType] = useState('holiday')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/teams').then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : []
      setTeams(list)
      if (list[0]) setTeamId(list[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!teamId) { setStaff([]); return }
    fetch(`/api/staff?team_id=${teamId}`).then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : []
      setStaff(list)
      setStaffId(list[0]?.id || '')
    }).catch(() => {})
  }, [teamId])

  const save = async () => {
    if (!teamId || !staffId) { setError('Pick a team and a person.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, staff_id: staffId, type, direction: 'incoming', start_date: startDate || null, end_date: endDate || null, reason: reason || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not save.')
      onSaved()
    } catch (e) { setError(e.message); setSaving(false) }
  }

  const field = { fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, background: T.fieldBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }

  const modal = (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,10,12,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 20, boxShadow: T.shadowHover, padding: 24, fontFamily: T.font }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Log a request</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4, display: 'flex' }}><Icon path={Ic.x || 'M6 6l12 12M6 18L18 6'} size={18} /></button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Team</label>
              <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
            <div><label style={lbl}>Person</label>
              <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
          </div>
          <div><label style={lbl}>Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="holiday">Time off</option>
              <option value="sick">Sick leave</option>
              <option value="cover">Cover needed</option>
              <option value="swap">Shift swap</option>
            </Select></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>From</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={field} /></div>
            <div><label style={lbl}>To</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={field} /></div>
          </div>
          <div><label style={lbl}>Reason (optional)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. family holiday" style={field} /></div>
        </div>

        {error && <div style={{ fontSize: 12.5, color: T.red, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Log request'}</Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

// Frosted amber note, matching the dashboard's capacity warning: tinted rounded
// chip with a kit icon, then body copy with the numbers emphasised in ink.
function ImpactNote({ T, impact, style }) {
  const kh = impact.keyholderGaps
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 11, background: T.amber + '14', border: `1px solid ${T.amber}33`, borderRadius: 12, padding: 12, ...style }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: T.amber + '22', color: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon path={kh ? Ic.key : Ic.staff} size={14} stroke={1.9} />
      </span>
      <p style={{ flex: 1, fontSize: 13, color: T.body, margin: 0, lineHeight: 1.5, letterSpacing: '-0.01em' }}>
        {impact.mode === 'assignments' ? (
          <>Covers <b style={{ color: T.ink }}>{impact.shifts?.length} shift{impact.shifts?.length > 1 ? 's' : ''} ({impact.totalHours}h)</b> on the {impact.published ? 'published' : 'draft'} rota. Approving leaves {impact.shifts?.length > 1 ? 'them' : 'it'} uncovered.</>
        ) : (
          <>Needs <b style={{ color: T.ink }}>{impact.coverHours}h of cover</b> on {impact.team_name}{kh ? <>, and <b style={{ color: T.ink }}>{kh} shift{kh > 1 ? 's' : ''}</b> would have no keyholder free</> : ''}.</>
        )}
      </p>
    </div>
  )
}

// ── approval guardrail ───────────────────────────────────────────────────────
// Shows what approving this absence costs, then lets the manager do it anyway.
// Never blocks: sometimes leave has to be approved and cover sorted separately.
function ImpactModal({ T, data, onClose, onConfirm }) {
  const modal = (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,10,12,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto', background: T.cardSolid, border: `1px solid ${T.border}`, borderRadius: 20, boxShadow: T.shadowHover, padding: 24, fontFamily: T.font }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: T.amber + '22', color: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon path={data.keyholderGaps ? Ic.key : Ic.staff} size={16} stroke={1.9} />
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>This leaves shifts to cover</span>
        </div>

        <p style={{ fontSize: 13.5, color: T.body, lineHeight: 1.5, letterSpacing: '-0.01em', margin: '0 0 14px' }}>{data.headline}</p>

        {data.mode === 'assignments' && data.shifts?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {data.shifts.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, background: T.subtle, borderRadius: 9, padding: '8px 11px' }}>
                <span style={{ color: T.ink, fontWeight: 600 }}>{s.day} {s.work_date}</span>
                <span style={{ color: T.muted }}>{s.shift_name} · {s.start_time} to {s.end_time} · {s.hours}h</span>
              </div>
            ))}
          </div>
        )}

        {data.mode === 'coverage' && data.gaps?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {data.gaps.map((g, i) => (
              <div key={i} style={{ fontSize: 12.5, background: T.subtle, borderRadius: 9, padding: '8px 11px', color: T.body }}>
                <b style={{ color: T.ink }}>{g.day} {g.date}</b> · {g.shift_name}
                {g.keyholder ? ' · no keyholder free' : ` · ${g.short} short (${g.hours}h)`}
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: T.faint, margin: '0 0 18px', lineHeight: 1.5 }}>
          You can still approve. The shifts will show as gaps on the rota so you can arrange cover.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onConfirm}>Approve anyway</Button>
        </div>
      </div>
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

// ── shared ───────────────────────────────────────────────────────────────────
function EmptyState({ T, icon, title, body }) {
  return (
    <Card pad={44} style={{ textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 15, margin: '0 auto 16px', background: T.pink + '14', color: T.pink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon path={icon} size={24} stroke={1.7} />
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: T.ink, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{title}</p>
      <p style={{ fontSize: 14, color: T.muted, margin: '0 auto', maxWidth: 380, lineHeight: 1.55 }}>{body}</p>
    </Card>
  )
}
