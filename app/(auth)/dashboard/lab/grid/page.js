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
// fixed palette for SHIFT TYPE — used when colour encodes the shift, not the team
// (morning warm → midday blue → evening deep, roughly by time of day)
const SHIFT_TYPE_COLORS = { early: '#F59E0B', mid: '#0EA5E9', lunch: '#14B8A6', close: '#6D28D9' }

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

// ── per-person tone WITHIN a team's hue family ──────────────────────────────
// Each person gets a distinct, solid tone that still reads as the team colour.
// Spread across TWO axes (lightness + saturation, tiny hue shimmer) and ordered
// by the golden ratio so adjacent rows are always far apart → scales to ~20.
function hexToHsl(hex) {
  const n = hexN(hex); let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100
  const f = (m) => { const k = (m + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) }
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0')
  return '#' + to(f(0)) + to(f(8)) + to(f(4))
}
const frac = (x) => x - Math.floor(x)
function personTone(teamHex, idx) {
  const base = hexToHsl(teamHex)
  const a = frac(idx * 0.6180339887) // lightness axis  (golden-ratio spacing)
  const b = frac(idx * 0.7548776662) // saturation axis (second irrational)
  const L = 38 + a * 40              // 38–78% — solid, never washed out or muddy
  const S = 60 + b * 32              // 60–92% — stays punchy / "blocky"
  const H = base.h + (b - 0.5) * 10  // ±5° shimmer, still clearly the family
  return hslToHex(H, S, L)
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
  } else if (variant === 'family') {
    const bg = personTone(hue, staffIdxInTeam(staff)) // tone per person, same family
    style = { background: bg, boxShadow: `0 2px 6px ${bg}33` }
    fg = textOn(bg)
  } else if (variant === 'frame') {
    const bg = SHIFT_TYPE_COLORS[type] // colour = SHIFT TYPE (team lives in the frame)
    style = { background: bg, boxShadow: `0 2px 6px ${bg}33` }
    fg = textOn(bg)
  } else if (variant === 'neutral') {
    style = { background: '#F3F4F6' } // neutral & readable; colour does not carry info here
    fg = '#1F2937'
  } else if (variant === 'stripe') {
    style = { background: lighten(hue, 0.92), borderLeft: `4px solid ${hue}` }
    fg = '#1F2937'
  } else { // shade
    const bg = shadeFor(hue, s.cat)
    style = { background: bg, boxShadow: `0 2px 6px ${bg}33` }
    fg = textOn(bg)
  }

  const mutedTime = variant === 'stripe' || variant === 'neutral'
  return (
    <div style={{ borderRadius: 9, padding: variant === 'stripe' ? '6px 8px 6px 9px' : '6px 9px', ...style }}>
      <div style={{ color: fg, fontWeight: 700, fontSize: 11, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
        {variant === 'neutral' && <span style={{ width: 7, height: 7, borderRadius: 99, background: SHIFT_TYPE_COLORS[type], flexShrink: 0 }} />}
        {s.label}
      </div>
      <div style={{ color: mutedTime ? '#6B7280' : (fg === '#fff' ? 'rgba(255,255,255,.85)' : '#4B5563'), fontSize: 9.5 }}>{s.time}</div>
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
  { key: 'family', tag: '★ Hybrid', title: 'Tone per person, within the team family', desc: 'Each person gets their own solid tone, but all of a team’s tones stay in the same hue family (FOH = pinks, Kitchen = indigos…). Find your name once and your colour is consistent across the whole row; the family says which team. Scaling test below.' },
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
        <p style={{ fontSize: 13.5, color: '#6B7280', margin: '5px 0 22px' }}>Reframed: stop overloading the block fill. Each job goes to the channel that’s good at it — team to the frame, shift to the cell, “find my row” to layout.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginBottom: 36 }}>
          <div>
            <Head tag="Route A" title="Team in the frame, shift-type in the cells" desc="Team colour lives in the chrome — a coloured name column with a left rail + section header — so the eye anchors on your name and tracks across. The cells go back to being coloured by SHIFT TYPE (the old grid you missed): morning/mid/evening each a colour, with readable text. Two channels, no conflict, scales to any team size." />
            <TypeLegend />
            <RouteA />
          </div>
          <div>
            <Head tag="Route B" title="Colour = grouping only; structure finds the row" desc="Cells are neutral and maximally readable (a small dot hints the shift type). Team is just a dot + section. Finding your shifts is a layout job: pick “Viewing as” to highlight your row, or “Show only me” to filter to just you — exactly what the shared/printed staff version would do." />
            <RouteB />
          </div>
        </div>

        <div style={{ height: 1, background: '#ECECEF', margin: '4px 0 18px' }} />
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Earlier experiments (overloaded block fill) — for reference</p>

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
          {(!solo || solo === 'family') && <ScalingTest />}
        </div>
      </div>
    </div>
  )
}

