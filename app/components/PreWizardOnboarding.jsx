'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FONT_HEADING = "'Plus Jakarta Sans', sans-serif"
const FONT_BODY = "'Plus Jakarta Sans', sans-serif"
const PINK = '#FF1F7D'
const OPERATING = '#6366F1' // operating-hours accent, matches the Settings/Shifts pages

// Team palette, matches the app's shared TEAM_COLORS so wizard previews line up with the dashboard.
const PALETTE = ['#FF1F7D', '#6366F1', '#14B8A6', '#F59E0B', '#0EA5E9', '#8B5CF6', '#EC4899', '#10B981']
const PALETTE_LIGHT = ['#FFE7F1', '#EEF0FE', '#E6FBF6', '#FEF6E7', '#E8F6FE', '#F3EDFE', '#FDEBF4', '#E7FBF1']

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const INDUSTRY_TEAMS = {
  hospitality: [
    { id: 'foh', label: 'Front of House' },
    { id: 'bar', label: 'Bar' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'kp', label: 'KP' },
    { id: 'management', label: 'Management' },
  ],
  retail: [
    { id: 'shopfloor', label: 'Shop Floor' },
    { id: 'stockroom', label: 'Stock Room' },
    { id: 'management', label: 'Management' },
    { id: 'customerservice', label: 'Customer Service' },
    { id: 'checkout', label: 'Checkout' },
  ],
  other: [],
}

const defaultHours = () => {
  const h = {}
  DAYS.forEach(day => {
    h[day] = {
      open: !['Saturday', 'Sunday'].includes(day),
      opening: '09:00',
      first_shift: '09:00',
      last_shift: '17:00',
      closing: '17:00',
    }
  })
  return h
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function HospitalityIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  )
}

function RetailIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function OtherIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  )
}

function CheckIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function PlusIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  )
}

function ArrowIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function BusinessIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function TeamIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function ClockIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }) {
  const pct = (step / total) * 100
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', fontFamily: FONT_BODY }}>
          Step {step} of {total}
        </span>
        <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: FONT_BODY }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${PINK}, #FF5FA8)`,
          borderRadius: 99, transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ── Step icon chip ────────────────────────────────────────────────────────────

function StepChip({ icon, label, active }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 8,
      background: active ? '#FFF0F5' : '#F9FAFB',
      border: `1px solid ${active ? '#FF1F7D44' : '#E5E7EB'}`,
      color: active ? PINK : '#9CA3AF',
      fontSize: 11, fontWeight: 600, marginBottom: 20,
      fontFamily: FONT_BODY,
    }}>
      {icon}
      {label}
    </div>
  )
}

// ── Time select ───────────────────────────────────────────────────────────────

function TimeSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        height: 34, padding: '0 8px', borderRadius: 8,
        border: `1px solid ${disabled ? '#F3F4F6' : '#E5E7EB'}`,
        fontSize: 12, fontWeight: 600,
        color: disabled ? '#D1D5DB' : '#111827',
        background: disabled ? '#F9FAFB' : '#fff',
        outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        minWidth: 80, fontFamily: FONT_BODY,
      }}
    >
      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  )
}

// ── Hours row ─────────────────────────────────────────────────────────────────

