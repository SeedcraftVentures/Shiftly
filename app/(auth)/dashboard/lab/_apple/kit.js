'use client'

// ════════════════════════════════════════════════════════════════════════════
//  APPLE-ESQUE LAB KIT — shared theme + primitives for the UX sandboxes.
//  Every /dashboard/lab/* page imports from here so the exploration stays
//  consistent. This is the staging ground for what we later fold into the real
//  design system (app/components/ui/kit.jsx) + dark mode.
//  `_apple` is a private folder (leading underscore) → Next never routes it.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'

export const PINK = '#FF1F7D'
export const FONT = "'Cal Sans Text', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
export const EASE = 'cubic-bezier(.22,.61,.36,1)' // gentle apple-ish spring-out

// ── themes ────────────────────────────────────────────────────────────────────
export const THEMES = {
  light: {
    name: 'light',
    appBg: 'radial-gradient(120% 120% at 50% 0%, #FEFEFF 0%, #F4F4F7 60%, #EEEEF2 100%)',
    card: 'rgba(255,255,255,0.66)',
    cardSolid: 'rgba(255,255,255,0.92)',
    inset: 'rgba(0,0,0,0.03)',
    border: 'rgba(0,0,0,0.07)',
    hair: 'rgba(0,0,0,0.06)',
    track: 'rgba(0,0,0,0.08)',
    ink: '#1D1D1F',
    body: '#3A3A3C',
    muted: '#86868B',
    faint: '#AEAEB2',
    shadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.10), 0 24px 48px -16px rgba(0,0,0,0.08)',
    shadowHover: '0 2px 4px rgba(0,0,0,0.05), 0 14px 34px -8px rgba(0,0,0,0.16), 0 30px 60px -18px rgba(0,0,0,0.12)',
    pink: PINK, green: '#30B458', amber: '#F59E0B', red: '#FF3B30',
    toggleBg: 'rgba(0,0,0,0.05)', toggleKnob: '#FFFFFF',
    hover: 'rgba(0,0,0,0.02)',
    fieldBg: '#FFFFFF',
  },
  dark: {
    name: 'dark',
    appBg: 'radial-gradient(120% 120% at 50% 0%, #1A1A1C 0%, #0E0E10 60%, #050506 100%)',
    card: 'rgba(28,28,30,0.60)',
    cardSolid: 'rgba(38,38,41,0.90)',
    inset: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.09)',
    hair: 'rgba(255,255,255,0.07)',
    track: 'rgba(255,255,255,0.10)',
    ink: '#F5F5F7',
    body: '#D9D9DE',
    muted: '#98989D',
    faint: '#68686E',
    shadow: '0 1px 2px rgba(0,0,0,0.4), 0 12px 32px -10px rgba(0,0,0,0.6)',
    shadowHover: '0 2px 6px rgba(0,0,0,0.5), 0 18px 44px -10px rgba(0,0,0,0.7)',
    pink: '#FF3D93', green: '#30D158', amber: '#FF9F0A', red: '#FF453A',
    toggleBg: 'rgba(255,255,255,0.08)', toggleKnob: '#48484A',
    hover: 'rgba(255,255,255,0.04)',
    fieldBg: 'rgba(255,255,255,0.06)',
  },
}

// ── global persisted theme ──────────────────────────────────────────────────────
// One choice, shared across every lab page + browser tab. This mirrors the real
// intent: the dark-mode switch will live in Settings and re-theme the whole app.
const KEY = 'shiftly_lab_theme'
const EVT = 'shiftly-lab-theme-change'

export function useTheme() {
  const [theme, setThemeState] = useState('light')
  // load persisted choice after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s === 'light' || s === 'dark') setThemeState(s) } catch {}
    const onChange = (e) => setThemeState(e.detail || (localStorage.getItem(KEY) || 'light'))
    const onStorage = (e) => { if (e.key === KEY && e.newValue) setThemeState(e.newValue) }
    window.addEventListener(EVT, onChange)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener(EVT, onChange); window.removeEventListener('storage', onStorage) }
  }, [])
  const setTheme = useCallback((t) => {
    setThemeState(t)
    try { localStorage.setItem(KEY, t) } catch {}
    window.dispatchEvent(new CustomEvent(EVT, { detail: t }))
  }, [])
  return { theme, setTheme, T: THEMES[theme] }
}

// ── icons (SF-symbol-ish line paths) ────────────────────────────────────────────
export const Ic = {
  shifts: 'M8 7V3m8 4V3M4 11h16M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  staff: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4 0m8 0a4 4 0 10-2-3.46',
  rules: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  requests: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1',
  key: 'M8 15a5 5 0 105-5m0 0L21 2m-5 5 3 3',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  trash: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  check: 'M5 13l4 4L19 7',
  clock: 'M12 8v4l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 11-4 0v-.09A1.65 1.65 0 007 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 14H4.5a2 2 0 110-4h.09A1.65 1.65 0 006 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 0010 4.6h.09A1.65 1.65 0 0012 3a2 2 0 014 0v.09a1.65 1.65 0 001.17 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 10v.09A1.65 1.65 0 0021 12a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
}

