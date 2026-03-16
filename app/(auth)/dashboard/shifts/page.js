'use client'

import { useState, useMemo, useCallback } from 'react'
import { useShifts } from './hooks/useShifts'
import { DAYS, getTeamGaps, decimalToLabel } from './utils/shifthelpers'
import ShiftFilterBar from './components/ShiftFilterBar'
import WarningBar from './components/WarningBar'
import ShiftPatternList from './components/ShiftPatternList'
import WeekAtAGlance from './components/WeekAtAGlance'
import FixGapsModal from './components/FixGapsModal'

export default function ShiftsPage() {
  const {
    shifts, teams, loading, error,
    openTime, closeTime, shiftLengths,
    addShift, updateShift, deleteShift, addRecommendedShifts,
  } = useShifts()

  const [filterTeamId, setFilterTeamId] = useState('all')
  const [openShiftId, setOpenShiftId] = useState(null)
  const [scrollToId, setScrollToId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const [fixedLocks, setFixedLocks] = useState({})
  const [showFixModal, setShowFixModal] = useState(false)
  const [selectedRecs, setSelectedRecs] = useState({})

  const filteredShifts = useMemo(() =>
    filterTeamId === 'all' ? shifts : shifts.filter(s => s.team_id === parseInt(filterTeamId))
  , [shifts, filterTeamId])

  const teamsToCheck = useMemo(() =>
    filterTeamId === 'all' ? teams : teams.filter(t => t.id === parseInt(filterTeamId))
  , [teams, filterTeamId])

  const warnings = useMemo(() => {
    const w = []
    DAYS.forEach((day, di) => {
      teamsToCheck.forEach(team => {
        getTeamGaps(shifts, team.id, di).forEach(g => {
          w.push({ teamId: team.id, teamName: team.team_name, teamColor: team.color, day, di, from: decimalToLabel(g.s), to: decimalToLabel(g.e) })
        })
      })
    })
    return w
  }, [shifts, teamsToCheck])

  const handleAddShift = useCallback(async () => {
    try {
      const newShift = await addShift(filterTeamId)
      if (newShift) {
        setOpenShiftId(newShift.id)
        setScrollToId(newShift.id)
        setTimeout(() => setScrollToId(null), 300)
      }
    } catch (err) { console.error('Failed to add shift:', err) }
  }, [addShift, filterTeamId])

  const handleToggleShift = useCallback((id) => {
    setOpenShiftId(prev => prev === id ? null : id)
  }, [])

  const handleClickShiftCard = useCallback((id) => {
    setOpenShiftId(prev => prev === id ? null : id)
    setScrollToId(id)
    setTimeout(() => setScrollToId(null), 300)
  }, [])

  const handleSetFixedLock = useCallback((id, val) => {
    setFixedLocks(prev => ({ ...prev, [id]: val }))
  }, [])

  const handleConfirmRecs = useCallback(async (recommendations) => {
    try {
      await addRecommendedShifts(recommendations, selectedRecs)
      setShowFixModal(false)
      setSelectedRecs({})
    } catch (err) { console.error('Failed to add recommended shifts:', err) }
  }, [addRecommendedShifts, selectedRecs])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading shifts…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#EF4444', fontSize: 14 }}>{error}</div>
      </div>
    )
  }

  // Shared inner layout — constrains all content to 1000px centred with 24px side padding
  const inner = { maxWidth: 1000, margin: '0 auto', padding: '0 24px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F9FAFB', color: '#111827' }}>

      {/* ── Page header ── */}
      <div style={{ background: '#F9FAFB', paddingTop: 28, paddingBottom: 0 }}>
        <div style={inner}>
          <h1 style={{
            fontFamily: "'Cal Sans', 'Plus Jakarta Sans', sans-serif",
            fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px',
          }}>Shifts</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
            Define your shift patterns — the solver uses these to build rotas automatically.
          </p>
        </div>
      </div>

      {/* ── Sticky filter + warning bar ── */}
      <div style={{ background: '#F9FAFB', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30, paddingBottom: 8 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <ShiftFilterBar
              teams={teams} shifts={shifts} filterTeamId={filterTeamId}
              onFilterChange={setFilterTeamId} onAddShift={handleAddShift}
            />
          </div>
          <WarningBar
            warnings={warnings} onDayClick={setSelectedDay}
            onFixGaps={() => { setSelectedRecs({}); setShowFixModal(true) }}
          />
        </div>
      </div>

<<<<<<< HEAD
        {/* Header with Total Hours Badge */}
        <div className="mb-8 flex items-end justify-end">
          {shifts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-sm">
              <div className="body-small text-gray-600 mb-1">Total Hours per Week</div>
              <div className="text-3xl font-bold text-gray-900">{totalHours}h</div>
              <div className="caption mt-1">Must match total staff hours</div>
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {selectedShifts.size > 0 && (
              <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                Delete Selected ({selectedShifts.size})
              </Button>
            )}
          </div>
          <Button onClick={openAddModal} disabled={!selectedTeamId} variant="primary">
            + Add Shift Pattern
          </Button>
        </div>

        {/* Shifts Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200/60">
                <th className="px-6 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedShifts.size === grouped.length && grouped.length > 0}
                    onChange={toggleSelectAll}
                    disabled={!selectedTeamId || grouped.length === 0}
                    className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2 disabled:opacity-50"
                  />
                </th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700 sticky left-0 bg-gray-50">SHIFT NAME</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">DAYS</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">TIME</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">STAFF REQUIRED</th>
                <th className="px-6 py-4 text-right body-small font-semibold text-gray-700">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60">
              {!selectedTeamId ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="body-text font-medium mb-1">Select a team to manage shifts</p>
                    <p className="body-small">Choose a team from the dropdown above</p>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : grouped.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="body-text font-medium mb-1">No shift patterns yet</p>
                    <p className="body-small">Create your first shift pattern to get started</p>
                  </td>
                </tr>
              ) : (
                grouped.map((group, idx) => (
                  <React.Fragment key={group.key}>
                    <tr className={`hover:bg-gray-50/50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/30' : ''} ${expandedGroups[group.key] ? 'bg-gray-50/30' : ''}`}>
                      {/* Checkbox */}
                      <td className="px-6 py-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedShifts.has(group.key)}
                          onChange={() => toggleSelectShift(group.key)}
                          className="w-4 h-4 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                        />
                      </td>

                      {/* Shift Name - white background */}
                      <td className="px-6 py-4 sticky left-0 bg-white">
                        <button
                          onClick={() => toggleExpand(group.key)}
                          className="flex items-center space-x-2 group"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${expandedGroups[group.key] ? 'rotate-90' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="body-text font-medium group-hover:text-pink-600 transition-colors">
                            {group.shift_name}
                          </span>
                        </button>
                      </td>

                      {/* Days */}
                      <td className="px-6 py-4">
                        <span className="body-small text-gray-600">{formatDays(group.shifts)}</span>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4">
                        <span className="body-small">{group.start_time} - {group.end_time}</span>
                      </td>

                      {/* Staff Required */}
                      <td className="px-6 py-4">
                        <Badge variant="info" size="sm">{group.staff_required} staff</Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => openEditGroupModal(group)}
                            className="btn-icon text-gray-600 hover:text-pink-600 transition-colors"
                            title="Edit All"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteGroup(group.shifts)}
                            className="btn-icon text-gray-600 hover:text-red-600 transition-colors"
                            title="Delete All"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Days */}
                    {expandedGroups[group.key] && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/60">
                          <div className="ml-12">
                            <p className="caption font-semibold uppercase tracking-wide mb-3">Active Days</p>
                            <div className="flex flex-wrap gap-2">
                              {sortDays(group.shifts).map((shift) => (
                                <Badge key={shift.id} variant="default" size="sm">{shift.day_of_week}</Badge>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="heading-page">
                {editingShift ? 'Edit Shift' : editingGroup ? 'Edit Shift Pattern' : 'Add Shift Pattern'}
              </h2>
              <button 
                onClick={() => { setShowModal(false); setEditingShift(null); setEditingGroup(null) }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block body-text font-semibold mb-2">Shift Name</label>
                  <input
                    type="text"
                    required
                    value={formData.shift_name}
                    onChange={(e) => setFormData({...formData, shift_name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="e.g., Morning Shift"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block body-text font-semibold">
                      {editingShift ? 'Day of Week' : 'Days of Week'}
                    </label>
                    {!editingShift && (
                      <div className="flex gap-2">
                        <button type="button" onClick={selectAllDays} className="caption font-medium text-pink-600 hover:text-pink-700 transition-colors">Select All</button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={deselectAllDays} className="caption font-medium text-gray-600 hover:text-gray-700 transition-colors">Clear</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-3 rounded-lg body-small font-medium transition-all ${
                          formData.day_of_week.includes(day)
                            ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="caption mt-2">
                    {editingShift 
                      ? 'Select the day for this shift' 
                      : formData.day_of_week.length === 0
                      ? 'Select the days this shift runs'
                      : `Selected: ${formData.day_of_week.length} day${formData.day_of_week.length > 1 ? 's' : ''}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block body-text font-semibold mb-2">Start Time</label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block body-text font-semibold mb-2">End Time</label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block body-text font-semibold mb-2">Staff Required</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.staff_required}
                    onChange={(e) => setFormData({...formData, staff_required: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingShift(null); setEditingGroup(null) }} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  {editingShift ? 'Update Shift' : editingGroup ? 'Update Pattern' : 'Add Shift Pattern'}
                </Button>
              </div>
            </form>
=======
      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 16, paddingBottom: 24 }}>
        <div style={inner}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ShiftPatternList
              teams={teams} shifts={shifts} filteredShifts={filteredShifts}
              openShiftId={openShiftId} onToggleShift={handleToggleShift}
              onUpdateShift={updateShift} onDeleteShift={deleteShift}
              fixedLocks={fixedLocks} onSetFixedLock={handleSetFixedLock}
              shiftLengths={shiftLengths} openTime={openTime} closeTime={closeTime}
              scrollToId={scrollToId}
            />
            <WeekAtAGlance
              teams={teamsToCheck} allShifts={shifts} filteredShifts={filteredShifts}
              selectedDay={selectedDay} openShiftId={openShiftId} warnings={warnings}
              onSelectDay={setSelectedDay} onClickShift={handleClickShiftCard}
            />
>>>>>>> V1
          </div>
        </div>
      </div>

      {showFixModal && (
        <FixGapsModal
          allShifts={shifts} teams={teamsToCheck} selectedRecs={selectedRecs}
          onToggleRec={(recId) => setSelectedRecs(prev => ({ ...prev, [recId]: !prev[recId] }))}
          onConfirm={handleConfirmRecs}
          onClose={() => setShowFixModal(false)}
        />
      )}
    </div>
  )
}