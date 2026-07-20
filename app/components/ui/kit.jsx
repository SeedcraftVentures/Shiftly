'use client'

import { useState, useRef, useEffect } from 'react'

// ════════════════════════════════════════════════════════════════════════════
//  SHIFTLY UI KIT, the single source of truth for shared components + tokens.
//  Import these everywhere instead of re-styling. Iterate here, it updates app-wide.
// ════════════════════════════════════════════════════════════════════════════

export const T = {
  pink: '#FF1F7D', amber: '#F59E0B', green: '#16A34A', red: '#EF4444',
  ink: '#111827', body: '#374151', muted: '#6B7280', faint: '#9CA3AF',
  line: '#ECECEF', hair: '#F4F4F6', track: '#EFEFF2', surface: '#FAFAFB',
  // Cal Sans Text (self-hosted, OFL) is the app typeface, body + headings. Jakarta
  // remains as a fallback. `fontHead` is the heading token (same family today, but
  // a distinct token so headings can diverge later without touching every page).
  font: "'Cal Sans Text', 'Plus Jakarta Sans', sans-serif",
  fontHead: "'Cal Sans Text', 'Plus Jakarta Sans', sans-serif",
  // ── type scale, six named roles, reference by role not px. (~1.25 ratio off 16px
  //    body.) Dense UI guidance: `small` (13) for metadata/labels/dense rows, `body`
  //    (16) for real content; headings h3→display. Collapse ad-hoc sizes onto these. ──
  fz: { display: 39, h1: 31, h2: 25, h3: 20, body: 16, small: 13 },
  lh: { tight: 1.15, snug: 1.3, normal: 1.5 },
  // ── spacing, 8-pt grid with a 4px sub-step. Every gap/padding/margin comes from here. ──
  space: { xs: 4, sm: 8, snug: 12, md: 16, lg: 24, xl: 32, xxl: 48, huge: 64 },
  // ── shape & elevation scale, the cohesion backbone. Reach for these, not raw px.
  //    Radii are all multiples of 4 (4/8/12/16/20). ──
  r: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  shadow: {
    sm: '0 1px 2px rgba(17,24,39,.06)',
    md: '0 3px 10px rgba(17,24,39,.06), 0 1px 2px rgba(17,24,39,.04)',
    lg: '0 10px 28px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05)',
    pop: '0 14px 36px rgba(17,24,39,.16)',
  },
  // a soft coloured lift for a primary action, keyed to its accent
  lift: (hex) => `0 8px 18px ${hex}40, 0 2px 5px ${hex}26`,
  ring: (hex) => `0 0 0 3px ${hex}33`,
}

// ── Tip (hover tooltip) ─────────────────────────────────────────────────────────
// Wrap any element; pass `text`. `on` lets callers gate it (e.g. demo only).
export function Tip({ text, children, on = true, style }) {
  const [show, setShow] = useState(false)
  if (!on || !text) return children
  return <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ position: 'relative', display: 'inline-flex', ...style }}>
    {children}
    {show && <span style={{ position: 'absolute', bottom: 'calc(100% + 9px)', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, padding: '7px 10px', borderRadius: 8, width: 'max-content', maxWidth: 230, textAlign: 'center', zIndex: 80, boxShadow: '0 6px 18px rgba(0,0,0,.22)', pointerEvents: 'none' }}>{text}<span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '5px 5px 0', borderStyle: 'solid', borderColor: '#111827 transparent transparent' }} /></span>}
  </span>
}

// ── Page shell + header ─────────────────────────────────────────────────────────
// One source of truth for page rhythm so every route shares the same baseline:
// 32px top padding, 1200px max-width, H1 24/600 in the heading font, 4px to the
// subtitle, 24px to the first content block. Use on EVERY dashboard page.
export const PAGE = { maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px' }
export function PageShell({ children, style }) {
  return <div style={{ fontFamily: T.font, ...PAGE, ...style }}>{children}</div>
}
export function PageHeader({ title, subtitle, actions, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24, ...style }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: T.fontHead, fontSize: 24, fontWeight: 600, color: T.ink, margin: 0, letterSpacing: '-0.015em' }}>{title}</h1>
        {subtitle != null && <p style={{ fontFamily: T.font, fontSize: 14, fontWeight: 400, color: T.muted, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, pad = 20, raised, style, ...props }) {
  return <div {...props} style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: T.r.lg, padding: pad, boxShadow: raised ? T.shadow.lg : T.shadow.md, ...style }}>{children}</div>
}

