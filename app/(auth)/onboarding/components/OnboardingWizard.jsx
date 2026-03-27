'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PALETTE, PALETTE_LIGHT } from '@/app/lib/shiftUtils'
import { DAYS_FULL, TIME_OPTIONS } from '@/app/lib/timeUtils'
import {
  ArrowIcon, BusinessIcon, CheckIcon, ClockIcon, IndustryHospitalityIcon, IndustryOtherIcon, PlusIcon, IndustryRetailIcon, TeamIcon,
} from '@/app/lib/icons'

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
  DAYS_FULL.forEach(day => {
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

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }) {
  const pct = (step / total) * 100
  const progressMetaStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  }

  const progressMetaTextStyle = {
    fontSize: 'var(--text-xs)',
    color: 'var(--gray-400)'
  }

  const progressTrackStyle = {
    height: 6,
    background: 'var(--gray-100)',
    borderRadius: 99,
    overflow: 'hidden',
  }

  const progressFillStyle = {
    height: '100%',
    background: 'linear-gradient(90deg, var(--pink-500), var(--pink-400))',
    borderRadius: 99,
    transition: 'width 0.4s ease',
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={progressMetaStyle}>
        <span style={{ ...progressMetaTextStyle, fontWeight: 600 }}>
          Step {step} of {total}
        </span>
        <span style={progressMetaTextStyle}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Step icon chip ────────────────────────────────────────────────────────────

function StepChip({ icon, label, active }) {
  const chipBaseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    marginBottom: 20
  }

  return (
    <div className="ui-chip ui-chip-button" style={{
      ...chipBaseStyle,
      background: active ? 'var(--pink-50)' : 'var(--gray-50)',
      border: `1px solid ${active ? 'rgb(from var(--pink-500) r g b / 27%)' : 'var(--gray-200)'}`,
      color: active ? 'var(--pink-500)' : 'var(--gray-400)',
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
        height: 34,
        padding: '0 8px',
        borderRadius: 8,
        border: `1px solid ${disabled ? 'var(--gray-100)' : 'var(--gray-200)'}`,
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: disabled ? 'var(--gray-300)' : 'var(--gray-900)',
        background: disabled ? 'var(--gray-50)' : 'var(--gray-0)',
        outline: 'none',
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer',
        minWidth: 80
      }}
    >
      {TIME_OPTIONS.map(t => <option key={t.value} value={t.label}>{t.label}</option>)}
    </select>
  )
}

// ── Hours row ─────────────────────────────────────────────────────────────────

