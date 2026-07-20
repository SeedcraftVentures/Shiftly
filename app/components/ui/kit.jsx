'use client'

import { useState, useRef, useEffect, createContext, useContext, useMemo, useCallback } from 'react'

// ════════════════════════════════════════════════════════════════════════════
//  SHIFTLY UI KIT, the single source of truth for shared components + tokens.
//  Import these everywhere instead of re-styling. Iterate here, it updates app-wide.
//
//  THEMING: `T` is now theme-aware. Components self-theme via useTheme() internally,
//  so a page only needs `const { T } = useTheme()` to theme its own inline styles.
//  The colour math the app relies on (accent + '18', `${hex}99`, T.lift/ring) is
//  preserved because tokens stay real hex/rgba strings, resolved per theme.
// ════════════════════════════════════════════════════════════════════════════

// ── scale tokens (shared across themes, type, spacing, shape) ─────────────────
const SCALE = {
  font: "'Cal Sans Text', 'Plus Jakarta Sans', sans-serif",
  fontHead: "'Cal Sans Text', 'Plus Jakarta Sans', sans-serif",
  fz: { display: 39, h1: 31, h2: 25, h3: 20, body: 16, small: 13 },
  lh: { tight: 1.15, snug: 1.3, normal: 1.5 },
  space: { xs: 4, sm: 8, snug: 12, md: 16, lg: 24, xl: 32, xxl: 48, huge: 64 },
  r: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  lift: (hex) => `0 8px 18px ${hex}40, 0 2px 5px ${hex}26`,
  ring: (hex) => `0 0 0 3px ${hex}33`,
}

// Gentle apple-ish spring-out easing, used for hover/press transitions.
export const EASE = 'cubic-bezier(.22,.61,.36,1)'

// ── light theme (Apple-esque: soft gradient canvas, frosted cards, system colours) ──
const LIGHT = {
  ...SCALE, name: 'light',
  pink: '#FF1F7D', amber: '#F59E0B', green: '#30B458', red: '#FF3B30',
  ink: '#1D1D1F', body: '#3A3A3C', muted: '#86868B', faint: '#AEAEB2',
  line: 'rgba(0,0,0,0.08)', hair: 'rgba(0,0,0,0.06)', track: 'rgba(0,0,0,0.09)', surface: '#FAFAFB',
  card: 'rgba(255,255,255,0.72)', cardSolid: '#FFFFFF', appBg: 'radial-gradient(120% 120% at 50% 0%, #FEFEFF 0%, #F4F4F7 60%, #EEEEF2 100%)', frame: '#FF1F7D',
  border: 'rgba(0,0,0,0.10)', subtle: 'rgba(0,0,0,0.04)', subtleHover: 'rgba(0,0,0,0.07)', segBg: 'rgba(0,0,0,0.05)',
  knob: '#FFFFFF', tooltipBg: '#1D1D1F', tooltipFg: '#FFFFFF', closed: '#C9C9CE', hover: 'rgba(0,0,0,0.03)', fieldBg: '#FFFFFF',
  warnInk: '#92660B', blur: 'blur(24px) saturate(180%)',
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,.04)',
    md: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px -10px rgba(0,0,0,.10)',
    lg: '0 2px 4px rgba(0,0,0,.05), 0 14px 34px -10px rgba(0,0,0,.14), 0 24px 48px -18px rgba(0,0,0,.10)',
    pop: '0 14px 36px rgba(0,0,0,.16)',
  },
  shadowHover: '0 2px 6px rgba(0,0,0,.06), 0 18px 40px -12px rgba(0,0,0,.18)',
}