// ── shift-type legend (for the routes where colour encodes the shift) ────────
function TypeLegend() {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
      {Object.entries(SHIFTS).map(([k, v]) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#6B7280' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: SHIFT_TYPE_COLORS[k] }} />{v.label}
        </span>
      ))}
    </div>
  )
}

function Head({ tag, title, desc }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#FF1F7D', textTransform: 'uppercase', letterSpacing: 0.5 }}>{tag}</span>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 10px', maxWidth: 760 }}>{desc}</p>
    </>
  )
}

const cell = { padding: '4px 5px', verticalAlign: 'top' }
function HeadRow() {
  return (
    <thead>
      <tr>
        <th style={{ ...cell, textAlign: 'left', minWidth: 150, fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '10px 12px' }}>Staff</th>
        {DAYS.map((d) => <th key={d} style={{ ...cell, fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '10px 5px' }}>{d}</th>)}
      </tr>
    </thead>
  )
}

// ── ROUTE A: team in the frame (coloured name column + section), shift-type fill ──
function RouteA() {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #ECECEF', borderRadius: 14, background: '#fff' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
        <HeadRow />
        <tbody>
          {TEAMS.map((team) => {
            const tint = lighten(team.color, 0.9)
            return (
              <Fragment key={team.id}>
                <tr><td colSpan={8} style={{ padding: '12px 12px 4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: team.color }}>
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: team.color }} />{team.name}
                  </span>
                </td></tr>
                {STAFF.filter((s) => s.team === team.id).map((staff) => (
                  <tr key={staff.name} style={{ borderTop: '1px solid #F4F4F6' }}>
                    <td style={{ ...cell, padding: '6px 12px', borderLeft: `4px solid ${team.color}`, background: tint }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: '#111827' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 99, background: team.color, flexShrink: 0 }} />{staff.name}
                      </span>
                    </td>
                    {staff.week.map((type, di) => <td key={di} style={cell}>{type ? <Block staff={staff} type={type} variant="frame" /> : <div style={{ height: 1 }} />}</td>)}
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

// ── ROUTE B: neutral readable cells; team = dot/section; find your row by structure ──
function RouteB() {
  const [viewAs, setViewAs] = useState('Hannah')
  const [onlyMe, setOnlyMe] = useState(false)
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7280' }}>Viewing as</span>
        <select value={viewAs} onChange={(e) => setViewAs(e.target.value)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer' }}>
          {STAFF.map((s) => <option key={s.name}>{s.name}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyMe} onChange={(e) => setOnlyMe(e.target.checked)} /> Show only me
        </label>
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid #ECECEF', borderRadius: 14, background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
          <HeadRow />
          <tbody>
            {TEAMS.map((team) => {
              const members = STAFF.filter((s) => s.team === team.id && (!onlyMe || s.name === viewAs))
              if (!members.length) return null
              return (
                <Fragment key={team.id}>
                  <tr><td colSpan={8} style={{ padding: '12px 12px 4px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: '#6B7280' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 99, background: team.color }} />{team.name}
                    </span>
                  </td></tr>
                  {members.map((staff) => {
                    const me = staff.name === viewAs
                    return (
                      <tr key={staff.name} style={{ borderTop: '1px solid #F4F4F6', background: me ? '#FFF5F9' : 'transparent' }}>
                        <td style={{ ...cell, padding: '6px 12px', borderLeft: `3px solid ${me ? '#FF1F7D' : 'transparent'}` }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: me ? 800 : 600, color: '#111827' }}>
                            <span style={{ width: 9, height: 9, borderRadius: 99, background: team.color, flexShrink: 0 }} />{staff.name}
                            {me && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#FF1F7D', background: '#FF1F7D18', padding: '1px 6px', borderRadius: 5 }}>YOU</span>}
                          </span>
                        </td>
                        {staff.week.map((type, di) => <td key={di} style={cell}>{type ? <Block staff={staff} type={type} variant="neutral" /> : <div style={{ height: 1 }} />}</td>)}
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── scaling test: one team's hue family blown up to N people ─────────────────
const SCALE_TYPES = ['mid', 'close', 'early', 'lunch', null, 'mid', null]
function ScalingTest() {
  const [n, setN] = useState(20)
  const [hue, setHue] = useState('#FF1F7D')
  const people = Array.from({ length: n }, (_, i) => i)
  const cell = { padding: '4px 5px', verticalAlign: 'top' }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#FF1F7D', textTransform: 'uppercase', letterSpacing: 0.5 }}>Scaling test</span>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Does it hold at {n} in one team?</h2>
      </div>
      <p style={{ fontSize: 12.5, color: '#6B7280', margin: '0 0 10px', maxWidth: 720 }}>The same hybrid scheme, one team scaled up. Adjacent rows are always far apart in tone (golden-ratio spacing), so neighbours stay distinct even when the family is dense — and the name in the first column is always the real anchor.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {[8, 12, 16, 20].map((x) => <Btn key={x} active={n === x} onClick={() => setN(x)}>{x} people</Btn>)}
        <span style={{ width: 1, background: '#E5E7EB', margin: '0 4px' }} />
        {TEAMS.map((t) => <Btn key={t.id} active={hue === t.color} onClick={() => setHue(t.color)}>{t.name.split(' ')[0]}</Btn>)}
      </div>
      {/* full family swatch strip */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 12, flexWrap: 'wrap' }}>
        {people.map((i) => <div key={i} style={{ width: 26, height: 26, borderRadius: 6, background: personTone(hue, i) }} title={`Person ${i + 1}`} />)}
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid #ECECEF', borderRadius: 14, background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: 'left', minWidth: 130, fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '10px 12px' }}>Staff</th>
              {DAYS.map((d) => <th key={d} style={{ ...cell, fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '10px 5px' }}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {people.map((i) => {
              const bg = personTone(hue, i), fg = textOn(bg)
              return (
                <tr key={i} style={{ borderTop: '1px solid #F4F4F6' }}>
                  <td style={{ ...cell, fontSize: 12.5, fontWeight: 600, color: '#111827', padding: '6px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: bg, flexShrink: 0 }} />Person {i + 1}</span>
                  </td>
                  {DAYS.map((d, di) => {
                    const type = SCALE_TYPES[(i * 3 + di * 2) % SCALE_TYPES.length]
                    return <td key={di} style={cell}>{type
                      ? <div style={{ borderRadius: 9, padding: '6px 9px', background: bg, boxShadow: `0 2px 6px ${bg}33` }}>
                          <div style={{ color: fg, fontWeight: 700, fontSize: 11, lineHeight: 1.2 }}>{SHIFTS[type].label}</div>
                          <div style={{ color: fg === '#fff' ? 'rgba(255,255,255,.85)' : '#4B5563', fontSize: 9.5 }}>{SHIFTS[type].time}</div>
                        </div>
                      : <div style={{ height: 1 }} />}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Btn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${active ? '#FF1F7D' : '#E5E7EB'}`, background: active ? '#FF1F7D12' : '#fff', color: active ? '#FF1F7D' : '#6B7280' }}>{children}</button>
  )
}
