'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTheme, Card, Button, Tag, Segmented, PAGE, PageHeader } from '@/app/components/ui/kit'
import { TEAM_COLORS } from '@/app/(auth)/dashboard/staff/utils/staffHelpers'
import { rotaBlock } from '@/lib/rotaColors'

// ════════════════════════════════════════════════════════════════════════════
//  ARCHIVE - browse every saved rota, jump to a week, open any past rota read-only.
// ════════════════════════════════════════════════════════════════════════════

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const prettyDate = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return s } }
const monthLabel = (s) => { try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) } catch { return '' } }
const fmt = (hhmm) => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); const ap = h < 12 ? 'am' : 'pm'; let hh = h % 12; if (hh === 0) hh = 12; return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}` }
const mondayOfDate = (s) => { const d = new Date(s + 'T00:00:00Z'); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10) }

// Read-only rendering of a saved rota (team sections · staff rows · day columns).
function ArchiveGrid({ data, teamColor }) {
  const { T } = useTheme()
  const dark = T.name === 'dark'
  const byTeam = useMemo(() => {
    const m = {}
    for (const a of data.assignments || []) {
      const t = (m[a.team_id] = m[a.team_id] || { id: a.team_id, name: a.team_name || 'Team', staff: {} })
      const s = (t.staff[a.staff_id] = t.staff[a.staff_id] || { id: a.staff_id, name: a.staff_name, blocks: {} })
      ;(s.blocks[a.day] = s.blocks[a.day] || []).push(a)
    }
    return Object.values(m).map((t) => ({ ...t, staff: Object.values(t.staff) }))
  }, [data])

  if (byTeam.length === 0) return <Card pad={32} style={{ textAlign: 'center', color: T.muted, fontSize: 14 }}>This rota has no assignments.</Card>

  return <Card pad={22} style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800, tableLayout: 'fixed' }}>
      <colgroup><col style={{ width: 160 }} />{DAYS.map((d) => <col key={d} />)}</colgroup>
      <thead><tr><th /><>{DAYS.map((d) => <th key={d} style={{ fontSize: 11, fontWeight: 800, color: T.body, padding: '4px 4px 12px', textAlign: 'center' }}>{d}</th>)}</></tr></thead>
      <tbody>
        {byTeam.map((team, ti) => {
          const color = teamColor[team.id] || T.pink
          return <>
            <tr key={`h${team.id}`}><td colSpan={8} style={{ padding: ti > 0 ? '22px 0 8px' : '4px 0 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
                <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 0.4, textTransform: 'uppercase' }}>{team.name}</span>
                <div style={{ flex: 1, height: 1, background: T.hair }} />
              </div>
            </td></tr>
            {team.staff.map((s, idx) => {
              const blk = rotaBlock(color, idx)
              const alphas = ['FF', 'C4', '96', '70']
              const blockBg = dark ? color + alphas[idx % alphas.length] : blk.background
              const blockFg = dark ? '#fff' : blk.color
              const blockSub = dark ? 'rgba(255,255,255,0.82)' : blk.subColor
              return <tr key={s.id}>
                <td style={{ padding: '4px 4px', verticalAlign: 'top' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: T.ink }}><span style={{ width: 9, height: 9, borderRadius: 99, background: color, flexShrink: 0 }} />{s.name}</span></td>
                {[0, 1, 2, 3, 4, 5, 6].map((d) => <td key={d} style={{ padding: '4px 4px', verticalAlign: 'top' }}>
                  {(s.blocks[d] || []).map((a, i) => <div key={i} style={{ background: blockBg, borderRadius: 10, padding: '7px 10px', marginBottom: 4, boxShadow: dark ? 'none' : blk.shadow }}>
                    <div style={{ color: blockFg, fontWeight: 700, fontSize: 11, lineHeight: 1.25 }}>{a.shift_name}</div>
                    <div style={{ color: blockSub, fontSize: 9.5 }}>{fmt(a.start_time)}-{fmt(a.end_time)}</div>
                  </div>)}
                </td>)}
              </tr>
            })}
          </>
        })}
      </tbody>
    </table>
  </Card>
}

// Print a rota via a clean standalone window (so the app chrome never prints).
function printRota(data, teamColor) {
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const byTeam = {}
  for (const a of data.assignments || []) {
    const t = (byTeam[a.team_id] = byTeam[a.team_id] || { name: a.team_name || 'Team', color: teamColor[a.team_id] || '#111', staff: {} })
    const s = (t.staff[a.staff_id] = t.staff[a.staff_id] || { name: a.staff_name, blocks: {} })
    ;(s.blocks[a.day] = s.blocks[a.day] || []).push(a)
  }
  let body = ''
  for (const t of Object.values(byTeam)) {
    body += `<tr><td class="team" colspan="8" style="color:${t.color}">${esc(t.name)}</td></tr>`
    for (const s of Object.values(t.staff)) {
      body += `<tr><td class="name">${esc(s.name)}</td>` + [0, 1, 2, 3, 4, 5, 6].map((d) =>
        `<td>${(s.blocks[d] || []).map((a) => `<div class="blk">${esc(a.shift_name)}</div><div class="tm">${fmt(a.start_time)}-${fmt(a.end_time)}</div>`).join('')}</td>`).join('') + `</tr>`
    }
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.name || 'Rota')}</title><style>
    *{box-sizing:border-box} body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#111827;margin:0;padding:24px}
    h1{font-size:20px;margin:0 0 2px} .sub{color:#6B7280;font-size:12px;margin:0 0 16px}
    table{width:100%;border-collapse:collapse} th,td{border:1px solid #E5E7EB;padding:6px 8px;font-size:11px;text-align:left;vertical-align:top}
    th{background:#F7F7F9;font-weight:800} td.name{font-weight:700;white-space:nowrap} td.team{font-weight:800;text-transform:uppercase;letter-spacing:.4px;border:none;padding:14px 0 4px;font-size:11px}
    .blk{font-weight:700} .tm{color:#6B7280;font-size:10px}
    @page{size:landscape;margin:12mm}
  </style></head><body>
    <h1>${esc(data.name || 'Week of ' + prettyDate(data.week_start))}</h1>
    <p class="sub">w/c ${prettyDate(data.week_start)} · ${esc(data.status || '')}</p>
    <table><thead><tr><th>Staff</th>${DAYS.map((d) => `<th>${d}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 250)
}