// ── dark theme (near-black chrome, brighter accents, soft depth) ──────────────
const DARK = {
  ...SCALE, name: 'dark',
  pink: '#FF3D93', amber: '#FF9F0A', green: '#30D158', red: '#FF453A',
  ink: '#F5F5F7', body: '#D9D9DE', muted: '#98989D', faint: '#68686E',
  line: 'rgba(255,255,255,0.10)', hair: 'rgba(255,255,255,0.07)', track: 'rgba(255,255,255,0.13)', surface: '#232326',
  card: 'rgba(28,28,30,0.60)', cardSolid: '#1C1C1E', appBg: 'radial-gradient(120% 120% at 50% 0%, #1A1A1C 0%, #0E0E10 60%, #050506 100%)', frame: '#0A0A0B',
  border: 'rgba(255,255,255,0.14)', subtle: 'rgba(255,255,255,0.06)', subtleHover: 'rgba(255,255,255,0.11)', segBg: 'rgba(255,255,255,0.06)',
  knob: '#FFFFFF', tooltipBg: '#2C2C2E', tooltipFg: '#F5F5F7', closed: '#5A5A5F', hover: 'rgba(255,255,255,0.04)', fieldBg: 'rgba(255,255,255,0.06)',
  warnInk: '#F5B944', blur: 'blur(24px) saturate(180%)',
  // Dark elevation: drop shadows barely show on a dark canvas, so depth comes from a
  // top inner highlight (a rim of light on the card's top edge) + a soft ambient shadow.
  shadow: {
    sm: 'inset 0 1px 0 rgba(255,255,255,.05), 0 1px 2px rgba(0,0,0,.6)',
    md: 'inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.5), 0 10px 26px -10px rgba(0,0,0,.6)',
    lg: 'inset 0 1px 0 rgba(255,255,255,.08), 0 2px 6px rgba(0,0,0,.5), 0 18px 42px -12px rgba(0,0,0,.72)',
    pop: 'inset 0 1px 0 rgba(255,255,255,.08), 0 18px 44px rgba(0,0,0,.72)',
  },
  shadowHover: 'inset 0 1px 0 rgba(255,255,255,.10), 0 2px 8px rgba(0,0,0,.5), 0 24px 52px -12px rgba(0,0,0,.78)',
}

export const THEMES = { light: LIGHT, dark: DARK }

// Backwards-compatible module-scope token export: unmigrated pages that
// `import { T }` keep rendering in the light theme until they adopt useTheme().
export const T = LIGHT

// ── theme context + provider ──────────────────────────────────────────────────
const KEY = 'shiftly_theme'
const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, T: LIGHT })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light')
  // read persisted choice after mount (the no-flash <script> in the root layout
  // sets data-theme pre-paint; this syncs React state to it)
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY) || document.documentElement.getAttribute('data-theme')
      if (s === 'dark' || s === 'light') setThemeState(s)
    } catch {}
    const onStorage = (e) => { if (e.key === KEY && (e.newValue === 'dark' || e.newValue === 'light')) setThemeState(e.newValue) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  useEffect(() => { try { document.documentElement.setAttribute('data-theme', theme) } catch {} }, [theme])
  const setTheme = useCallback((t) => {
    setThemeState(t)
    try { localStorage.setItem(KEY, t) } catch {}
    try { document.documentElement.setAttribute('data-theme', t) } catch {}
  }, [])
  const value = useMemo(() => ({ theme, setTheme, T: THEMES[theme] }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }

// ── Tip (hover tooltip) ─────────────────────────────────────────────────────────
export function Tip({ text, children, on = true, style }) {
  const { T } = useTheme()
  const [show, setShow] = useState(false)
  if (!on || !text) return children
  return <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ position: 'relative', display: 'inline-flex', ...style }}>
    {children}
    {show && <span style={{ position: 'absolute', bottom: 'calc(100% + 9px)', left: '50%', transform: 'translateX(-50%)', background: T.tooltipBg, color: T.tooltipFg, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, padding: '7px 10px', borderRadius: 8, width: 'max-content', maxWidth: 230, textAlign: 'center', zIndex: 80, boxShadow: '0 6px 18px rgba(0,0,0,.22)', pointerEvents: 'none' }}>{text}<span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '5px 5px 0', borderStyle: 'solid', borderColor: `${T.tooltipBg} transparent transparent` }} /></span>}
  </span>
}