// ── Label / Field / Input ───────────────────────────────────────────────────────
export function Label({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase', ...style }}>{children}</div>
}
export function Field({ label, children, style }) {
  return <div style={style}><Label style={{ marginBottom: 8 }}>{label}</Label>{children}</div>
}
export function Input({ prefix, accent = T.pink, style, ...props }) {
  const [f, setF] = useState(false)
  const [h, setH] = useState(false)
  const lit = f || h // pink outline whenever interactive (hover or focus), the app-wide convention
  return <div style={{ position: 'relative' }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
    {prefix && <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: lit ? accent : T.faint, pointerEvents: 'none', transition: 'color .12s' }}>{prefix}</span>}
    <input {...props} onFocus={(e) => { setF(true); props.onFocus?.(e) }} onBlur={(e) => { setF(false); props.onBlur?.(e) }}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, padding: prefix ? '12px 13px 12px 25px' : '12px 13px', borderRadius: T.r.sm, border: `1px solid ${lit ? accent : '#E5E7EB'}`, outline: 'none', boxShadow: f ? T.ring(accent) : 'none', transition: 'border-color .12s, box-shadow .12s', ...style }} />
  </div>
}
// ── Select, native select with the same pink hover/focus convention + chevron ──
export function Select({ value, onChange, children, accent = T.pink, style, ...props }) {
  const [f, setF] = useState(false)
  const [h, setH] = useState(false)
  const lit = f || h
  return <div style={{ position: 'relative' }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
    <select value={value} onChange={onChange} {...props} onFocus={(e) => { setF(true); props.onFocus?.(e) }} onBlur={(e) => { setF(false); props.onBlur?.(e) }}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, padding: '12px 34px 12px 13px', borderRadius: T.r.sm, border: `1px solid ${lit ? accent : '#E5E7EB'}`, outline: 'none', background: '#fff', boxShadow: f ? T.ring(accent) : 'none', cursor: 'pointer', transition: 'border-color .12s, box-shadow .12s', ...style }}>
      {children}
    </select>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={lit ? accent : T.faint} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'stroke .12s' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
  </div>
}

// ── Button ──────────────────────────────────────────────────────────────────────
// Real interaction states (inline styles can't do :hover/:focus, so we track them).
// variants: primary | secondary | ghost | danger · shape: rounded | pill
// icon = leading node · arrow = trailing chevron affordance
export function Button({ variant = 'primary', size = 'md', shape = 'rounded', full, accent = T.pink, icon, arrow, children, style, ...props }) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [press, setPress] = useState(false)
  const disabled = props.disabled
  const sz = {
    sm: { fontSize: 12.5, padding: '8px 16px', gap: 6, icon: 15, minHeight: 40 },
    md: { fontSize: 13.5, padding: '10px 18px', gap: 8, icon: 16, minHeight: 44 },
    lg: { fontSize: 15, padding: '12px 24px', gap: 8, icon: 18, minHeight: 48 },
  }[size]
  const radius = shape === 'pill' ? T.r.pill : (size === 'lg' ? T.r.md : T.r.sm)

  // filled buttons carry a soft colour-matched shadow AT REST, lifting stronger on hover.
  // resting depth is what stops the large ones reading flat/bulky.
  const restLift = (hex) => `0 4px 12px ${hex}2E, 0 1px 2px ${hex}1F`
  const fill = (bg, fg, ring) => ({ background: bg, color: fg, border: 'none', boxShadow: disabled ? 'none' : (focus ? `${T.ring(ring)}, ${T.lift(ring)}` : (hover ? T.lift(ring) : restLift(ring))) })
  const outline = (fg) => ({ background: hover ? '#FAFAFB' : '#fff', color: fg, border: `1px solid ${focus ? accent : '#E5E7EB'}`, boxShadow: disabled ? 'none' : (focus ? T.ring(accent) : (hover ? T.shadow.md : T.shadow.sm)) })
  const vr = {
    primary: fill(accent, '#fff', accent),
    danger: fill(T.red, '#fff', T.red),
    secondary: { background: hover ? '#ECECEF' : '#F3F4F6', color: T.body, border: '1px solid #E5E7EB', boxShadow: disabled ? 'none' : (focus ? T.ring(accent) : (hover ? T.shadow.md : T.shadow.sm)) },
    ghost: outline(T.muted),
  }[variant]

  return <button {...props}
    onMouseEnter={(e) => { setHover(true); props.onMouseEnter?.(e) }}
    onMouseLeave={(e) => { setHover(false); setPress(false); props.onMouseLeave?.(e) }}
    onMouseDown={(e) => { setPress(true); props.onMouseDown?.(e) }}
    onMouseUp={(e) => { setPress(false); props.onMouseUp?.(e) }}
    onFocus={(e) => { setFocus(true); props.onFocus?.(e) }}
    onBlur={(e) => { setFocus(false); props.onBlur?.(e) }}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sz.gap,
      fontFamily: T.font, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', borderRadius: radius,
      cursor: disabled ? 'not-allowed' : 'pointer', width: full ? '100%' : undefined,
      opacity: disabled ? 0.5 : 1, transform: !disabled && press ? 'translateY(1px)' : (!disabled && hover ? 'translateY(-1px)' : 'none'),
      transition: 'transform .12s, box-shadow .15s, background .15s', outline: 'none',
      ...sz, padding: sz.padding, ...vr, ...style,
    }}>
    {icon && <span style={{ display: 'inline-flex', fontSize: sz.icon, marginLeft: -2 }}>{icon}</span>}
    {children}
    {arrow && <span style={{ display: 'inline-flex', fontSize: sz.icon, opacity: 0.8, marginRight: -2, transform: hover ? 'translateX(2px)' : 'none', transition: 'transform .15s' }}>›</span>}
  </button>
}