export function Icon({ path, size = 20, stroke = 1.7, color = 'currentColor', style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', ...style }}><path d={path} /></svg>
}

// ── primitives ────────────────────────────────────────────────────────────────
export function Card({ T, children, style, onClick, interactive, pad = 24 }) {
  const [h, setH] = useState(false)
  return (
    <div onClick={onClick}
      onMouseEnter={() => interactive && setH(true)} onMouseLeave={() => setH(false)}
      style={{
        position: 'relative', padding: pad, borderRadius: 24,
        background: T.card, WebkitBackdropFilter: 'blur(24px) saturate(180%)', backdropFilter: 'blur(24px) saturate(180%)',
        border: `1px solid ${T.border}`, boxShadow: h ? T.shadowHover : T.shadow,
        transform: h ? 'translateY(-3px)' : 'none',
        transition: `transform .4s ${EASE}, box-shadow .4s ${EASE}, border-color .3s ${EASE}`,
        cursor: interactive ? 'pointer' : 'default', ...style,
      }}>{children}</div>
  )
}

export function Ring({ T, value, color, size = 128, stroke = 13, label, track }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [v, setV] = useState(0)
  useEffect(() => { const t = setTimeout(() => setV(value), 120); return () => clearTimeout(t) }, [value])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || T.track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: `stroke-dashoffset 1.1s ${EASE}` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.27, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(value * 100)}<span style={{ fontSize: size * 0.14, color: T.muted }}>%</span></span>
        {label && <span style={{ fontSize: 11, color: T.faint, marginTop: 3, fontWeight: 600 }}>{label}</span>}
      </div>
    </div>
  )
}

export function Pill({ T, color, children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color, background: color + '1A', padding: '4px 11px', borderRadius: 999, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
    <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />{children}
  </span>
}

export function Btn({ T, children, primary, ghost, onClick, arrow, disabled, size = 'md', style, full }) {
  const [h, setH] = useState(false)
  const pads = { sm: '8px 15px', md: '11px 20px', lg: '13px 26px' }
  const fss = { sm: 13, md: 14.5, lg: 16 }
  const bg = disabled ? T.track : primary ? T.pink : ghost ? 'transparent' : (T.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
  return (
    <button onClick={disabled ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: full ? '100%' : undefined,
        fontFamily: FONT, fontSize: fss[size], fontWeight: 600, letterSpacing: '-0.01em', padding: pads[size], borderRadius: 999,
        cursor: disabled ? 'default' : 'pointer', border: 'none',
        color: disabled ? T.faint : primary ? '#fff' : T.ink, background: bg,
        boxShadow: primary && !disabled ? (h ? `0 8px 22px -6px ${T.pink}88` : `0 4px 14px -6px ${T.pink}66`) : 'none',
        transform: h && !disabled ? 'scale(1.03)' : 'scale(1)', transition: `all .3s ${EASE}`, ...style,
      }}>
      {children}
      {arrow && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: h ? 'translateX(2px)' : 'none', transition: `transform .3s ${EASE}` }}><path d={Ic.arrow} /></svg>}
    </button>
  )
}

export function SectionLabel({ T, children, right, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, ...style }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.faint, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{children}</span>
      {right}
    </div>
  )
}

export function Switch({ T, on, onClick, accent }) {
  const c = accent || T.pink, w = 46, h = 28
  return (
    <button onClick={onClick} style={{ position: 'relative', width: w, height: h, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, background: on ? c : T.track, transition: `background .3s ${EASE}` }}>
      <span style={{ position: 'absolute', top: 3, left: on ? w - h + 3 : 3, width: h - 6, height: h - 6, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: `left .28s ${EASE}` }} />
    </button>
  )
}

export function ThemeToggle({ theme, setTheme, T, compact }) {
  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 999, background: T.toggleBg }}>
      {['light', 'dark'].map((m) => (
        <button key={m} onClick={() => setTheme(m)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: compact ? 12 : 13, fontWeight: 600, letterSpacing: '-0.01em',
            padding: compact ? '5px 11px' : '7px 15px', borderRadius: 999, border: 'none', cursor: 'pointer',
            color: theme === m ? T.ink : T.muted, background: theme === m ? T.toggleKnob : 'transparent',
            boxShadow: theme === m ? '0 1px 3px rgba(0,0,0,0.15)' : 'none', transition: `all .3s ${EASE}` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            {m === 'light' ? <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />}
          </svg>
          {m === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  )
}

// ── canvas ──────────────────────────────────────────────────────────────────────
// Full-bleed themed page background + the dev-only sandbox strip. The strip keeps a
// small theme toggle purely for reviewing; in the real product the switch lives in
// Settings (see /dashboard/lab/settings), not on page chrome.
export function LabCanvas({ T, theme, setTheme, note = 'mock data, nothing saves', maxWidth = 1120, children, bleed = true }) {
  return (
    <div style={{ minHeight: '100vh', margin: bleed ? '-32px -24px -48px' : 0, background: T.appBg, fontFamily: FONT, color: T.body, transition: `background .5s ${EASE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 20px', borderBottom: `1px solid ${T.hair}` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: '-0.01em' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />UX sandbox · {note}
        </span>
        <ThemeToggle theme={theme} setTheme={setTheme} T={T} compact />
      </div>
      <div style={{ maxWidth, margin: '0 auto', padding: '32px 32px 64px' }}>{children}</div>
    </div>
  )
}