// Render a rota to a shareable PNG and hand it to the OS share sheet (mobile → straight
// to WhatsApp/Messages) or download it (desktop → drop into WhatsApp Web). This mirrors
// how managers actually distribute rotas: a picture in the group chat.
async function shareRotaImage(data, teamColor) {
  const DS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const byTeam = {}
  for (const a of data.assignments || []) {
    const t = (byTeam[a.team_id] = byTeam[a.team_id] || { name: a.team_name || 'Team', color: teamColor[a.team_id] || '#FF1F7D', staff: {} })
    const s = (t.staff[a.staff_id] = t.staff[a.staff_id] || { name: a.staff_name, blocks: {} })
    ;(s.blocks[a.day] = s.blocks[a.day] || []).push(a)
  }
  const teams = Object.values(byTeam).map((t) => ({ ...t, staff: Object.values(t.staff) }))

  const PAD = 28, LABELW = 150, DAYW = 120, TITLE = 70, DAYHEAD = 34, TEAMH = 38, BLOCKH = 34, BGAP = 5, RPAD = 8
  const rowH = (s) => { let mx = 1; for (let d = 0; d < 7; d++) mx = Math.max(mx, (s.blocks[d] || []).length); return mx * (BLOCKH + BGAP) - BGAP + RPAD * 2 }
  let bodyH = 0
  for (const t of teams) { bodyH += TEAMH; for (const s of t.staff) bodyH += rowH(s) }
  const W = PAD * 2 + LABELW + 7 * DAYW
  const H = TITLE + DAYHEAD + bodyH + PAD

  const S = 2
  const cv = document.createElement('canvas')
  cv.width = W * S; cv.height = H * S
  const ctx = cv.getContext('2d'); ctx.scale(S, S); ctx.textBaseline = 'top'
  const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
  const rrect = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h) }
  const trunc = (txt, max) => { let s = String(txt || ''); if (ctx.measureText(s).width <= max) return s; while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…' }

  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#111827'; ctx.font = `800 22px ${FONT}`
  ctx.fillText(data.name || `Week of ${prettyDate(data.week_start)}`, PAD, PAD)
  ctx.fillStyle = '#6B7280'; ctx.font = `600 13px ${FONT}`
  ctx.fillText(`w/c ${prettyDate(data.week_start)}   ·   ${data.status || ''}`, PAD, PAD + 30)
  ctx.fillStyle = '#FF1F7D'; ctx.font = `800 16px ${FONT}`; ctx.textAlign = 'right'
  ctx.fillText('Shiftly', W - PAD, PAD + 4); ctx.textAlign = 'left'

  let y = TITLE
  ctx.fillStyle = '#374151'; ctx.font = `800 12px ${FONT}`; ctx.textAlign = 'center'
  for (let d = 0; d < 7; d++) ctx.fillText(DS[d], PAD + LABELW + d * DAYW + DAYW / 2, y + 10)
  ctx.textAlign = 'left'; y += DAYHEAD

  for (const t of teams) {
    ctx.fillStyle = t.color; ctx.font = `800 12px ${FONT}`
    ctx.fillText(t.name.toUpperCase(), PAD, y + 12)
    ctx.strokeStyle = '#F0F0F2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, y + TEAMH - 6); ctx.lineTo(W - PAD, y + TEAMH - 6); ctx.stroke()
    y += TEAMH
    t.staff.forEach((s, idx) => {
      const blk = rotaBlock(t.color, idx)
      const h = rowH(s)
      ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(PAD + 5, y + RPAD + 9, 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#111827'; ctx.font = `600 13px ${FONT}`
      ctx.fillText(trunc(s.name, LABELW - 22), PAD + 16, y + RPAD + 2)
      for (let d = 0; d < 7; d++) {
        let by = y + RPAD
        for (const a of (s.blocks[d] || [])) {
          const bx = PAD + LABELW + d * DAYW + 3, bw = DAYW - 6
          ctx.save(); ctx.shadowColor = t.color + '40'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1.5
          ctx.fillStyle = blk.background; rrect(bx, by, bw, BLOCKH, 8); ctx.fill(); ctx.restore()
          ctx.fillStyle = blk.color; ctx.font = `700 11px ${FONT}`; ctx.fillText(trunc(a.shift_name, bw - 14), bx + 7, by + 5)
          ctx.fillStyle = blk.subColor; ctx.font = `500 10px ${FONT}`; ctx.fillText(`${fmt(a.start_time)}-${fmt(a.end_time)}`, bx + 7, by + 18)
          by += BLOCKH + BGAP
        }
      }
      y += h
    })
  }

  const blob = await new Promise((res) => cv.toBlob(res, 'image/png'))
  if (!blob) return
  const filename = `rota-${data.week_start}.png`
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: data.name || 'Rota', text: `Rota, w/c ${prettyDate(data.week_start)}` }); return }
    catch (e) { if (e?.name === 'AbortError') return }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