// ── Chip, borderless. Soft-grey at rest, accent tint on hover, SOLID accent when selected.
// Doubles as a one-click action (never active) or a selectable choice (active toggles).
export function Chip({ active = false, onClick, accent = T.pink, icon, children }) {
  const [h, setH] = useState(false)
  const look = active
    ? { background: accent, color: '#fff', boxShadow: `0 3px 9px ${accent}3A` }
    : h
      ? { background: accent + '16', color: accent, boxShadow: 'none' }
      : { background: '#F3F4F6', color: T.body, boxShadow: 'none' }
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.font, fontSize: 12, fontWeight: active ? 700 : 600, padding: '7px 13px', borderRadius: T.r.pill, cursor: 'pointer', border: 'none', transition: 'all .14s', ...look }}>
    {icon && <span style={{ fontSize: 13, display: 'inline-flex' }}>{icon}</span>}{children}
  </button>
}

// ── Switch ──────────────────────────────────────────────────────────────────────
export function Switch({ on, onChange, accent = T.pink, size = 1 }) {
  const w = 44 * size, h = 26 * size
  return <button onClick={() => onChange?.(!on)} style={{ position: 'relative', width: w, height: h, borderRadius: 99, border: 'none', background: on ? accent : '#E5E7EB', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 3 * size, left: on ? w - h + 3 * size : 3 * size, width: h - 6 * size, height: h - 6 * size, borderRadius: 99, background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </button>
}

// ── Stepper, type-able count/number. Same pink hover/focus convention as Input;
//    rounded, separated buttons, suffix as a sibling. `full` fills the parent width.
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix = '', unit, full = false, accent = T.pink }) {
  const sfx = suffix || unit || ''
  const [text, setText] = useState(String(value ?? 0))
  const [focused, setFocused] = useState(false)
  const [hover, setHover] = useState(false)
  const inputRef = useRef(null)
  useEffect(() => { setText(String(value ?? 0)) }, [value])
  const clamp = (n) => Math.max(min, Math.min(max, n))
  const commit = (raw) => { let n = parseFloat(raw); if (isNaN(n)) n = min; n = clamp(n); onChange(n); setText(String(n)) }
  const nudge = (d) => { const n = clamp((parseFloat(text) || 0) + d); onChange(n); setText(String(n)) }
  const btn = { width: 40, height: 44, border: '1px solid #E5E7EB', borderRadius: T.r.sm, background: T.surface, cursor: 'pointer', fontSize: 18, color: T.muted, flexShrink: 0, fontFamily: T.font, transition: 'background .12s' }
  const lit = focused || hover
  const fieldShadow = focused ? `0 0 0 3px ${accent}33` : (hover ? `0 0 0 3px ${accent}1F` : 'inset 0 1px 2px rgba(17,24,39,.08)')
  return <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: full ? 'flex' : 'inline-flex', alignItems: 'center', gap: 6 }}>
    <button type="button" onClick={() => nudge(-step)} style={btn}>−</button>
    <div onMouseDown={(e) => { if (e.target !== inputRef.current) { e.preventDefault(); inputRef.current?.focus() } }}
      style={{ ...(full ? { flex: 1, minWidth: 0 } : { width: 72 }), display: 'flex', alignItems: 'center', height: 44, boxSizing: 'border-box', border: `1px solid ${lit ? accent : '#E5E7EB'}`, borderRadius: T.r.sm, background: '#fff', boxShadow: fieldShadow, cursor: 'text', transition: 'box-shadow .12s, border-color .12s' }}>
      <input ref={inputRef} type="text" inputMode="decimal" value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))}
        onFocus={(e) => { setFocused(true); e.target.select() }}
        onBlur={(e) => { setFocused(false); commit(e.target.value) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'ArrowUp') { e.preventDefault(); nudge(step) } if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-step) } }}
        style={{ flex: 1, minWidth: 0, width: '100%', height: '100%', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', fontFamily: T.font, fontSize: 14, fontWeight: 700, color: focused ? accent : T.ink, cursor: 'text', padding: sfx ? '0 0 0 12px' : 0 }} />
      {sfx && <span style={{ flexShrink: 0, paddingRight: 10, paddingLeft: 1, fontSize: 11.5, fontWeight: 600, color: lit ? accent : T.faint, pointerEvents: 'none', transition: 'color .12s' }}>{sfx}</span>}
    </div>
    <button type="button" onClick={() => nudge(step)} style={btn}>+</button>
  </div>
}

// ── Slider, single handle, for ranges like contracted hours. Drag or click the track.
export function Slider({ value, onChange, min = 0, max = 48, step = 1, accent = T.pink, suffix = '', format }) {
  const trackRef = useRef(null), drag = useRef(false)
  const span = max - min || 1
  const pct = (v) => Math.max(0, Math.min(100, ((v - min) / span) * 100))
  const at = (clientX) => { const r = trackRef.current.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width)); return Math.max(min, Math.min(max, Math.round((min + ratio * span) / step) * step)) }
  useEffect(() => {
    function move(e) { if (!drag.current || !trackRef.current) return; onChange(at(e.clientX)) }
    function up() { drag.current = false }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [onChange, min, max, step, span])
  const label = format ? format(value) : `${value}${suffix}`
  return <div style={{ userSelect: 'none' }}>
    <div style={{ fontFamily: T.font, fontSize: 22, fontWeight: 800, color: T.ink, marginBottom: 10 }}>{label}</div>
    <div ref={trackRef} onPointerDown={(e) => { drag.current = true; onChange(at(e.clientX)) }} style={{ position: 'relative', height: 22, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 8, transform: 'translateY(-50%)', background: T.track, borderRadius: 99 }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, width: `${pct(value)}%`, height: 8, transform: 'translateY(-50%)', background: `linear-gradient(90deg, ${accent}99, ${accent})`, borderRadius: 99 }} />
      <div style={{ position: 'absolute', top: '50%', left: `${pct(value)}%`, transform: 'translate(-50%,-50%)', width: 20, height: 20, borderRadius: 99, background: '#fff', border: `2px solid ${accent}`, boxShadow: T.shadow.md, cursor: 'grab', zIndex: 2 }} />
    </div>
  </div>
}