// ── Page shell + header ─────────────────────────────────────────────────────────
export const PAGE = { maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px' }
export function PageShell({ children, style }) {
  const { T } = useTheme()
  return <div style={{ fontFamily: T.font, ...PAGE, ...style }}>{children}</div>
}
export function PageHeader({ title, subtitle, actions, style }) {
  const { T } = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24, ...style }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: T.fontHead, fontSize: 30, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{title}</h1>
        {subtitle != null && <p style={{ fontFamily: T.font, fontSize: 15.5, fontWeight: 400, color: T.muted, margin: '6px 0 0', letterSpacing: '-0.01em' }}>{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

// ── Card, frosted glass surface (translucent + backdrop blur), soft rounded. ──
// `solid` uses an opaque surface (no blur), use it for cards holding tables with
// a sticky/frozen column, so the frozen column blends seamlessly with the card.
export function Card({ children, pad = 20, raised, interactive, solid, radius = 22, style, ...props }) {
  const { T } = useTheme()
  const [h, setH] = useState(false)
  const blur = solid ? undefined : T.blur
  return <div {...props}
    onMouseEnter={(e) => { if (interactive) setH(true); props.onMouseEnter?.(e) }}
    onMouseLeave={(e) => { if (interactive) setH(false); props.onMouseLeave?.(e) }}
    style={{ background: solid ? T.cardSolid : T.card, WebkitBackdropFilter: blur, backdropFilter: blur, border: `1px solid ${T.border}`, borderRadius: radius, padding: pad, boxShadow: h ? T.shadowHover : (raised ? T.shadow.lg : T.shadow.md), transform: interactive && h ? 'translateY(-3px)' : 'none', transition: interactive ? `transform .4s ${EASE}, box-shadow .4s ${EASE}, border-color .3s ${EASE}` : undefined, cursor: interactive ? 'pointer' : undefined, ...style }}>{children}</div>
}

// ── Label / Field / Input ───────────────────────────────────────────────────────
export function Label({ children, style }) {
  const { T } = useTheme()
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: 'uppercase', ...style }}>{children}</div>
}
export function Field({ label, children, style }) {
  return <div style={style}><Label style={{ marginBottom: 8 }}>{label}</Label>{children}</div>
}
export function Input({ prefix, accent, style, ...props }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const [f, setF] = useState(false)
  const [h, setH] = useState(false)
  const lit = f || h // pink outline whenever interactive (hover or focus), the app-wide convention
  return <div style={{ position: 'relative' }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
    {prefix && <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: lit ? accent : T.faint, pointerEvents: 'none', transition: 'color .12s' }}>{prefix}</span>}
    <input {...props} onFocus={(e) => { setF(true); props.onFocus?.(e) }} onBlur={(e) => { setF(false); props.onBlur?.(e) }}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, background: T.card, padding: prefix ? '12px 13px 12px 25px' : '12px 13px', borderRadius: T.r.sm, border: `1px solid ${lit ? accent : T.border}`, outline: 'none', boxShadow: f ? T.ring(accent) : 'none', transition: 'border-color .12s, box-shadow .12s', ...style }} />
  </div>
}
// ── Select, native select with the same pink hover/focus convention + chevron ──
export function Select({ value, onChange, children, accent, style, ...props }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const [f, setF] = useState(false)
  const [h, setH] = useState(false)
  const lit = f || h
  return <div style={{ position: 'relative' }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
    <select value={value} onChange={onChange} {...props} onFocus={(e) => { setF(true); props.onFocus?.(e) }} onBlur={(e) => { setF(false); props.onBlur?.(e) }}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', fontFamily: T.font, fontSize: 14, fontWeight: 600, color: T.ink, padding: '12px 34px 12px 13px', borderRadius: T.r.sm, border: `1px solid ${lit ? accent : T.border}`, outline: 'none', background: T.card, boxShadow: f ? T.ring(accent) : 'none', cursor: 'pointer', transition: 'border-color .12s, box-shadow .12s', ...style }}>
      {children}
    </select>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={lit ? accent : T.faint} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'stroke .12s' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
  </div>
}

// ── Button ──────────────────────────────────────────────────────────────────────
// variants: primary | secondary | ghost | danger · shape: rounded | pill
export function Button({ variant = 'primary', size = 'md', shape = 'pill', full, accent, icon, arrow, children, style, ...props }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [press, setPress] = useState(false)
  const disabled = props.disabled
  const sz = {
    sm: { fontSize: 12.5, padding: '8px 16px', gap: 6, icon: 15, minHeight: 40 },
    md: { fontSize: 13.5, padding: '10px 18px', gap: 8, icon: 16, minHeight: 44 },
    lg: { fontSize: 15, padding: '12px 24px', gap: 8, icon: 18, minHeight: 48 },
  }[size]
  const radius = shape === 'pill' ? T.r.pill : T.r.md
  const restLift = (hex) => `0 4px 12px ${hex}2E, 0 1px 2px ${hex}1F`
  const fill = (bg, fg, ring) => ({ background: bg, color: fg, border: 'none', boxShadow: disabled ? 'none' : (focus ? `${T.ring(ring)}, ${T.lift(ring)}` : (hover ? T.lift(ring) : restLift(ring))) })
  const outline = (fg) => ({ background: hover ? T.surface : T.card, color: fg, border: `1px solid ${focus ? accent : T.border}`, boxShadow: disabled ? 'none' : (focus ? T.ring(accent) : (hover ? T.shadow.md : T.shadow.sm)) })
  const vr = {
    primary: fill(accent, '#fff', accent),
    danger: fill(T.red, '#fff', T.red),
    secondary: { background: hover ? T.subtleHover : T.subtle, color: T.body, border: `1px solid ${T.border}`, boxShadow: disabled ? 'none' : (focus ? T.ring(accent) : (hover ? T.shadow.md : T.shadow.sm)) },
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
      opacity: disabled ? 0.5 : 1, transform: !disabled && press ? 'scale(0.97)' : (!disabled && hover ? 'scale(1.03)' : 'scale(1)'),
      transition: `transform .3s ${EASE}, box-shadow .15s, background .15s`, outline: 'none',
      ...sz, padding: sz.padding, ...vr, ...style,
    }}>
    {icon && <span style={{ display: 'inline-flex', fontSize: sz.icon, marginLeft: -2 }}>{icon}</span>}
    {children}
    {arrow && <span style={{ display: 'inline-flex', fontSize: sz.icon, opacity: 0.8, marginRight: -2, transform: hover ? 'translateX(2px)' : 'none', transition: 'transform .15s' }}>›</span>}
  </button>
}

