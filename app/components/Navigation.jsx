'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'

const PINK = '#FF1F7D'
const initials = (s) => (s || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const ICON = {
  home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  shifts: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  staff: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
  rules: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  generate: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  inbox: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />,
  payroll: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  reports: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  archive: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4" />,
  settings: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
  help: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  pin: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
}
const Icon = ({ k, cls = 'w-5 h-5' }) => <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">{ICON[k]}</svg>

const SECTIONS = [
  { title: 'Workspace', items: [
    { id: 'nav-dashboard', name: 'Dashboard', path: '/dashboard', icon: 'home' },
    { id: 'nav-shifts', name: 'Shifts', path: '/dashboard/shifts', icon: 'shifts' },
    { id: 'nav-staff', name: 'Staff', path: '/dashboard/staff', icon: 'staff' },
    { id: 'nav-generate', name: 'Rota Builder', path: '/dashboard/generate', icon: 'generate' },
  ] },
  { title: 'Operations', items: [
    { id: 'nav-requests', name: 'Inbox', path: '/dashboard/requests', icon: 'inbox' },
    { id: 'nav-payroll', name: 'Payroll', path: '/dashboard/payroll', icon: 'payroll' },
    { id: 'nav-reports', name: 'Reports', path: '/dashboard/reports', icon: 'reports' },
    { id: 'nav-archive', name: 'Archive', path: '/dashboard/archive', icon: 'archive' },
  ] },
]
const BOTTOM_ITEMS = [
  { id: 'nav-settings', name: 'Settings', path: '/dashboard/settings', icon: 'settings' },
  { id: 'nav-help', name: 'Help Centre', path: '/dashboard/help', icon: 'help' },
]

export default function Navigation({ collapsed = false, onToggleCollapse }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [orgName, setOrgName] = useState('My workspace')
  const [locations, setLocations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => { setMobileMenuOpen(false); setSwitcherOpen(false) }, [pathname])
  useEffect(() => { setSwitcherOpen(false) }, [collapsed])
  useEffect(() => { document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset'; return () => { document.body.style.overflow = 'unset' } }, [mobileMenuOpen])

  const loadLocations = useCallback(() => {
    fetch('/api/locations').then((r) => r.ok ? r.json() : null).then((d) => {
      if (!d) return
      setOrgName(d.organization_name || 'My workspace')
      setLocations(d.locations || [])
      setActiveId(d.active)
    }).catch(() => {})
  }, [])

  // Load on mount, and re-load whenever Settings edits the org/location names
  // (the nav lives in the persistent layout, so it won't remount on its own).
  useEffect(() => {
    loadLocations()
    window.addEventListener('shiftly:locations-updated', loadLocations)
    return () => window.removeEventListener('shiftly:locations-updated', loadLocations)
  }, [loadLocations])

  const switchLocation = async (id) => {
    if (id === activeId) { setSwitcherOpen(false); return }
    setSwitching(true)
    try {
      await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: id }) })
      window.location.reload()
    } catch { setSwitching(false) }
  }

  const isActive = (path) => path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(path)
  const activeLoc = locations.find((l) => l.id === activeId)

  // Collapsed is the persisted preference; hover temporarily peeks the full nav as
  // an overlay. `mini` = the icon-only rail is currently showing (collapsed, not peeking).
  const mini = collapsed && !hovered

  // ── nav link (collapses to an icon-only rail on desktop) ────────────────────
  const NavLink = ({ item, mobile }) => {
    const active = isActive(item.path)
    const rail = mini && !mobile
    return (
      <Link id={mobile ? `${item.id}-mobile` : item.id} href={item.path} title={rail ? item.name : undefined}
        className={`flex items-center rounded-xl transition-all ${rail ? 'justify-center py-2.5' : 'justify-between px-4 py-2.5'} ${active ? 'bg-white text-pink-600 shadow-lg' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
        <div className={`flex items-center ${rail ? '' : 'space-x-3'}`}>
          <Icon k={item.icon} />
          {!rail && <span className="font-medium text-sm">{item.name}</span>}
        </div>
        {!rail && item.locked && (
          <svg className={`w-4 h-4 ${active ? 'text-pink-400' : 'text-white/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </Link>
    )
  }

  // ── a titled group of nav links (title hidden on the collapsed rail) ────────
  const SectionTitle = ({ children }) => (
    <div className="px-4 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.09em] text-white/45">{children}</div>
  )
  const NavSection = ({ section, mobile, last }) => {
    const rail = mini && !mobile
    return (
      <div className={last ? '' : (rail ? 'mb-2.5' : 'mb-6')}>
        {!rail && <SectionTitle>{section.title}</SectionTitle>}
        <div className="space-y-1">
          {section.items.map((item) => <NavLink key={item.path} item={item} mobile={mobile} />)}
        </div>
        {rail && !last && <div className="mt-2.5 border-t border-white/20 mx-2" />}
      </div>
    )
  }

  // ── workspace switcher: organisation up top, its locations beneath ──────────
  const Switcher = ({ mobile }) => {
    const rail = mini && !mobile
    return (
      <div className="relative">
        <button onClick={() => setSwitcherOpen((o) => !o)} disabled={switching} title={rail ? `${orgName} · ${activeLoc?.name || ''}` : undefined}
          className={`w-full flex items-center bg-white/10 hover:bg-white/[0.18] border border-white/20 rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition disabled:opacity-60 ${rail ? 'justify-center p-1.5' : 'gap-2.5 px-2.5 py-2.5'}`}>
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#FF1F7D] font-extrabold text-sm flex-shrink-0 shadow-sm">{initials(orgName)}</div>
          {!rail && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white font-bold text-sm truncate leading-tight">{orgName}</p>
                <p className="text-white/65 text-xs truncate leading-tight flex items-center gap-1">
                  <Icon k="pin" cls="w-3 h-3" />{switching ? 'Switching…' : (activeLoc?.name || 'Select location')}
                </p>
              </div>
              <svg className={`w-4 h-4 text-white/70 flex-shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </>
          )}
        </button>

        {switcherOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
            <div className={`absolute z-50 top-full mt-2 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-2 ${rail ? 'left-full ml-2 -mt-1 top-0 w-[268px]' : (mobile ? 'left-0 right-0' : 'left-0 w-[268px]')}`}>
              {/* ORGANISATION header, the umbrella */}
              <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 mb-1.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-sm flex-shrink-0" style={{ background: PINK, color: '#fff' }}>{initials(orgName)}</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-[#98989D] leading-tight">Organisation</p>
                  <p className="text-gray-900 dark:text-white font-bold text-sm truncate leading-tight">{orgName}</p>
                </div>
              </div>

              {/* LOCATIONS, the billable venues within it */}
              <div className="flex items-center justify-between px-3 pt-1 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-[#98989D]">Locations</span>
                <span className="text-[11px] font-semibold text-gray-300 dark:text-[#68686E]">{locations.length}</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto">
                {locations.length === 0 && <p className="px-3 py-3 text-sm text-gray-400 dark:text-[#98989D]">No locations yet</p>}
                {locations.map((l) => {
                  const on = l.id === activeId
                  return (
                    <button key={l.id} onClick={() => switchLocation(l.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition ${on ? 'bg-pink-50 dark:bg-pink-500/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: PINK + '14', color: PINK }}><Icon k="pin" cls="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate leading-tight ${on ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-[#D9D9DE]'}`}>{l.name}</p>
                        {l.address && <p className="text-gray-400 dark:text-[#68686E] text-xs truncate leading-tight">{l.address}</p>}
                      </div>
                      {on && <svg className="w-4 h-4 flex-shrink-0" style={{ color: PINK }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  )
                })}
              </div>

              <div className="my-1.5 border-t border-gray-100 dark:border-white/10" />
              <button title="Per-location billing, coming soon" onClick={() => setSwitcherOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-left transition">
                <span className="flex items-center gap-2.5 font-semibold text-sm" style={{ color: PINK }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: PINK + '14' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </span>
                  Add location
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-[#98989D] bg-gray-100 dark:bg-white/10 rounded-full px-2 py-0.5">Soon</span>
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#FF1F7D] flex items-center justify-between px-4 z-50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo-white.svg" alt="Shiftly" width={28} height={28} className="flex-shrink-0" />
          <span className="text-white font-semibold text-xl" style={{ fontFamily: "'Cal Sans', sans-serif" }}>Shiftly</span>
        </Link>
        <button onClick={() => setMobileMenuOpen((o) => !o)} className="w-10 h-10 flex items-center justify-center text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
        </button>
      </div>

      {mobileMenuOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />}

      {/* ── Mobile slide-out (always full width) ── */}
      <div className={`lg:hidden fixed top-16 left-0 bottom-0 w-72 bg-[#FF1F7D] z-50 flex flex-col transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-3 pt-4 pb-2"><Switcher mobile /></div>
        <div className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((section, si) => <NavSection key={section.title} section={section} mobile last={si === SECTIONS.length - 1} />)}
        </div>
        <div className="px-3 pt-3 pb-5 border-t border-white/15">
          <SectionTitle>Configuration</SectionTitle>
          <div className="space-y-1">
            {BOTTOM_ITEMS.map((item) => <NavLink key={item.path} item={item} mobile />)}
          </div>
          <div className="flex items-center gap-3 px-4 py-2 mt-1 rounded-xl hover:bg-white/10 transition">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
            <span onClick={(e) => e.currentTarget.parentElement?.querySelector('button')?.click()} className="text-white/80 hover:text-white text-sm font-medium cursor-pointer">Your account</span>
          </div>
        </div>
      </div>

      {/* ── Desktop sidebar (collapsible + hover-to-peek) ── */}
      <nav onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 bg-[#FF1F7D] flex-col z-50 rounded-r-[2rem] transition-[width] duration-200 ${mini ? 'w-[4.75rem]' : 'w-52'} ${collapsed && hovered ? 'shadow-2xl' : ''}`}>
        {/* workspace / location switcher, sits at the very top of the rail. The logo
            was decorative (users know they're in Shiftly), so it's gone to free space. */}
        <div className={`pt-5 pb-4 ${mini ? 'px-2.5' : 'px-3'}`}><Switcher /></div>

        {/* main nav, scrollbar hidden (still scrolls by wheel/trackpad if ever needed) */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${mini ? 'px-2.5' : 'px-3'}`}>
          {SECTIONS.map((section, si) => <NavSection key={section.title} section={section} last={si === SECTIONS.length - 1} />)}
        </div>

        {/* pinned bottom: settings, help, collapse toggle, account, lifted off the
            very bottom edge so 'Your account' reads as part of the nav, not an afterthought */}
        <div className={`pt-3 pb-6 border-t border-white/15 ${mini ? 'px-2.5' : 'px-3'}`}>
          {!mini && <SectionTitle>Configuration</SectionTitle>}
          <div className="space-y-1">
            {BOTTOM_ITEMS.map((item) => <NavLink key={item.path} item={item} />)}
          </div>
          <button onClick={onToggleCollapse} title={collapsed ? 'Pin nav open' : 'Collapse nav'}
            className={`w-full flex items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition mt-1 ${mini ? 'justify-center py-2.5' : 'gap-3 px-4 py-2.5'}`}>
            <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            {!mini && <span className="text-sm font-medium">{collapsed ? 'Pin open' : 'Collapse'}</span>}
          </button>
          <div className={`mt-1.5 pt-2 border-t border-white/10 ${mini ? '' : ''}`}>
            <div className={`flex items-center rounded-xl bg-white/5 hover:bg-white/15 transition ${mini ? 'justify-center py-2' : 'gap-3 px-3 py-2.5'}`}>
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
              {!mini && <span onClick={(e) => e.currentTarget.parentElement?.querySelector('button')?.click()} className="text-white text-sm font-semibold truncate cursor-pointer">Your account</span>}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