// ── Segmented control ─────────────────────────────────────────────────────────────
export function Segmented({ options, value, onChange, accent = T.pink, size = 'md' }) {
  const pad = size === 'sm' ? '4px 10px' : '6px 14px'
  const fs = size === 'sm' ? 11.5 : 12.5
  return <div style={{ display: 'inline-flex', background: '#F1F1F4', borderRadius: T.r.sm, padding: 3, gap: 2 }}>
    {options.map((o) => { const k = o.value ?? o, lbl = o.label ?? o, act = value === k
      return <button key={k} onClick={() => onChange(k)} style={{ fontFamily: T.font, fontSize: fs, fontWeight: 700, padding: pad, borderRadius: T.r.xs, border: 'none', cursor: 'pointer', background: act ? '#fff' : 'transparent', color: act ? accent : T.faint, boxShadow: act ? T.shadow.sm : 'none', transition: 'all .12s' }}>{lbl}</button>
    })}
  </div>
}

// ── Tag / Pill ────────────────────────────────────────────────────────────────────
export function Tag({ color = T.faint, soft = true, children }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: T.r.pill, letterSpacing: 0.3, background: soft ? color + '18' : color, color: soft ? color : '#fff' }}>{children}</span>
}
export function Dot({ color = T.pink, size = 9 }) {
  return <span style={{ width: size, height: size, borderRadius: 99, background: color, flexShrink: 0, display: 'inline-block' }} />
}

// ── Avatar (initials) ───────────────────────────────────────────────────────────
export function Avatar({ name, color = T.pink, size = 38 }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return <div style={{ width: size, height: size, borderRadius: 99, flexShrink: 0, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 800 }}>{initials}</div>
}

// ── Progress bars ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, height = 4, color = T.pink, radius = 0 }) {
  return <div style={{ width: '100%', height, background: T.track, borderRadius: radius, overflow: 'hidden' }}>
    <div style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: radius, transition: 'width .3s' }} />
  </div>
}