// ── Chip ──────────────────────────────────────────────────────────────────────
export function Chip({ active = false, onClick, accent, icon, children }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const [h, setH] = useState(false)
  const look = active
    ? { background: accent, color: '#fff', boxShadow: `0 3px 9px ${accent}3A` }
    : h
      ? { background: accent + '16', color: accent, boxShadow: 'none' }
      : { background: T.subtle, color: T.body, boxShadow: 'none' }
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.font, fontSize: 12, fontWeight: active ? 700 : 600, padding: '7px 13px', borderRadius: T.r.pill, cursor: 'pointer', border: 'none', transition: 'all .14s', ...look }}>
    {icon && <span style={{ fontSize: 13, display: 'inline-flex' }}>{icon}</span>}{children}
  </button>
}

// ── Switch ──────────────────────────────────────────────────────────────────────
export function Switch({ on, onChange, accent, size = 1 }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const w = 44 * size, h = 26 * size
  return <button onClick={() => onChange?.(!on)} style={{ position: 'relative', width: w, height: h, borderRadius: 99, border: 'none', background: on ? accent : T.track, cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
    <span style={{ position: 'absolute', top: 3 * size, left: on ? w - h + 3 * size : 3 * size, width: h - 6 * size, height: h - 6 * size, borderRadius: 99, background: T.knob, transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </button>
}

// ── Stepper ──────────────────────────────────────────────────────────────────────
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, suffix = '', unit, full = false, accent }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const sfx = suffix || unit || ''
  const [text, setText] = useState(String(value ?? 0))
  const [focused, setFocused] = useState(false)
  const [hover, setHover] = useState(false)
  const inputRef = useRef(null)
  useEffect(() => { setText(String(value ?? 0)) }, [value])
  const clamp = (n) => Math.max(min, Math.min(max, n))
  const commit = (raw) => { let n = parseFloat(raw); if (isNaN(n)) n = min; n = clamp(n); onChange(n); setText(String(n)) }
  const nudge = (d) => { const n = clamp((parseFloat(text) || 0) + d); onChange(n); setText(String(n)) }
  const btn = { width: 40, height: 44, border: `1px solid ${T.border}`, borderRadius: T.r.sm, background: T.surface, cursor: 'pointer', fontSize: 18, color: T.muted, flexShrink: 0, fontFamily: T.font, transition: 'background .12s' }
  const lit = focused || hover
  const fieldShadow = focused ? `0 0 0 3px ${accent}33` : (hover ? `0 0 0 3px ${accent}1F` : 'inset 0 1px 2px rgba(17,24,39,.08)')
  return <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: full ? 'flex' : 'inline-flex', alignItems: 'center', gap: 6 }}>
    <button type="button" onClick={() => nudge(-step)} style={btn}>−</button>
    <div onMouseDown={(e) => { if (e.target !== inputRef.current) { e.preventDefault(); inputRef.current?.focus() } }}
      style={{ ...(full ? { flex: 1, minWidth: 0 } : { width: 72 }), display: 'flex', alignItems: 'center', height: 44, boxSizing: 'border-box', border: `1px solid ${lit ? accent : T.border}`, borderRadius: T.r.sm, background: T.card, boxShadow: fieldShadow, cursor: 'text', transition: 'box-shadow .12s, border-color .12s' }}>
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

// ── Slider ──────────────────────────────────────────────────────────────────────
export function Slider({ value, onChange, min = 0, max = 48, step = 1, accent, suffix = '', format }) {
  const { T } = useTheme()
  accent = accent || T.pink
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
      <div style={{ position: 'absolute', top: '50%', left: `${pct(value)}%`, transform: 'translate(-50%,-50%)', width: 20, height: 20, borderRadius: 99, background: T.knob, border: `2px solid ${accent}`, boxShadow: T.shadow.md, cursor: 'grab', zIndex: 2 }} />
    </div>
  </div>
}

// ── Segmented control ─────────────────────────────────────────────────────────────
export function Segmented({ options, value, onChange, accent, size = 'md', full }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const pad = size === 'sm' ? '4px 10px' : '7px 14px'
  const fs = size === 'sm' ? 11.5 : 12.5
  return <div style={{ display: full ? 'flex' : 'inline-flex', width: full ? '100%' : undefined, background: T.segBg, borderRadius: T.r.md, padding: 3, gap: 2 }}>
    {options.map((o) => { const k = o.value ?? o, lbl = o.label ?? o, act = value === k
      return <button key={k} onClick={() => onChange(k)} style={{ flex: full ? 1 : undefined, fontFamily: T.font, fontSize: fs, fontWeight: 700, padding: pad, borderRadius: T.r.sm, border: 'none', cursor: 'pointer', background: act ? T.card : 'transparent', color: act ? accent : T.faint, boxShadow: act ? T.shadow.sm : 'none', transition: 'all .12s' }}>{lbl}</button>
    })}
  </div>
}

// ── Tag / Dot ───────────────────────────────────────────────────────────────────
export function Tag({ color, soft = true, children }) {
  const { T } = useTheme()
  color = color || T.faint
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: T.r.pill, letterSpacing: 0.3, background: soft ? color + '18' : color, color: soft ? color : '#fff' }}>{children}</span>
}
export function Dot({ color, size = 9 }) {
  const { T } = useTheme()
  return <span style={{ width: size, height: size, borderRadius: 99, background: color || T.pink, flexShrink: 0, display: 'inline-block' }} />
}

