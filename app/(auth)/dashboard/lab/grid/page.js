'use client'

import { useState, Fragment } from 'react'

// ════════════════════════════════════════════════════════════════════════════
//  LAB · ROTA COLOUR SANDBOX
//  Same week, four colour treatments side by side, so we can pick how cells
//  reconcile TEAM GROUPING (hue) with READABILITY for staff finding shifts.
// ════════════════════════════════════════════════════════════════════════════

const FONT = "'Plus Jakarta Sans', sans-serif"
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TEAMS = [
  { id: 'foh', name: 'Front of House', color: '#FF1F7D' },
  { id: 'kit', name: 'Kitchen', color: '#6366F1' },
  { id: 'bar', name: 'Bar', color: '#14B8A6' },
]

// shift types — cat drives the "shade by type" option (open=light, mid=base, close=dark)
const SHIFTS = {
  early: { label: 'Early', time: '8–2', cat: 'open' },
  mid: { label: 'Mid', time: '11–7', cat: 'mid' },
  lunch: { label: 'Lunch relief', time: '12–3', cat: 'mid' },
  close: { label: 'Close', time: '3–11', cat: 'close' },
}

const STAFF = [
  { name: 'Gareth', team: 'foh', week: ['mid', 'close', 'close', 'close', 'close', 'mid', null] },
  { name: 'Hannah', team: 'foh', week: ['close', 'early', 'mid', 'lunch', 'close', 'close', null] },
  { name: 'Jackie', team: 'foh', week: [null, 'mid', 'early', 'lunch', 'close', 'close', 'mid'] },
  { name: 'Moe', team: 'kit', week: ['early', null, 'mid', 'early', 'mid', null, 'early'] },
  { name: 'Sandra', team: 'kit', week: ['close', 'early', null, 'close', null, 'mid', 'close'] },
  { name: 'Holly', team: 'bar', week: [null, 'early', 'close', null, 'mid', 'close', 'early'] },
  { name: 'Wesley', team: 'bar', week: ['mid', 'close', null, 'mid', 'close', 'early', null] },
]

// ── colour helpers ──────────────────────────────────────────────────────────
const hexN = (h) => parseInt(h.slice(1), 16)
function mix(hex, target, amt) {
  const n = hexN(hex); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.round(r + (target - r) * amt); g = Math.round(g + (target - g) * amt); b = Math.round(b + (target - b) * amt)
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}
const lighten = (h, a) => mix(h, 255, a)
const darken = (h, a) => mix(h, 0, a)
// readable text colour for a given background (luminance threshold)
function textOn(hex) {
  const n = hexN(hex), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#1F2937' : '#fff'
}
// shade a team hue by shift category
function shadeFor(hex, cat) {
  if (cat === 'open') return lighten(hex, 0.34)
  if (cat === 'close') return darken(hex, 0.22)
  return hex
}

const teamOf = (id) => TEAMS.find((t) => t.id === id)
// staff index within their own team (drives the current "faded per-person" look)
function staffIdxInTeam(staff) {
  return STAFF.filter((s) => s.team === staff.team).indexOf(staff)
}

// ── a single shift block, rendered per variant ──────────────────────────────
function Block({ staff, type, variant }) {
  const s = SHIFTS[type]
  const hue = teamOf(staff.team).color

  let style, fg, leftBar = null
  if (variant === 'current') {
    const bg = lighten(hue, (staffIdxInTeam(staff) % 4) * 0.17) // faded by person
    style = { background: bg, boxShadow: `0 2px 6px ${bg}33` }
    fg = '#fff' // current behaviour: white text on the faded fill
  } else if (variant === 'solid') {
    style = { background: hue, boxShadow: `0 2px 6px ${hue}33` }
    fg = textOn(hue)
  } else if (variant === 'stripe') {
    style = { background: lighten(hue, 0.92), borderLeft: `4px solid ${hue}` }
    fg = '#1F2937'
  } else { // shade
    const bg = shadeFor(hue, s.cat)
    style = { background: bg, boxShadow: `0 2px 6px ${bg}33` }
    fg = textOn(bg)
  }

  return (
    <div style={{ borderRadius: 9, padding: variant === 'stripe' ? '6px 8px 6px 9px' : '6px 9px', ...style }}>
      <div style={{ color: fg, fontWeight: 700, fontSize: 11, lineHeight: 1.2 }}>{s.label}</div>
      <div style={{ color: variant === 'stripe' ? '#6B7280' : (fg === '#fff' ? 'rgba(255,255,255,.85)' : '#4B5563'), fontSize: 9.5 }}>{s.time}</div>
    </div>
  )
}