// ── Day picker (Mon–Sun pills + presets; closed days disabled) ─────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ALLD = [0, 1, 2, 3, 4, 5, 6], WK = [0, 1, 2, 3, 4], WE = [5, 6]
const norm = (a) => [...a].sort((x, y) => x - y).join(',')
export function DayPicker({ days, onChange, openDays = ALLD, accent = T.pink }) {
  const preset = (() => { const s = norm(days); if (s === norm(openDays)) return 'all'; if (s === norm(WK.filter((d) => openDays.includes(d)))) return 'wk'; if (s === norm(WE.filter((d) => openDays.includes(d)))) return 'we'; return null })()
  const toggle = (i) => { if (!openDays.includes(i)) return; onChange(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b)) }
  const pb = (label, set, key) => { const sel = preset === key
    return <button onClick={() => onChange(set.filter((d) => openDays.includes(d)))} style={{ fontFamily: T.font, fontSize: 11.5, fontWeight: sel ? 700 : 600, padding: '7px 13px', borderRadius: T.r.pill, cursor: 'pointer', border: 'none', boxShadow: sel ? `0 3px 9px ${accent}3A` : 'none', background: sel ? accent : '#F3F4F6', color: sel ? '#fff' : T.body, transition: 'all .14s' }}>{label}</button> }
  return <div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{pb('All', ALLD, 'all')}{pb('Weekdays', WK, 'wk')}{pb('Weekend', WE, 'we')}</div>
    <div style={{ display: 'flex', gap: 5 }}>
      {DAYS.map((d, i) => { const closed = !openDays.includes(i), on = days.includes(i)
        return <button key={i} onClick={() => toggle(i)} disabled={closed} style={{ flex: 1, fontFamily: T.font, fontSize: 12, fontWeight: on ? 700 : 600, padding: '10px 0', borderRadius: T.r.sm, cursor: closed ? 'not-allowed' : 'pointer', border: 'none', boxShadow: on ? `0 3px 9px ${accent}33` : 'none', background: on ? accent : closed ? '#F4F4F6' : '#F3F4F6', color: on ? '#fff' : closed ? '#C9C9CE' : T.body, textDecoration: closed ? 'line-through' : 'none', transition: 'all .12s' }}>{d}</button>
      })}
    </div>
  </div>
}

// ── Time range (dual-handle slider) ───────────────────────────────────────────────
const fmt = (h) => { if (!Number.isFinite(h)) return '·'; const hr = Math.floor(h), m = Math.round((h - hr) * 60); const ap = hr < 12 || hr === 24 ? 'am' : 'pm'; let hh = hr % 12; if (hh === 0) hh = 12; return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}` }
export function TimeRange({ start, end, onChange, accent = T.pink, domain = [6, 22], labels = true }) {
  const trackRef = useRef(null), drag = useRef(null)
  const [dS, dE] = domain, span = dE - dS
  const pct = (v) => ((v - dS) / span) * 100
  useEffect(() => {
    function move(e) { if (!drag.current || !trackRef.current) return; const r = trackRef.current.getBoundingClientRect(); let ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); let t = Math.round((dS + ratio * span) * 4) / 4; if (drag.current === 'start') onChange(Math.min(t, end - 0.5), end); else onChange(start, Math.max(t, start + 0.5)) }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [start, end, onChange, dS, span])
  const handle = (which, v) => <div onPointerDown={() => (drag.current = which)} style={{ position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: 99, background: '#fff', border: `2px solid ${accent}`, boxShadow: '0 1px 4px rgba(0,0,0,.18)', cursor: 'grab', touchAction: 'none', zIndex: 2 }} />
  return <div style={{ userSelect: 'none' }}>
    {labels && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.ink }}>{fmt(start)}</span><span style={{ fontFamily: T.font, fontSize: 12, color: T.faint, alignSelf: 'center' }}>{end - start}h</span><span style={{ fontFamily: T.font, fontSize: 15, fontWeight: 700, color: T.ink }}>{fmt(end)}</span></div>}
    <div ref={trackRef} style={{ position: 'relative', height: 20 }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', background: T.track, borderRadius: 99 }} />
      <div style={{ position: 'absolute', top: '50%', left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%`, height: 6, transform: 'translateY(-50%)', background: `linear-gradient(90deg, ${accent}99, ${accent})`, borderRadius: 99 }} />
      {handle('start', start)}{handle('end', end)}
    </div>
  </div>
}

export const fmtTime = fmt