// ── Avatar (initials) ───────────────────────────────────────────────────────────
export function Avatar({ name, color, size = 38 }) {
  const { T } = useTheme()
  color = color || T.pink
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return <div style={{ width: size, height: size, borderRadius: 99, flexShrink: 0, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 800 }}>{initials}</div>
}

// ── Progress bars ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, height = 4, color, radius = 0 }) {
  const { T } = useTheme()
  color = color || T.pink
  return <div style={{ width: '100%', height, background: T.track, borderRadius: radius, overflow: 'hidden' }}>
    <div style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: radius, transition: 'width .3s' }} />
  </div>
}

// ── Ring, activity-style donut with a centred percentage. Animates on mount. ──
export function Ring({ value, color, size = 128, stroke = 13, label, track }) {
  const { T } = useTheme()
  color = color || T.pink
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [v, setV] = useState(0)
  useEffect(() => { const t = setTimeout(() => setV(value), 120); return () => clearTimeout(t) }, [value])
  return <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || T.track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: `stroke-dashoffset 1.1s ${EASE}` }} />
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size * 0.27, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(value * 100)}<span style={{ fontSize: size * 0.14, color: T.muted }}>%</span></span>
      {label && <span style={{ fontSize: 11, color: T.faint, marginTop: 3, fontWeight: 600 }}>{label}</span>}
    </div>
  </div>
}