function Grid({ variant }) {
  const cell = { padding: '4px 5px', verticalAlign: 'top' }
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #ECECEF', borderRadius: 14, background: '#fff' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
        <thead>
          <tr>
            <th style={{ ...cell, textAlign: 'left', minWidth: 130, fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '10px 12px' }}>Staff</th>
            {DAYS.map((d) => <th key={d} style={{ ...cell, fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '10px 5px' }}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {TEAMS.map((team) => {
            const members = STAFF.filter((s) => s.team === team.id)
            return (
              <Fragment key={team.id}>
                <tr>
                  <td colSpan={8} style={{ padding: '12px 12px 4px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: '#6B7280' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 99, background: team.color }} />{team.name}
                    </span>
                  </td>
                </tr>
                {members.map((staff) => (
                  <tr key={staff.name} style={{ borderTop: '1px solid #F4F4F6' }}>
                    <td style={{ ...cell, fontSize: 12.5, fontWeight: 600, color: '#111827', padding: '6px 12px' }}>{staff.name}</td>
                    {staff.week.map((type, di) => (
                      <td key={di} style={cell}>{type ? <Block staff={staff} type={type} variant={variant} /> : <div style={{ height: 1 }} />}</td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const VARIANTS = [
  { key: 'current', tag: 'Current', title: 'Current — faded per person', desc: 'Each block is the team hue lightened by the person’s position in the team, with white text. The 3rd/4th person ends up near-white — the readability problem.' },
  { key: 'solid', tag: 'Option 1', title: 'Solid team hue + auto-contrast text', desc: 'Full-saturation team colour, text auto-set to white or near-black for contrast. Grouping = hue; readability = solid block + bold label. Shift type read from the label.' },
  { key: 'stripe', tag: 'Option 2', title: 'Team stripe + neutral block', desc: 'Light near-white blocks with dark text (max readability), team shown as a bold left bar. Most on-brand with the monochrome system.' },
  { key: 'shade', tag: 'Option 3', title: 'Hue = team, shade = shift type', desc: 'Team hue carries grouping; light/mid/dark shade brings back shift-type colour from the old grid. Open = light, mid = base, close = dark.' },
]

export default function GridLab() {
  const [solo, setSolo] = useState('')
  const shown = solo ? VARIANTS.filter((v) => v.key === solo) : VARIANTS

  return (
    <div style={{ fontFamily: FONT, background: '#FAFAFB', minHeight: '100vh', color: '#111827', padding: '28px 28px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Rota colour sandbox</h1>
        <p style={{ fontSize: 13.5, color: '#6B7280', margin: '5px 0 18px' }}>Same week, four colour treatments — reconciling team grouping with readability for staff finding their shifts.</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          <Btn active={!solo} onClick={() => setSolo('')}>All four</Btn>
          {VARIANTS.map((v) => <Btn key={v.key} active={solo === v.key} onClick={() => setSolo(v.key)}>{v.tag}</Btn>)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {shown.map((v) => (
            <div key={v.key}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: v.key === 'current' ? '#9CA3AF' : '#FF1F7D', textTransform: 'uppercase', letterSpacing: 0.5 }}>{v.tag}</span>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{v.title}</h2>
              </div>
              <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 10px', maxWidth: 720 }}>{v.desc}</p>
              <Grid variant={v.key} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Btn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${active ? '#FF1F7D' : '#E5E7EB'}`, background: active ? '#FF1F7D12' : '#fff', color: active ? '#FF1F7D' : '#6B7280' }}>{children}</button>
  )
}
