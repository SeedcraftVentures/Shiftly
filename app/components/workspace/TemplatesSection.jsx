'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import TimelineBuilder from '@/app/components/template/TimelineBuilder'
import { formatTime, getShiftBlockColor } from '@/app/components/template/shift-constants'
import ShiftMiniPreview from '@/app/components/template/ShiftMiniPreview'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_SHIFT_LENGTHS = [4, 6, 8, 10, 12]
const BUFFER_OPTIONS = [0, 15, 30, 45, 60]
const MAX_TEMPLATES = 10

function makeDefaultShift(openTime, closeTime, openBuffer, closeBuffer) {
  const staffStart = openTime - (openBuffer || 0) / 60
  const staffEnd = closeTime + (closeBuffer || 0) / 60
  const len = Math.min(8, staffEnd - staffStart)
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    start: staffStart,
    length: len,
    headcount: 1,
  }
}

export default function TemplatesSection({ selectedTeamId }) {
  const queryClient = useQueryClient()
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('day')

  // Template state
  const [dayTemplates, setDayTemplates] = useState({})
  const [weekTemplate, setWeekTemplate] = useState({})
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')
  const [editingTemplate, setEditingTemplate] = useState(null)

  // Dirty state tracking
  const savedRef = useRef(null)

  // From team record (set during onboarding, no hardcoding)
  // open_time/close_time are stored as strings in the DB; parse to numbers
  const openTime = Number(teamData?.open_time) || 9
  const closeTime = Number(teamData?.close_time) || 17
  const openBuffer = Number(teamData?.open_buffer) || 0
  const closeBuffer = Number(teamData?.close_buffer) || 0
  const shiftLengths = teamData?.shift_lengths ?? DEFAULT_SHIFT_LENGTHS

  const isDirty = useMemo(() => {
    if (!savedRef.current) return false
    return JSON.stringify({ dayTemplates, weekTemplate }) !== savedRef.current
  }, [dayTemplates, weekTemplate])

  // Fetch team data
  useEffect(() => {
    if (!selectedTeamId) return
    setLoading(true)
    setEditingTemplate(null)
    fetch(`/api/teams/${selectedTeamId}`)
      .then(r => r.json())
      .then(data => {
        setTeamData(data)

        const savedDT = data.day_templates || {}
        const savedWT = data.week_template || {}

        if (Object.keys(savedDT).length === 0) {
          const ot = Number(data.open_time) || 9
          const ct = Number(data.close_time) || 17
          const ob = Number(data.open_buffer) || 0
          const cb = Number(data.close_buffer) || 0
          const defShift = makeDefaultShift(ot, ct, ob, cb)

          const defaultDT = { Standard: { shifts: [defShift], openTime: ot, closeTime: ct, openBuffer: ob, closeBuffer: cb } }
          const defaultWT = {}
          DAYS.forEach(d => {
            defaultWT[d] = { on: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d), tmpl: 'Standard' }
          })

          setDayTemplates(defaultDT)
          setWeekTemplate(defaultWT)
          setActiveTemplate('Standard')
          savedRef.current = JSON.stringify({ dayTemplates: defaultDT, weekTemplate: defaultWT })
        } else {
          setDayTemplates(savedDT)
          setWeekTemplate(savedWT)
          setActiveTemplate(Object.keys(savedDT)[0] || null)
          savedRef.current = JSON.stringify({ dayTemplates: savedDT, weekTemplate: savedWT })
        }

        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch team data:', err)
        setLoading(false)
      })
  }, [selectedTeamId])

  // Save + sync
  const handleSave = useCallback(async () => {
    if (!selectedTeamId) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_templates: dayTemplates, week_template: weekTemplate }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Save failed')
      }

      const syncRes = await fetch(`/api/teams/${selectedTeamId}/template/sync-shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_templates: dayTemplates, week_template: weekTemplate }),
      })
      if (!syncRes.ok) {
        const body = await syncRes.json().catch(() => ({}))
        throw new Error(body.error || 'Sync failed')
      }

      // Invalidate parent team query so StaffShiftsSection picks up new templates
      queryClient.invalidateQueries({ queryKey: ['team-detail', selectedTeamId] })

      // Update saved snapshot
      savedRef.current = JSON.stringify({ dayTemplates, weekTemplate })

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [selectedTeamId, dayTemplates, weekTemplate])

  // Template CRUD
  const updateTemplateShifts = useCallback((name, newShifts) => {
    setDayTemplates(prev => ({ ...prev, [name]: { ...prev[name], shifts: newShifts } }))
  }, [])

  const updateTemplateHours = useCallback((name, patch) => {
    setDayTemplates(prev => ({ ...prev, [name]: { ...prev[name], ...patch } }))
  }, [])

  const addTemplate = () => {
    if (Object.keys(dayTemplates).length >= MAX_TEMPLATES) return
    let name = 'New Template'
    let i = 1
    while (dayTemplates[name]) name = `New Template ${i++}`
    const defShift = makeDefaultShift(openTime, closeTime, openBuffer, closeBuffer)
    setDayTemplates(prev => ({ ...prev, [name]: { shifts: [defShift], openTime, closeTime, openBuffer, closeBuffer } }))
    setActiveTemplate(name)
    setEditingTemplate(name)
  }

  const deleteTemplate = (name) => {
    if (Object.keys(dayTemplates).length <= 1) return
    const updated = { ...dayTemplates }
    delete updated[name]
    const first = Object.keys(updated)[0] || ''

    const updatedWeek = { ...weekTemplate }
    Object.keys(updatedWeek).forEach(day => {
      if (updatedWeek[day].tmpl === name) updatedWeek[day] = { ...updatedWeek[day], tmpl: first }
    })

    setDayTemplates(updated)
    setWeekTemplate(updatedWeek)
    if (activeTemplate === name) setActiveTemplate(first)
    if (editingTemplate === name) setEditingTemplate(null)
  }

  const startRename = (name) => { setEditingName(name); setNewName(name) }

  const finishRename = () => {
    if (!editingName || !newName.trim() || newName === editingName || dayTemplates[newName.trim()]) {
      setEditingName(null); return
    }
    const trimmed = newName.trim()
    const updated = {}
    Object.keys(dayTemplates).forEach(k => { updated[k === editingName ? trimmed : k] = dayTemplates[k] })
    const updatedWeek = { ...weekTemplate }
    Object.keys(updatedWeek).forEach(d => {
      if (updatedWeek[d].tmpl === editingName) updatedWeek[d] = { ...updatedWeek[d], tmpl: trimmed }
    })
    setDayTemplates(updated)
    setWeekTemplate(updatedWeek)
    if (activeTemplate === editingName) setActiveTemplate(trimmed)
    if (editingTemplate === editingName) setEditingTemplate(trimmed)
    setEditingName(null)
  }

  // Week planner
  const toggleDay = (day) => {
    const current = weekTemplate[day] || { on: false, tmpl: Object.keys(dayTemplates)[0] || '' }
    setWeekTemplate(prev => ({ ...prev, [day]: { ...current, on: !current.on } }))
  }

  const assignTemplate = (day, tmpl) => {
    setWeekTemplate(prev => ({ ...prev, [day]: { ...(prev[day] || { on: true }), tmpl } }))
  }

  // Weekly stats
  const weeklyStats = useMemo(() => {
    let totalHours = 0, activeDays = 0
    DAYS.forEach(day => {
      const cfg = weekTemplate[day]
      if (!cfg?.on) return
      activeDays++
      const tmpl = dayTemplates[cfg.tmpl]
      if (!tmpl?.shifts) return
      tmpl.shifts.forEach(s => { totalHours += s.length * s.headcount })
    })
    return { totalHours: Math.round(totalHours), activeDays }
  }, [dayTemplates, weekTemplate])

  const templateNames = Object.keys(dayTemplates)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading shift templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top bar: hours context + save (Weekly Schedule tab only) */}
      {activeTab === 'week' && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex flex-wrap gap-2">
            {(() => {
              const dispOpen = openTime
              const dispClose = closeTime
              const dispOpenBuf = openBuffer
              const dispCloseBuf = closeBuffer
              return (
                <>
                  <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">Open:</span> {formatTime(dispOpen)} – {formatTime(dispClose)}
                  </div>
                  {dispOpenBuf > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      <span className="font-semibold">Prep:</span> {dispOpenBuf}min before
                    </div>
                  )}
                  {dispCloseBuf > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      <span className="font-semibold">Close-down:</span> {dispCloseBuf}min after
                    </div>
                  )}
                </>
              )
            })()}
            <div className="px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-xs text-pink-700">
              <span className="font-semibold">Weekly:</span> {weeklyStats.totalHours}h · {weeklyStats.activeDays} days
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
                Unsaved changes
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Saved
              </span>
            )}
            {saveStatus === 'error' && <span className="text-xs font-medium text-red-600">Save failed</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 ${isDirty ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}
              style={{ background: '#FF1F7D' }}
            >
              {saving ? 'Saving...' : 'Save & Sync'}
            </button>
          </div>
        </div>
      )}

      {/* Nested pill tabs */}
      <div id="tour-templates-tabs" className="flex gap-2">
        {[
          { id: 'day', label: 'Day Templates', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )},
          { id: 'week', label: 'Weekly Schedule', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )},
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === 'week') setEditingTemplate(null) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* DAY TEMPLATES TAB */}
      {activeTab === 'day' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {editingTemplate && dayTemplates[editingTemplate] ? (
            /* ── Editor View ── */
            <>
              <button
                onClick={() => setEditingTemplate(null)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to templates
              </button>

              <div className="flex items-center gap-3 mb-4">
                {editingName === editingTemplate ? (
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={e => e.key === 'Enter' && finishRename()}
                    className="px-3 py-1.5 rounded-lg border-2 border-pink-400 text-lg font-bold font-cal focus:outline-none"
                    style={{ width: Math.max(120, newName.length * 12) }}
                  />
                ) : (
                  <h3 className="text-lg font-bold text-gray-900 font-cal">{editingTemplate}</h3>
                )}
                <button
                  onClick={() => startRename(editingTemplate)}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Rename template"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>

              {(() => {
                const tmpl = dayTemplates[editingTemplate]
                const tmplOpenTime = tmpl.openTime ?? openTime
                const tmplCloseTime = tmpl.closeTime ?? closeTime
                const tmplOpenBuffer = tmpl.openBuffer ?? openBuffer
                const tmplCloseBuffer = tmpl.closeBuffer ?? closeBuffer

                const timeOptions = []
                for (let h = 0; h < 24; h++) {
                  for (const m of [0, 15, 30, 45]) {
                    timeOptions.push(h + m / 60)
                  }
                }

                return (
                  <>
                    <div className="flex items-center gap-3 mb-4 flex-wrap p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Opens</label>
                        <select
                          value={tmplOpenTime}
                          onChange={e => updateTemplateHours(editingTemplate, { openTime: parseFloat(e.target.value) })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 bg-white"
                        >
                          {timeOptions.map(v => <option key={v} value={v}>{formatTime(v)}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Closes</label>
                        <select
                          value={tmplCloseTime}
                          onChange={e => updateTemplateHours(editingTemplate, { closeTime: parseFloat(e.target.value) })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 bg-white"
                        >
                          {timeOptions.map(v => <option key={v} value={v}>{formatTime(v)}</option>)}
                        </select>
                      </div>
                      <div className="w-px h-5 bg-gray-300" />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Prep</span>
                        {BUFFER_OPTIONS.map(m => (
                          <button
                            key={m}
                            onClick={() => updateTemplateHours(editingTemplate, { openBuffer: m })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                              tmplOpenBuffer === m
                                ? 'border-pink-500 bg-pink-50 text-pink-600'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {m === 0 ? '0' : `${m}m`}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Close-down</span>
                        {BUFFER_OPTIONS.map(m => (
                          <button
                            key={m}
                            onClick={() => updateTemplateHours(editingTemplate, { closeBuffer: m })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                              tmplCloseBuffer === m
                                ? 'border-pink-500 bg-pink-50 text-pink-600'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {m === 0 ? '0' : `${m}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <TimelineBuilder
                      shifts={tmpl.shifts || []}
                      shiftLengths={shiftLengths}
                      openTime={tmplOpenTime}
                      closeTime={tmplCloseTime}
                      openBuffer={tmplOpenBuffer}
                      closeBuffer={tmplCloseBuffer}
                      onChange={(newShifts) => updateTemplateShifts(editingTemplate, newShifts)}
                    />
                  </>
                )
              })()}
            </>
          ) : (
            /* ── Card Gallery View ── */
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900 font-cal text-base">Day Templates</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Create shift patterns for different day types</p>
                </div>
                <span className="text-xs text-gray-400 font-medium">{templateNames.length}/{MAX_TEMPLATES}</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {templateNames.map(name => {
                  const tmpl = dayTemplates[name]
                  const tmplOpen = tmpl.openTime ?? openTime
                  const tmplClose = tmpl.closeTime ?? closeTime
                  const tmplOpenBuf = tmpl.openBuffer ?? openBuffer
                  const tmplCloseBuf = tmpl.closeBuffer ?? closeBuffer
                  const totalHours = tmpl.shifts?.reduce((a, s) => a + s.length * s.headcount, 0) || 0
                  const shiftCount = tmpl.shifts?.length || 0

                  return (
                    <div
                      key={name}
                      className="rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
                    >
                      {/* Card header: name + actions */}
                      <div className="flex items-start justify-between mb-3">
                        {editingName === name ? (
                          <input
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onBlur={finishRename}
                            onKeyDown={e => e.key === 'Enter' && finishRename()}
                            className="px-2 py-0.5 rounded border-2 border-pink-400 text-sm font-bold focus:outline-none flex-1 mr-2"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-900 truncate">{name}</span>
                        )}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => startRename(name)}
                            className="w-6 h-6 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
                            title="Rename"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {templateNames.length > 1 && (
                            <button
                              onClick={() => deleteTemplate(name)}
                              className="w-6 h-6 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mini shift preview */}
                      <div className="mb-3">
                        <ShiftMiniPreview
                          shifts={tmpl.shifts}
                          openTime={tmplOpen}
                          closeTime={tmplClose}
                          openBuffer={tmplOpenBuf}
                          closeBuffer={tmplCloseBuf}
                          shiftLengths={shiftLengths}
                        />
                      </div>

                      {/* Stats */}
                      <div className="text-[11px] text-gray-500 font-medium mb-3">
                        {formatTime(tmplOpen)} – {formatTime(tmplClose)} · {shiftCount} shift{shiftCount !== 1 ? 's' : ''} · {Math.round(totalHours)}h
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={() => { setActiveTemplate(name); setEditingTemplate(name) }}
                        className="w-full py-1.5 rounded-lg border border-pink-200 text-xs font-semibold text-pink-600 hover:bg-pink-50 transition-all"
                      >
                        Edit Template
                      </button>
                    </div>
                  )
                })}

                {/* Add template card */}
                {templateNames.length < MAX_TEMPLATES && (
                  <button
                    onClick={addTemplate}
                    className="rounded-xl border-2 border-dashed border-gray-300 p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-pink-400 hover:text-pink-600 transition-all min-h-[160px]"
                  >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-semibold">New Template</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* WEEKLY SCHEDULE TAB */}
      {activeTab === 'week' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 font-cal text-base mb-1">Weekly Schedule</h4>
          <p className="text-sm text-gray-500 mb-4">Assign templates to each day. Toggle days on/off as needed.</p>

          <div className="grid grid-cols-7 gap-2">
            {DAYS.map(day => {
              const config = weekTemplate[day] || { on: false, tmpl: templateNames[0] || '' }
              const isOn = config.on
              const tmpl = dayTemplates[config.tmpl]
              const dayHours = tmpl?.shifts?.reduce((a, s) => a + s.length * s.headcount, 0) || 0

              return (
                <div
                  key={day}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    isOn ? 'border-pink-200 bg-pink-50/30' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">{day}</span>
                    <button
                      onClick={() => toggleDay(day)}
                      className={`w-8 h-5 rounded-full transition-colors relative ${isOn ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {isOn ? (
                    <>
                      <select
                        value={config.tmpl}
                        onChange={e => assignTemplate(day, e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white mb-1.5"
                      >
                        {templateNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      {tmpl?.shifts?.length > 0 && (
                        <div className="mb-1.5">
                          <ShiftMiniPreview
                            shifts={tmpl.shifts}
                            openTime={tmpl.openTime ?? openTime}
                            closeTime={tmpl.closeTime ?? closeTime}
                            openBuffer={tmpl.openBuffer ?? openBuffer}
                            closeBuffer={tmpl.closeBuffer ?? closeBuffer}
                            shiftLengths={shiftLengths}
                          />
                        </div>
                      )}
                      <div className="text-[10px] text-gray-500 font-medium">
                        {tmpl?.shifts?.length || 0} shifts · {Math.round(dayHours)}h
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 font-medium">Closed</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