function HoursRow({ day, data, onChange, onCopyTo, allDays }) {
  const [showCopyTo, setShowCopyTo] = useState(false)

  const rowBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 10,
    marginBottom: 5,
  }

  const popoverStyle = {
    position: 'absolute', right: 0, top: 30, zIndex: 20,
    background: 'var(--gray-0)', border: '1px solid var(--gray-200)', borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden', minWidth: 120,
  }

  const popoverItemStyle = {
    display: 'block', width: '100%', padding: '8px 12px',
    textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600,
    background: 'transparent', border: 'none', cursor: 'pointer',
  }

  const columnCenterStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  }

  return (
    <div style={{
      ...rowBaseStyle,
      background: data.open ? 'var(--gray-0)' : 'var(--gray-50)',
      border: `1px solid ${data.open ? 'var(--gray-200)' : 'var(--gray-100)'}`,
      opacity: data.open ? 1 : 0.6,
    }}>
      {/* Day toggle */}
      <button
        onClick={() => onChange({ ...data, open: !data.open })}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: 'none',
          background: data.open ? 'var(--pink-500)' : 'var(--gray-200)',
          color: 'var(--gray-0)',
          cursor: 'pointer',
          transition: 'all .1s',
        }}
      >
        {data.open && <CheckIcon size={11} />}
      </button>

      {/* Day label */}
      <span style={{
        width: 36,
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        color: data.open ? 'var(--gray-900)' : 'var(--gray-400)',
        flexShrink: 0,
      }}>
        {day.slice(0, 3)}
      </span>

      {data.open ? (
        <>
          {/* Equation: Open → First shift → Last shift → Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, flexWrap: 'wrap' }}>
            <div style={columnCenterStyle}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-400)', letterSpacing: 0.4 }}>OPEN</span>
              <TimeSelect value={data.opening} onChange={v => onChange({ ...data, opening: v })} />
            </div>

            <span style={{ color: 'var(--gray-300)', fontSize: 'var(--text-xs)', marginTop: 14 }}>→</span>

            <div style={columnCenterStyle}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--team-purple)', letterSpacing: 0.4 }}>FIRST SHIFT</span>
              <TimeSelect value={data.first_shift} onChange={v => onChange({ ...data, first_shift: v })} />
            </div>

            <span style={{ color: 'var(--gray-300)', fontSize: 'var(--text-xs)', marginTop: 14 }}>→</span>

            <div style={columnCenterStyle}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--team-purple)', letterSpacing: 0.4 }}>LAST SHIFT</span>
              <TimeSelect value={data.last_shift} onChange={v => onChange({ ...data, last_shift: v })} />
            </div>

            <span style={{ color: 'var(--gray-300)', fontSize: 'var(--text-xs)', marginTop: 14 }}>→</span>

            <div style={columnCenterStyle}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-400)', letterSpacing: 0.4 }}>CLOSE</span>
              <TimeSelect value={data.closing} onChange={v => onChange({ ...data, closing: v })} />
            </div>
          </div>

          {/* Copy to */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowCopyTo(v => !v)}
              style={{
                height: 26, padding: '0 8px', borderRadius: 6,
                border: '1px solid var(--gray-200)', background: 'var(--gray-50)',
                fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--gray-500)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Copy to
            </button>
            {showCopyTo && (
              <div style={popoverStyle}>
                <button
                  onClick={() => { onCopyTo('all'); setShowCopyTo(false) }}
                  style={{
                    ...popoverItemStyle,
                    color: 'var(--pink-500)', background: 'transparent', border: 'none',
                    cursor: 'pointer', borderBottom: '1px solid var(--gray-100)',
                  }}
                >
                  All days
                </button>
                <button
                  onClick={() => { onCopyTo('weekdays'); setShowCopyTo(false) }}
                  style={{
                    ...popoverItemStyle,
                    color: 'var(--gray-700)', background: 'transparent', border: 'none',
                    cursor: 'pointer', borderBottom: '1px solid var(--gray-100)',
                  }}
                >
                  Weekdays
                </button>
                <button
                  onClick={() => { onCopyTo('weekends'); setShowCopyTo(false) }}
                  style={{
                    ...popoverItemStyle,
                    color: 'var(--gray-700)', background: 'transparent', border: 'none',
                    cursor: 'pointer', borderBottom: '1px solid var(--gray-100)',
                  }}
                >
                  Weekends
                </button>
                {allDays.filter(d => d !== day).map(d => (
                  <button
                    key={d}
                    onClick={() => { onCopyTo(d); setShowCopyTo(false) }}
                    style={{
                      ...popoverItemStyle,
                      padding: '7px 12px',
                      color: 'var(--gray-700)',
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
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontStyle: 'italic', flex: 1 }}>Closed</span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
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
      const targets = target === 'all' ? DAYS_FULL
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
    if (step === 4) return DAYS_FULL.some(d => hours[d].open)
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
    { icon: <IndustryOtherIcon size={13} />, label: 'Industry' },
    { icon: <TeamIcon size={13} />, label: 'Teams' },
    { icon: <ClockIcon size={13} />, label: 'Hours' },
  ]

  const stepPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--pink-50) 0%, var(--gray-0) 50%, var(--team-purple-light) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--gray-0)', padding: '10px 24px', borderRadius: 12,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid var(--gray-100)',
        }}>
          <span className='heading-page'>
            Shift<span style={{ color: 'var(--pink-500)' }}>ly</span>
          </span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 620 }}>
        <ProgressBar step={step} total={TOTAL} />

        <div style={{
          background: 'var(--gray-0)', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          border: '1px solid var(--gray-100)',
          padding: '32px 36px', minHeight: 480,
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Step 1: Business Name ── */}
          {step === 1 && (
            <div style={stepPanelStyle}>
              <StepChip icon={<BusinessIcon size={13} />} label="Business" active />
              <h1 className="heading-page">
                What's your business called?
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 28px' }}>
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
                  width: '100%', padding: '14px 16px', fontSize: 'var(--text-lg)', fontWeight: 600,
                  border: '2px solid var(--gray-200)', borderRadius: 10, color: 'var(--gray-900)',
                  background: 'var(--gray-0)', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color .15s',
                  borderColor: businessName.trim() ? 'var(--pink-500)' : 'var(--gray-200)',
                }}
              />
            </div>
          )}

          {/* ── Step 2: Industry ── */}
          {step === 2 && (
            <div style={stepPanelStyle}>
              <StepChip icon={<IndustryOtherIcon size={13} />} label="Industry" active />
              <h1 className="heading-page">
                What industry are you in?
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 24px' }}>
                We'll pre-load team presets and shift templates that match your business.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { value: 'hospitality', label: 'Hospitality', Icon: IndustryHospitalityIcon },
                  { value: 'retail', label: 'Retail', Icon: IndustryRetailIcon },
                  { value: 'other', label: 'Other', Icon: IndustryOtherIcon },
                ].map(({ value, label, Icon }) => {
                  const on = industry === value
                  return (
                    <button
                      key={value}
                      onClick={() => setIndustry(value)}
                      style={{
                        padding: '20px 12px', borderRadius: 10, cursor: 'pointer',
                        border: on ? `2px solid var(--pink-500)` : '2px solid var(--gray-200)',
                        background: on ? 'var(--pink-50)' : 'var(--gray-50)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 8, transition: 'all .12s',
                      }}
                    >
                      <div style={{ color: on ? 'var(--pink-500)' : 'var(--gray-400)' }}>
                        <Icon size={24} />
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: on ? 'var(--pink-500)' : 'var(--gray-700)' }}>
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
                    width: '100%', padding: '11px 14px', fontSize: 'var(--text-sm)',
                    border: '1.5px solid var(--gray-200)', borderRadius: 8, color: 'var(--gray-900)',
                    background: 'var(--gray-0)', outline: 'none', boxSizing: 'border-box',
                    borderColor: otherIndustry.trim() ? 'var(--pink-500)' : 'var(--gray-200)',
                  }}
                />
              )}
            </div>
          )}

          {/* ── Step 3: Teams ── */}
          {step === 3 && (
            <div style={stepPanelStyle}>
              <StepChip icon={<TeamIcon size={13} />} label="Teams" active />
              <h1 className="heading-page">
                Select your teams
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 6px' }}>
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
                        className="ui-chip ui-chip-button"
                        key={t.id}
                        onClick={() => toggleTeam(t.id, t.label)}
                        style={{
                          ['--ui-chip-padding']: '8px 16px',
                          border: on ? `2px solid ${color}` : '1.5px solid var(--gray-200)',
                          background: on ? colorLight : 'var(--gray-50)',
                          color: on ? color : 'var(--gray-500)',
                          fontSize: 'var(--text-xs)', fontWeight: 600,
                          gap: 6,
                        }}
                      >
                        {on && (
                          <div className="ui-square-badge" style={{
                            background: color, color: 'var(--gray-0)',
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
                  <div key={t.id} className="ui-chip" style={{
                    ['--ui-chip-padding']: '6px 12px',
                    gap: 6,
                    marginBottom: 4,
                    background: colorLight, border: `2px solid ${color}`,
                    color, fontSize: 'var(--text-xs)', fontWeight: 600,
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
                    flex: 1, padding: '9px 12px', fontSize: 'var(--text-xs)', fontWeight: 500,
                    border: '1.5px solid var(--gray-200)', borderRadius: 8, color: 'var(--gray-900)',
                    background: 'var(--gray-0)', outline: 'none',
                  }}
                />
                <button
                  className="ui-inline-action ui-inline-action-xs"
                  onClick={addCustomTeam}
                  disabled={!customTeam.trim()}
                  style={{
                    height: 38, border: 'none',
                    background: customTeam.trim() ? 'var(--pink-500)' : 'var(--gray-100)',
                    color: customTeam.trim() ? 'var(--gray-0)' : 'var(--gray-400)',
                    cursor: customTeam.trim() ? 'pointer' : 'not-allowed',
                    gap: 5,
                  }}
                >
                  <PlusIcon size={11} /> Add
                </button>
              </div>

              {selectedTeams.length > 0 && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 8 }}>
                  {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Hours ── */}
          {step === 4 && (
            <div style={stepPanelStyle}>
              <StepChip icon={<ClockIcon size={13} />} label="Hours" active />
              <h1 className='heading-page'>
                When do you operate?
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 6px' }}>
                Open and Close times anchor your shift patterns.{' '}
                <span style={{ color: 'var(--team-purple)', fontWeight: 600 }}>First/Last shift</span>
                {' '}set when staff rotas begin and end.
              </p>

              <div style={{ flex: 1, overflowY: 'auto', marginTop: 14 }}>
                {DAYS_FULL.map(day => (
                  <HoursRow
                    key={day}
                    day={day}
                    data={hours[day]}
                    onChange={data => updateDayHours(day, data)}
                    onCopyTo={target => copyTo(day, target)}
                    allDays={DAYS_FULL}
                  />
                ))}
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 8 }}>
                You can adjust these anytime in Settings. Shift patterns on the Shifts page will auto-anchor to these times.
              </p>
            </div>
          )}

          {/* ── Nav buttons ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--gray-100)',
          }}>
            <button
              className="ui-inline-action"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              style={{
                padding: '10px 20px', fontSize: 'var(--text-sm)', fontWeight: 600,
                border: '1px solid var(--gray-200)', background: 'var(--gray-0)', color: 'var(--gray-500)',
                cursor: step === 1 ? 'default' : 'pointer',
                opacity: step === 1 ? 0 : 1, transition: 'opacity .15s',
              }}
            >
              Back
            </button>

            {step < TOTAL ? (
              <button
                className="ui-inline-action"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                style={{
                  padding: '10px 24px', fontSize: 'var(--text-sm)', fontWeight: 700,
                  border: 'none', background: canProceed() ? 'var(--pink-500)' : 'var(--gray-100)',
                  color: canProceed() ? 'var(--gray-0)' : 'var(--gray-400)',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  transition: 'all .12s',
                }}
              >
                Continue <ArrowIcon size={13} />
              </button>
            ) : (
              <button
                className="ui-inline-action"
                onClick={handleSubmit}
                disabled={!canProceed() || saving}
                style={{
                  padding: '10px 24px', fontSize: 'var(--text-sm)', fontWeight: 700,
                  border: 'none', background: canProceed() && !saving ? 'var(--pink-500)' : 'var(--gray-100)',
                  color: canProceed() && !saving ? 'var(--gray-0)' : 'var(--gray-400)',
                  cursor: canProceed() && !saving ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? (
                  <>
                    <div style={{
                      width: 14, height: 14, borderRadius: 99,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'var(--gray-0)', animation: 'spin 0.6s linear infinite',
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