export default function ArchivePage() {
  const { T } = useTheme()
  const [rotas, setRotas] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [jump, setJump] = useState('') // a date → filter to that week
  const [view, setView] = useState(null) // { id } currently open
  const [viewData, setViewData] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/rotas').then((r) => r.ok ? r.json() : []),
      fetch('/api/teams').then((r) => r.ok ? r.json() : []),
    ]).then(([rd, td]) => { setRotas(Array.isArray(rd) ? rd : []); setTeams(Array.isArray(td) ? td : []); setLoading(false) })
  }, [])

  const teamColor = useMemo(() => Object.fromEntries(teams.map((t, i) => [t.id, TEAM_COLORS[i % TEAM_COLORS.length]])), [teams])

  const open = async (id) => {
    setView({ id }); setViewLoading(true); setViewData(null)
    try { const d = await (await fetch(`/api/rotas/${id}`)).json(); setViewData(d) } finally { setViewLoading(false) }
  }
  const del = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this rota? This cannot be undone.')) return
    await fetch(`/api/rotas/${id}`, { method: 'DELETE' })
    setRotas((r) => r.filter((x) => x.id !== id))
  }

  const filtered = useMemo(() => {
    let list = [...rotas]
    if (status !== 'all') list = list.filter((r) => (r.status || '') === status)
    if (jump) { const wk = mondayOfDate(jump); list = list.filter((r) => r.week_start === wk) }
    return list.sort((a, b) => (a.week_start < b.week_start ? 1 : -1))
  }, [rotas, status, jump])

  // group by month
  const groups = useMemo(() => {
    const m = {}
    for (const r of filtered) { const k = monthLabel(r.week_start); (m[k] = m[k] || []).push(r) }
    return Object.entries(m)
  }, [filtered])

  // ── viewing a single rota ──
  if (view) {
    return <div style={{ fontFamily: T.font, maxWidth: 1080, margin: '0 auto', padding: '28px 28px 56px' }}>
      <button onClick={() => { setView(null); setViewData(null) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.pink, marginBottom: 16 }}>← Back to archive</button>
      {viewLoading || !viewData ? <Card pad={40} style={{ textAlign: 'center', color: T.muted }}>Loading…</Card> : <>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>{viewData.name || `Week of ${prettyDate(viewData.week_start)}`}</h1>
            <p style={{ fontSize: 13, color: T.muted, margin: '5px 0 0' }}>w/c {prettyDate(viewData.week_start)} · {(viewData.assignments || []).length} shifts</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Tag color={viewData.status === 'Published' ? T.green : T.amber}>{viewData.status}</Tag>
            <Button accent={T.pink} size="sm" onClick={() => shareRotaImage(viewData, teamColor)}>Share image</Button>
            <Button variant="secondary" size="sm" onClick={() => printRota(viewData, teamColor)}>Print</Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.assign(`/dashboard/generate?rota=${view.id}`)}>Open in builder</Button>
          </div>
        </div>
        <ArchiveGrid data={viewData} teamColor={teamColor} />
      </>}
    </div>
  }

  // ── archive list ──
  return <div style={{ fontFamily: T.font, ...PAGE }}>
    <PageHeader title="Archive" subtitle="Every rota you've built. Open any past week to look back at it." />

    <Card pad={14} style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <Segmented options={[{ value: 'all', label: 'All' }, { value: 'Published', label: 'Published' }, { value: 'Draft', label: 'Drafts' }]} value={status} onChange={setStatus} accent={T.pink} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>Jump to week of</span>
        <input type="date" value={jump} onChange={(e) => setJump(e.target.value)} style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600, color: T.ink, background: T.card, padding: '8px 10px', borderRadius: 9, border: `1px solid ${T.border}`, outline: 'none' }} />
        {jump && <button onClick={() => setJump('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: T.pink }}>Clear</button>}
      </div>
    </Card>

    {loading ? <Card pad={40} style={{ textAlign: 'center', color: T.muted }}>Loading…</Card>
      : filtered.length === 0 ? <Card pad={40} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: '0 0 4px' }}>{jump || status !== 'all' ? 'No rotas match' : 'No rotas yet'}</p>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{jump || status !== 'all' ? 'Try clearing the filters.' : 'Build a rota and it will appear here.'}</p>
        </Card>
      : groups.map(([month, list]) => <div key={month} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase', margin: '0 0 10px 4px' }}>{month}</div>
          <Card pad={0} style={{ overflow: 'hidden' }}>
            {list.map((r, i) => <div key={r.id} onClick={() => open(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i ? `1px solid ${T.hair}` : 'none', cursor: 'pointer' }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: (r.status === 'Published' ? T.green : T.amber) + '14', color: r.status === 'Published' ? T.green : T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || `Week of ${prettyDate(r.week_start)}`}</p>
                <p style={{ fontSize: 12.5, color: T.muted, margin: '2px 0 0' }}>w/c {prettyDate(r.week_start)}</p>
              </div>
              <Tag color={r.status === 'Published' ? T.green : T.amber}>{r.status}</Tag>
              <button onClick={(e) => del(r.id, e)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4, display: 'flex' }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>)}
          </Card>
        </div>)}
  </div>
}