function HoursRow({ day, data, onChange, onCopyTo, allDays }) {
  const [showCopyTo, setShowCopyTo] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 10,
      background: data.open ? '#fff' : '#F9FAFB',
      border: `1px solid ${data.open ? '#E5E7EB' : '#F3F4F6'}`,
      opacity: data.open ? 1 : 0.6,
      marginBottom: 5,
    }}>
      {/* Day toggle */}
      <button
        onClick={() => onChange({ ...data, open: !data.open })}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: 'none',
          background: data.open ? PINK : '#E5E7EB',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .1s',
        }}
      >
        {data.open && <CheckIcon size={11} />}
      </button>

      {/* Day label */}
      <span style={{
        width: 36, fontSize: 11, fontWeight: 700,
        color: data.open ? '#111827' : '#9CA3AF',
        fontFamily: FONT_BODY, flexShrink: 0,
      }}>
        {day.slice(0, 3)}
      </span>

      {data.open ? (
        <>
          {/* Equation: Open → First shift → Last shift → Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 8, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.4 }}>OPEN</span>
              <TimeSelect value={data.opening} onChange={v => onChange({ ...data, opening: v })} />
            </div>

            <span style={{ color: '#D1D5DB', fontSize: 12, marginTop: 14 }}>→</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 8, fontWeight: 600, color: OPERATING, letterSpacing: 0.4 }}>FIRST SHIFT</span>
              <TimeSelect value={data.first_shift} onChange={v => onChange({ ...data, first_shift: v })} />
            </div>

            <span style={{ color: '#D1D5DB', fontSize: 12, marginTop: 14 }}>→</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 8, fontWeight: 600, color: OPERATING, letterSpacing: 0.4 }}>LAST SHIFT</span>
              <TimeSelect value={data.last_shift} onChange={v => onChange({ ...data, last_shift: v })} />
            </div>

            <span style={{ color: '#D1D5DB', fontSize: 12, marginTop: 14 }}>→</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 8, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.4 }}>CLOSE</span>
              <TimeSelect value={data.closing} onChange={v => onChange({ ...data, closing: v })} />
            </div>
          </div>

          {/* Copy to */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowCopyTo(v => !v)}
              style={{
                height: 26, padding: '0 8px', borderRadius: 6,
                border: '1px solid #E5E7EB', background: '#F9FAFB',
                fontSize: 10, fontWeight: 600, color: '#6B7280',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Copy to
            </button>
            {showCopyTo && (
              <div style={{
                position: 'absolute', right: 0, top: 30, zIndex: 20,
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden', minWidth: 120,
              }}>
                <button
                  onClick={() => { onCopyTo('all'); setShowCopyTo(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px',
                    textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: PINK, background: 'transparent', border: 'none',
                    cursor: 'pointer', borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  All days
                </button>
                <button
                  onClick={() => { onCopyTo('weekdays'); setShowCopyTo(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px',
                    textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: '#374151', background: 'transparent', border: 'none',
                    cursor: 'pointer', borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  Weekdays
                </button>
                <button
                  onClick={() => { onCopyTo('weekends'); setShowCopyTo(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px',
                    textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: '#374151', background: 'transparent', border: 'none',
                    cursor: 'pointer', borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  Weekends
                </button>
                {allDays.filter(d => d !== day).map(d => (
                  <button
                    key={d}
                    onClick={() => { onCopyTo(d); setShowCopyTo(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '7px 12px',
                      textAlign: 'left', fontSize: 11, color: '#374151',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', flex: 1 }}>Closed</span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PreWizardOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const TOTAL = 4

  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState(null)
  const [otherIndustry, setOtherIndustry] = useState('')
  const [selectedTeams, setSelectedTeams] = useState([])
  const [customTeam, setCustomTeam] = useState('')
  const [hours, setHours] = useState(defaultHours())

  const presetTeams = industry ? (INDUSTRY_TEAMS[industry] || []) : []

  const toggleTeam = (id, label) => {
    setSelectedTeams(prev => {
      const exists = prev.find(t => t.id === id)
      if (exists) return prev.filter(t => t.id !== id)
      return [...prev, { id, label }]
    })
  }

  const addCustomTeam = () => {
    const trimmed = customTeam.trim()
    if (!trimmed) return
    const id = `custom_${Date.now()}`
    setSelectedTeams(prev => [...prev, { id, label: trimmed }])
    setCustomTeam('')
  }

  const updateDayHours = (day, data) => {
    setHours(prev => ({ ...prev, [day]: data }))
  }

  const copyTo = (sourceDay, target) => {
    const source = hours[sourceDay]
    setHours(prev => {
      const updated = { ...prev }
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      const weekends = ['Saturday', 'Sunday']
      const targets = target === 'all' ? DAYS
        : target === 'weekdays' ? weekdays
        : target === 'weekends' ? weekends
        : [target]
      targets.forEach(d => {
        if (d !== sourceDay) {
          updated[d] = { ...updated[d], opening: source.opening, first_shift: source.first_shift, last_shift: source.last_shift, closing: source.closing }
        }
      })
      return updated
    })
  }

  const canProceed = () => {
    if (step === 1) return businessName.trim().length > 0
    if (step === 2) return industry !== null && (industry !== 'other' || otherIndustry.trim().length > 0)
    if (step === 3) return selectedTeams.length > 0
    if (step === 4) return DAYS.some(d => hours[d].open)
    return false
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const teamsWithColors = selectedTeams.map((t, i) => ({
        ...t,
        color: PALETTE[i % PALETTE.length],
        colorLight: PALETTE_LIGHT[i % PALETTE_LIGHT.length],
      }))

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim(),
          industry: industry === 'other' ? otherIndustry.trim() : industry,
          teams: teamsWithColors,
          operating_hours: hours,
        }),
      })

      if (res.ok) {
        router.push('/dashboard?tour=start')
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to save — please try again')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  const stepMeta = [
    { icon: <BusinessIcon size={13} />, label: 'Business' },
    { icon: <OtherIcon size={13} />, label: 'Industry' },
    { icon: <TeamIcon size={13} />, label: 'Teams' },
    { icon: <ClockIcon size={13} />, label: 'Hours' },
  ]

  return (
    <div style={{
      minHeight: '100vh', fontFamily: FONT_BODY,
      background: 'linear-gradient(180deg, #FFEFF6 0%, #F7F7F9 340px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#fff', padding: '10px 24px', borderRadius: 12,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6',
        }}>
          <span style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            Shift<span style={{ color: PINK }}>ly</span>
          </span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 620 }}>
        <ProgressBar step={step} total={TOTAL} />

        <div style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          border: '1px solid #F3F4F6',
          padding: '32px 36px', minHeight: 480,
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Step 1: Business Name ── */}
          {step === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <StepChip icon={<BusinessIcon size={13} />} label="Business" active />
              <h1 style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                What's your business called?
              </h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 28px' }}>
                This appears throughout your workspace.
              </p>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canProceed() && setStep(2)}
                placeholder="e.g. The Crown, Riverside Retail..."
                autoFocus
                style={{
                  width: '100%', padding: '14px 16px', fontSize: 18, fontWeight: 600,
                  border: '2px solid #E5E7EB', borderRadius: 10, color: '#111827',
                  background: '#fff', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color .15s',
                  borderColor: businessName.trim() ? PINK : '#E5E7EB',
                }}
              />
            </div>
          )}

          {/* ── Step 2: Industry ── */}
          {step === 2 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <StepChip icon={<OtherIcon size={13} />} label="Industry" active />
              <h1 style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                What industry are you in?
              </h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px' }}>
                We'll pre-load team presets and shift templates that match your business.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { value: 'hospitality', label: 'Hospitality', Icon: HospitalityIcon },
                  { value: 'retail', label: 'Retail', Icon: RetailIcon },
                  { value: 'other', label: 'Other', Icon: OtherIcon },
                ].map(({ value, label, Icon }) => {
                  const on = industry === value
                  return (
                    <button
                      key={value}
                      onClick={() => setIndustry(value)}
                      style={{
                        padding: '20px 12px', borderRadius: 10, cursor: 'pointer',
                        border: on ? `2px solid ${PINK}` : '2px solid #E5E7EB',
                        background: on ? '#FFF0F5' : '#F9FAFB',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 8, transition: 'all .12s',
                      }}
                    >
                      <div style={{ color: on ? PINK : '#9CA3AF' }}>
                        <Icon size={24} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: on ? PINK : '#374151' }}>
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {industry === 'other' && (
                <input
                  type="text"
                  value={otherIndustry}
                  onChange={e => setOtherIndustry(e.target.value)}
                  placeholder="Tell us your industry..."
                  autoFocus
                  style={{
                    width: '100%', padding: '11px 14px', fontSize: 14,
                    border: '1.5px solid #E5E7EB', borderRadius: 8, color: '#111827',
                    background: '#fff', outline: 'none', boxSizing: 'border-box',
                    borderColor: otherIndustry.trim() ? PINK : '#E5E7EB',
                  }}
                />
              )}
            </div>
          )}

          {/* ── Step 3: Teams ── */}
          {step === 3 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <StepChip icon={<TeamIcon size={13} />} label="Teams" active />
              <h1 style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                Select your teams
              </h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 6px' }}>
                Each team gets its own shift patterns and scheduling rules.
              </p>

              {presetTeams.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, marginTop: 16 }}>
                  {presetTeams.map((t, i) => {
                    const on = selectedTeams.find(s => s.id === t.id)
                    const color = PALETTE[i % PALETTE.length]
                    const colorLight = PALETTE_LIGHT[i % PALETTE_LIGHT.length]
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTeam(t.id, t.label)}
                        style={{
                          padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                          border: on ? `2px solid ${color}` : '1.5px solid #E5E7EB',
                          background: on ? colorLight : '#F9FAFB',
                          color: on ? color : '#6B7280',
                          fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6,
                          transition: 'all .12s',
                        }}
                      >
                        {on && (
                          <div style={{
                            width: 14, height: 14, borderRadius: 3,
                            background: color, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <CheckIcon size={9} />
                          </div>
                        )}
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Selected custom teams */}
              {selectedTeams.filter(t => !presetTeams.find(p => p.id === t.id)).map((t, i) => {
                const color = PALETTE[(presetTeams.length + i) % PALETTE.length]
                const colorLight = PALETTE_LIGHT[(presetTeams.length + i) % PALETTE_LIGHT.length]
                return (
                  <div key={t.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8, marginBottom: 4,
                    background: colorLight, border: `2px solid ${color}`,
                    color, fontSize: 12, fontWeight: 600,
                  }}>
                    {t.label}
                    <button
                      onClick={() => setSelectedTeams(prev => prev.filter(s => s.id !== t.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, marginLeft: 2 }}
                    >
                      ×
                    </button>
                  </div>
                )
              })}

              {/* Custom team input */}
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <input
                  type="text"
                  value={customTeam}
                  onChange={e => setCustomTeam(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomTeam()}
                  placeholder="Add custom team..."
                  style={{
                    flex: 1, padding: '9px 12px', fontSize: 12, fontWeight: 500,
                    border: '1.5px solid #E5E7EB', borderRadius: 8, color: '#111827',
                    background: '#fff', outline: 'none',
                  }}
                />
                <button
                  onClick={addCustomTeam}
                  disabled={!customTeam.trim()}
                  style={{
                    height: 38, padding: '0 14px', borderRadius: 8, border: 'none',
                    background: customTeam.trim() ? PINK : '#F3F4F6',
                    color: customTeam.trim() ? '#fff' : '#9CA3AF',
                    fontSize: 12, fontWeight: 600, cursor: customTeam.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <PlusIcon size={11} /> Add
                </button>
              </div>

              {selectedTeams.length > 0 && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                  {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Hours ── */}
          {step === 4 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <StepChip icon={<ClockIcon size={13} />} label="Hours" active />
              <h1 style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                When do you operate?
              </h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 6px' }}>
                Open and Close times anchor your shift patterns.{' '}
                <span style={{ color: OPERATING, fontWeight: 600 }}>First/Last shift</span>
                {' '}set when staff rotas begin and end.
              </p>

              <div style={{ flex: 1, overflowY: 'auto', marginTop: 14 }}>
                {DAYS.map(day => (
                  <HoursRow
                    key={day}
                    day={day}
                    data={hours[day]}
                    onChange={data => updateDayHours(day, data)}
                    onCopyTo={target => copyTo(day, target)}
                    allDays={DAYS}
                  />
                ))}
              </div>

              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                You can adjust these anytime in Settings. Shift patterns on the Shifts page will auto-anchor to these times.
              </p>
            </div>
          )}

          {/* ── Nav buttons ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 28, paddingTop: 20, borderTop: '1px solid #F3F4F6',
          }}>
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              style={{
                padding: '11px 20px', borderRadius: 11, fontSize: 13, fontWeight: 600,
                border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280',
                cursor: step === 1 ? 'default' : 'pointer',
                opacity: step === 1 ? 0 : 1, transition: 'opacity .15s',
              }}
            >
              Back
            </button>

            {step < TOTAL ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                style={{
                  padding: '11px 24px', borderRadius: 11, fontSize: 13, fontWeight: 700,
                  border: 'none', background: canProceed() ? PINK : '#F3F4F6',
                  color: canProceed() ? '#fff' : '#9CA3AF',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all .12s',
                }}
              >
                Continue <ArrowIcon size={13} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || saving}
                style={{
                  padding: '11px 24px', borderRadius: 11, fontSize: 13, fontWeight: 700,
                  border: 'none', background: canProceed() && !saving ? PINK : '#F3F4F6',
                  color: canProceed() && !saving ? '#fff' : '#9CA3AF',
                  cursor: canProceed() && !saving ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {saving ? (
                  <>
                    <div style={{
                      width: 14, height: 14, borderRadius: 99,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', animation: 'spin 0.6s linear infinite',
                    }} />
                    Saving…
                  </>
                ) : (
                  <>Get Started <ArrowIcon size={13} /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}