// ── Pill, status chip with a leading dot (softer sibling of Tag). ──
export function Pill({ color, children }) {
  const { T } = useTheme()
  color = color || T.faint
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color, background: color + '1A', padding: '4px 11px', borderRadius: 999, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
    <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />{children}
  </span>
}

// ── Icons, SF-symbol-ish line paths + a tiny renderer. ──
export const Ic = {
  shifts: 'M8 7V3m8 4V3M4 11h16M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  staff: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4 0m8 0a4 4 0 10-2-3.46',
  rules: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  requests: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1',
  key: 'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 13l4 4L19 7',
}
export function Icon({ path, size = 20, stroke = 1.7, color = 'currentColor', style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', ...style }}><path d={path} /></svg>
}

// ── Day picker ─────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ALLD = [0, 1, 2, 3, 4, 5, 6], WK = [0, 1, 2, 3, 4], WE = [5, 6]
const norm = (a) => [...a].sort((x, y) => x - y).join(',')
export function DayPicker({ days, onChange, openDays = ALLD, accent }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const preset = (() => { const s = norm(days); if (s === norm(openDays)) return 'all'; if (s === norm(WK.filter((d) => openDays.includes(d)))) return 'wk'; if (s === norm(WE.filter((d) => openDays.includes(d)))) return 'we'; return null })()
  const toggle = (i) => { if (!openDays.includes(i)) return; onChange(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b)) }
  const pb = (label, set, key) => { const sel = preset === key
    return <button onClick={() => onChange(set.filter((d) => openDays.includes(d)))} style={{ fontFamily: T.font, fontSize: 11.5, fontWeight: sel ? 700 : 600, padding: '7px 13px', borderRadius: T.r.pill, cursor: 'pointer', border: 'none', boxShadow: sel ? `0 3px 9px ${accent}3A` : 'none', background: sel ? accent : T.subtle, color: sel ? '#fff' : T.body, transition: 'all .14s' }}>{label}</button> }
  return <div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{pb('All', ALLD, 'all')}{pb('Weekdays', WK, 'wk')}{pb('Weekend', WE, 'we')}</div>
    <div style={{ display: 'flex', gap: 5 }}>
      {DAYS.map((d, i) => { const closed = !openDays.includes(i), on = days.includes(i)
        return <button key={i} onClick={() => toggle(i)} disabled={closed} style={{ flex: 1, fontFamily: T.font, fontSize: 12, fontWeight: on ? 700 : 600, padding: '10px 0', borderRadius: T.r.sm, cursor: closed ? 'not-allowed' : 'pointer', border: 'none', boxShadow: on ? `0 3px 9px ${accent}33` : 'none', background: on ? accent : closed ? T.hair : T.subtle, color: on ? '#fff' : closed ? T.closed : T.body, textDecoration: closed ? 'line-through' : 'none', transition: 'all .12s' }}>{d}</button>
      })}
    </div>
  </div>
}

// ── Time range (dual-handle slider) ───────────────────────────────────────────────
const fmt = (h) => { if (!Number.isFinite(h)) return '·'; const hr = Math.floor(h), m = Math.round((h - hr) * 60); const ap = hr < 12 || hr === 24 ? 'am' : 'pm'; let hh = hr % 12; if (hh === 0) hh = 12; return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}` }
export function TimeRange({ start, end, onChange, accent, domain = [6, 22], labels = true }) {
  const { T } = useTheme()
  accent = accent || T.pink
  const trackRef = useRef(null), drag = useRef(null)
  const [dS, dE] = domain, span = dE - dS
  const pct = (v) => ((v - dS) / span) * 100
  useEffect(() => {
    function move(e) { if (!drag.current || !trackRef.current) return; const r = trackRef.current.getBoundingClientRect(); let ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); let t = Math.round((dS + ratio * span) * 4) / 4; if (drag.current === 'start') onChange(Math.min(t, end - 0.5), end); else onChange(start, Math.max(t, start + 0.5)) }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [start, end, onChange, dS, span])
  const handle = (which, v) => <div onPointerDown={() => (drag.current = which)} style={{ position: 'absolute', top: '50%', left: `${pct(v)}%`, transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: 99, background: T.knob, border: `2px solid ${accent}`, boxShadow: '0 1px 4px rgba(0,0,0,.18)', cursor: 'grab', touchAction: 'none', zIndex: 2 }} />
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
