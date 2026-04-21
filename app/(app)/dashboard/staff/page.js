'use client'

import { useState, useMemo, useCallback } from 'react'
import { useStaff } from './hooks/useStaff'
import { DAYS } from './utils/staffHelpers'
import StaffFilterBar from './components/StaffFilterBar'
import StaffWarningBar from './components/StaffWarningBar'
import StaffList from './components/StaffList'
import AvailabilityGrid from './components/AvailabilityGrid'
import FixIssuesModal from './components/FixIssuesModal'

export default function StaffPage() {
  const {
    staff, teams, shifts, loading, error,
    legalLimit, minWage, totalContractedHours,
    warnings, coverageMetrics,
    addStaff, updateStaff, deleteStaff, updateAvailabilityGrid,
  } = useStaff()

  const [filterTeamId, setFilterTeamId] = useState('all')
  const [openStaffId, setOpenStaffId] = useState(null)
  const [scrollToId, setScrollToId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [showFixModal, setShowFixModal] = useState(false)
  const [selectedFixes, setSelectedFixes] = useState({})

  const filteredStaff = useMemo(() =>
    filterTeamId === 'all' ? staff : staff.filter(s => s.team_id === parseInt(filterTeamId))
  , [staff, filterTeamId])

  const teamsToShow = useMemo(() =>
    filterTeamId === 'all' ? teams : teams.filter(t => t.id === parseInt(filterTeamId))
  , [teams, filterTeamId])

  const shiftLengths = useMemo(() => {
    const lengths = new Set()
    teams.forEach(t => { if (Array.isArray(t.shift_lengths)) t.shift_lengths.forEach(l => lengths.add(l)) })
    if (lengths.size === 0) return [4, 6, 8, 10, 12]
    return Array.from(lengths).sort((a, b) => a - b)
  }, [teams])

  const handleAddStaff = useCallback(async () => {
    try {
      const newMember = await addStaff(filterTeamId)
      if (newMember) {
        setOpenStaffId(newMember.id)
        setSelectedStaffId(newMember.id)
        setScrollToId(newMember.id)
        setTimeout(() => setScrollToId(null), 300)
      }
    } catch (err) { console.error('Failed to add staff:', err) }
  }, [addStaff, filterTeamId])

  const handleToggleStaff = useCallback((id) => {
    setOpenStaffId(prev => {
      const newOpen = prev === id ? null : id
      if (newOpen) setSelectedStaffId(id)
      return newOpen
    })
  }, [])

  const handleSelectStaffInGrid = useCallback((staffId) => {
    setSelectedStaffId(staffId)
  }, [])

  const handleWarningStaffClick = useCallback((staffId) => {
    setOpenStaffId(staffId)
    setSelectedStaffId(staffId)
    setScrollToId(staffId)
    setTimeout(() => setScrollToId(null), 300)
  }, [])

  const handleConfirmFixes = useCallback(async () => {
    const fixKeys = Object.keys(selectedFixes).filter(k => selectedFixes[k])
    for (const key of fixKeys) {
      const [staffId] = key.split('-')
      const warning = warnings.find(w => w.staffId === parseInt(staffId))
      if (!warning) continue
      if (warning.type === 'issue') {
        const grid = {}
        DAYS.forEach(d => { grid[d] = 'available' })
        try { await updateAvailabilityGrid(parseInt(staffId), grid) } catch { /* continue */ }
      }
    }
    setShowFixModal(false)
    setSelectedFixes({})
  }, [selectedFixes, warnings, updateAvailabilityGrid])

  const inner = { maxWidth: 1000, margin: '0 auto', padding: '0 24px' }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading staff…</div>
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: '#F9FAFB', color: '#111827',
    }}>

      {/* ── Page header ── */}
      <div style={{ background: '#F9FAFB', paddingTop: 28, paddingBottom: 0 }}>
        <div style={inner}>
          <h1 style={{
            fontFamily: "'Cal Sans', 'Plus Jakarta Sans', sans-serif",
            fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px',
          }}>Staff</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
            Manage your team members, contracted hours, and availability for rota generation.
          </p>
        </div>
      </div>

      {/* ── Sticky filter + warning bar ── */}
      <div style={{
        background: '#F9FAFB', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 30, paddingBottom: 8,
      }}>
        <div style={{ ...inner, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '0 18px' }}>
            <StaffFilterBar
              teams={teams}
              staff={staff}
              filterTeamId={filterTeamId}
              totalContractedHours={totalContractedHours}
              coverageMetrics={coverageMetrics}
              onFilterChange={setFilterTeamId}
              onAddStaff={handleAddStaff}
            />
          </div>
          <StaffWarningBar
            warnings={warnings}
            coverageMetrics={coverageMetrics}
            onStaffClick={handleWarningStaffClick}
            onFixIssues={() => { setSelectedFixes({}); setShowFixModal(true) }}
          />
        </div>
      </div>

<<<<<<< HEAD
        {/* Header with Total Hours Badge */}
        <div className="mb-8 flex items-end justify-end">
          {staff.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-sm">
              <div className="body-small text-gray-600 mb-1">Total Contracted Hours</div>
              <div className="text-3xl font-bold text-gray-900">{totalHours}h</div>
              <div className="caption mt-1">Must match total shift hours</div>
            </div>
          )}
        </div>

        {/* Add Staff Button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={openAddModal}
            disabled={!selectedTeamId}
            variant="primary"
          >
            + Add Staff Member
          </Button>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200/60">
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700 sticky left-0 bg-gray-50">NAME</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">EMAIL</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">ROLE</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">AVAILABILITY</th>
                <th className="px-6 py-4 text-left body-small font-semibold text-gray-700">HOURS/WEEK</th>
                <th className="px-6 py-4 text-right body-small font-semibold text-gray-700">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60">
              {!selectedTeamId ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="body-text font-medium mb-1">Select a team to manage staff</p>
                    <p className="body-small">Choose a team from the dropdown above</p>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="body-text font-medium mb-1">No staff members yet</p>
                    <p className="body-small">Add your first team member to get started</p>
                  </td>
                </tr>
              ) : (
                staff.map((member, idx) => (
                  <tr key={member.id} className={`hover:bg-gray-50/50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                    {/* Name - white background */}
                    <td className="px-6 py-4 sticky left-0 bg-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="body-text font-medium text-gray-900">{member.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      <span className="body-small text-gray-600">{member.email}</span>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <Badge variant="default" size="sm">
                        {member.role}
                      </Badge>
                    </td>

                    {/* Availability */}
                    <td className="px-6 py-4">
                      <span className="body-small text-gray-600">
                        {getAvailabilityDisplay(member.availability)}
                      </span>
                    </td>

                    {/* Hours */}
                    <td className="px-6 py-4">
                      <Badge variant="info" size="sm">
                        {member.contracted_hours}h/week
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openEditModal(member)}
                          className="btn-icon text-gray-600 hover:text-pink-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(member.id)}
                          className="btn-icon text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
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
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false)
                  setEditingStaff(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block body-text font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="John Smith"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block body-text font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block body-text font-semibold mb-2">Role</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="e.g., Server, Barista, Manager"
                  />
                </div>

                {/* Contracted Hours */}
                <div>
                  <label className="block body-text font-semibold mb-2">Contracted Hours per Week</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="168"
                    value={formData.contracted_hours}
                    onChange={(e) => setFormData({...formData, contracted_hours: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="40"
                  />
                </div>

                {/* Availability */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block body-text font-semibold">Weekly Availability</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllDays}
                        className="caption font-medium text-pink-600 hover:text-pink-700 transition-colors"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={deselectAllDays}
                        className="caption font-medium text-gray-600 hover:text-gray-700 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map((day) => {
                      const availability = JSON.parse(formData.availability)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleAvailability(day)}
                          className={`px-4 py-3 rounded-lg body-small font-medium transition-all ${
                            availability[day]
                              ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  <p className="caption mt-2">
                    Select the days this person is available to work
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false)
                    setEditingStaff(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
                </Button>
              </div>
            </form>
=======
      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 8, paddingBottom: 24 }}>
        <div style={inner}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StaffList
              teams={teamsToShow}
              staff={staff}
              filteredStaff={filteredStaff}
              openStaffId={openStaffId}
              onToggleStaff={handleToggleStaff}
              onUpdateStaff={updateStaff}
              onDeleteStaff={deleteStaff}
              legalLimit={legalLimit}
              minWage={minWage}
              shiftLengths={shiftLengths}
              scrollToId={scrollToId}
            />
            <AvailabilityGrid
              teams={teamsToShow}
              staff={staff}
              filteredStaff={filteredStaff}
              shifts={shifts}
              selectedDay={selectedDay}
              selectedStaffId={selectedStaffId}
              warnings={warnings}
              onSelectDay={setSelectedDay}
              onSelectStaff={handleSelectStaffInGrid}
              onUpdateAvailability={updateAvailabilityGrid}
            />
>>>>>>> V1
          </div>
        </div>
      </div>

      {/* ── Fix Issues Modal ── */}
      {showFixModal && (
        <FixIssuesModal
          warnings={warnings}
          teams={teams}
          coverageMetrics={coverageMetrics}
          selectedFixes={selectedFixes}
          onToggleFix={(key) => setSelectedFixes(prev => ({ ...prev, [key]: !prev[key] }))}
          onConfirm={handleConfirmFixes}
          onClose={() => setShowFixModal(false)}
        />
      )}
    </div>
  )
}