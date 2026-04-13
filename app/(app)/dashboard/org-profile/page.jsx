'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/app/wrappers/PageHeader'
import {
  PageContainer,
  TextField,
  NumberField,
  SelectableCard,
  Chip,
  DayHoursRow,
  CopyToPopover,
  ToggleRow,
  Spinner,
} from '@/app/components/ui'
import Button from '@/app/components/Button'
import { PlusIcon, TrashIcon, ChevronDownIcon } from '@/app/lib/icons'
import {
  IndustryHospitalityIcon,
  IndustryRetailIcon,
  IndustryOtherIcon,
} from '@/app/lib/icons'
import { INDUSTRIES } from '@/app/lib/constants/industries'
import { DAYS_FULL } from '@/app/lib/constants/days'
import { assignTeamColors } from '@/app/lib/shiftUtils'
import { convertTimetzToTime, convertTimeToTimetz } from '@/app/lib/timeUtils'

const INDUSTRY_ICONS = {
  Hospitality: <IndustryHospitalityIcon />,
  Retail: <IndustryRetailIcon />,
  Other: <IndustryOtherIcon />,
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 className="heading-section" style={{ color: 'var(--gray-800)', marginBottom: 16 }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function FieldRow({ label, children, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
      <div style={{ width: 160, flexShrink: 0, paddingTop: 10 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function OrgProfilePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Load ────────────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/org-profile')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // ── Save helpers ────────────────────────────────────────────────────────────

  const patchOrg = async (updates) => {
    const res = await fetch('/api/org-profile/organization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to save')
    const saved = await res.json()
    setData(prev => ({ ...prev, organization: saved }))
  }

  const patchLocation = async (updates) => {
    const res = await fetch('/api/org-profile/location', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to save')
    const saved = await res.json()
    setData(prev => ({ ...prev, location: saved }))
  }

  const patchLocationHours = async (payload) => {
    const res = await fetch('/api/org-profile/location-hours', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to save')
    await reload()
  }

  const patchRules = async (updates) => {
    const res = await fetch('/api/org-profile/location-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to save')
    const saved = await res.json()
    setData(prev => ({ ...prev, locationRules: saved }))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner />
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--red-500)' }}>{error}</div>
      </PageContainer>
    )
  }

  if (!data?.isOwner) {
    return (
      <PageContainer>
        <PageHeader title="Organization" />
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'var(--gray-50)',
          borderRadius: 12,
          marginTop: 24,
        }}>
          <h3 className="heading-subsection" style={{ color: 'var(--gray-600)' }}>
            Only the organization owner can edit this page
          </h3>
          <p className="body-small" style={{ color: 'var(--gray-400)', marginTop: 8 }}>
            Contact the owner to make changes to organization settings.
          </p>
        </div>
      </PageContainer>
    )
  }

  const { organization, location, locationHours, locationRules, teams, teamHours } = data
  const rules = locationRules || {}

  return (
    <PageContainer>
      <PageHeader
        title="Organization"
        subtitle="Manage your organization, location, and team settings"
      />

      <div style={{ marginTop: 24 }}>
        {/* Section A — Organization */}
        <SectionOrganization organization={organization} onSave={patchOrg} />

        {/* Section B — Location */}
        <SectionLocation location={location} onSave={patchLocation} />

        {/* Section C — Operating Hours */}
        <SectionOperatingHours
          locationHours={locationHours}
          onSave={patchLocationHours}
        />

        {/* Section D — Scheduling Rules */}
        <SectionRules rules={rules} onSave={patchRules} />

        {/* Section E — Teams */}
        <SectionTeams
          teams={teams}
          teamHours={teamHours}
          locationHours={locationHours}
          onReload={reload}
        />
      </div>
    </PageContainer>
  )
}

// ── Section A: Organization ──────────────────────────────────────────────────

function SectionOrganization({ organization, onSave }) {
  const [name, setName] = useState(organization.organization_name || '')

  return (
    <Section title="Organization">
      <FieldRow label="Organization name">
        <TextField
          value={name}
          onChange={setName}
          onBlur={() => {
            if (name.trim() && name !== organization.organization_name) {
              onSave({ organization_name: name.trim() })
            }
          }}
          size="sm"
          placeholder="Your business name"
        />
      </FieldRow>

      <FieldRow label="Industry">
        <div style={{ display: 'flex', gap: 10 }}>
          {INDUSTRIES.map(ind => (
            <SelectableCard
              key={ind.value}
              selected={organization.industry === ind.value}
              onClick={() => onSave({ industry: ind.value })}
              icon={INDUSTRY_ICONS[ind.value]}
              label={ind.label}
              style={{ flex: 1, padding: '14px 10px' }}
            />
          ))}
        </div>
      </FieldRow>
    </Section>
  )
}

// ── Section B: Location ──────────────────────────────────────────────────────

function SectionLocation({ location, onSave }) {
  const [nickname, setNickname] = useState(location.name || '')
  const [address, setAddress] = useState(location.address || '')
  const [minWage, setMinWage] = useState(location.min_wage ?? '')
  const [maxHours, setMaxHours] = useState(location.max_consecutive_hours ?? '')
  const [shiftLengths, setShiftLengths] = useState(location.shift_lengths || [])
  const [newLength, setNewLength] = useState('')

  const saveField = (field, value) => {
    onSave({ [field]: value })
  }

  const addShiftLength = () => {
    const val = parseFloat(newLength)
    if (!isNaN(val) && val > 0 && !shiftLengths.includes(val)) {
      const updated = [...shiftLengths, val].sort((a, b) => a - b)
      setShiftLengths(updated)
      onSave({ shift_lengths: updated })
      setNewLength('')
    }
  }

  const removeShiftLength = (val) => {
    const updated = shiftLengths.filter(l => l !== val)
    setShiftLengths(updated)
    onSave({ shift_lengths: updated })
  }

  return (
    <Section title="Location">
      <FieldRow label="Location nickname">
        <TextField
          value={nickname}
          onChange={setNickname}
          onBlur={() => nickname.trim() && saveField('name', nickname.trim())}
          size="sm"
          placeholder="e.g. Main Street"
        />
      </FieldRow>

      <FieldRow label="Address">
        <TextField
          value={address}
          onChange={setAddress}
          onBlur={() => address.trim() && saveField('address', address.trim())}
          size="sm"
          placeholder="Full address"
        />
      </FieldRow>

      <FieldRow label="Currency" description="Contact support to change">
        <div
          style={{
            display: 'inline-flex',
            padding: '8px 14px',
            borderRadius: 8,
            background: 'var(--gray-50)',
            border: '1.5px solid var(--gray-200)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-500)',
          }}
        >
          {location.currency || 'GBP'}
        </div>
      </FieldRow>

      <FieldRow label="Min wage">
        <NumberField
          value={minWage}
          onChange={v => setMinWage(v)}
          onBlur={() => saveField('min_wage', minWage === '' ? null : Number(minWage))}
          prefix={location.currency === 'GBP' ? '\u00A3' : location.currency === 'EUR' ? '\u20AC' : '$'}
          step={0.01}
          min={0}
          style={{ width: 120 }}
        />
      </FieldRow>

      <FieldRow label="Max consecutive hours">
        <NumberField
          value={maxHours}
          onChange={v => setMaxHours(v)}
          onBlur={() => saveField('max_consecutive_hours', maxHours === '' ? null : Number(maxHours))}
          step={1}
          min={1}
          style={{ width: 100 }}
        />
      </FieldRow>

      <FieldRow label="Default shift lengths">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {shiftLengths.map(len => (
            <Chip
              key={len}
              color="var(--pink-500)"
              colorLight="var(--pink-50)"
              onRemove={() => removeShiftLength(len)}
            >
              {len}h
            </Chip>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              value={newLength}
              onChange={e => setNewLength(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addShiftLength()}
              placeholder="+ Add"
              step={0.5}
              min={0.5}
              style={{
                width: 70,
                padding: '5px 8px',
                fontSize: 'var(--text-xs)',
                border: '1.5px solid var(--gray-200)',
                borderRadius: 6,
                outline: 'none',
              }}
            />
          </div>
        </div>
      </FieldRow>
    </Section>
  )
}

// ── Section C: Operating Hours ───────────────────────────────────────────────

function SectionOperatingHours({ locationHours, onSave }) {
  // Build hours map from DB rows
  const buildHoursMap = () => {
    const map = {}
    DAYS_FULL.forEach(day => {
      const row = locationHours.find(r => r.day === day)
      if (row) {
        map[day] = {
          open: true,
          opening: convertTimetzToTime(row.opening_time || '09:00:00'),
          closing: convertTimetzToTime(row.closing_time || '17:00:00'),
          first_shift: convertTimetzToTime(row.start_time || '09:00:00'),
          last_shift: convertTimetzToTime(row.end_time || '17:00:00'),
        }
      } else {
        map[day] = { open: false, opening: '09:00', closing: '17:00', first_shift: '09:00', last_shift: '17:00' }
      }
    })
    return map
  }

  const [hours, setHours] = useState(buildHoursMap)

  const handleChange = (day, newData) => {
    setHours(prev => ({ ...prev, [day]: newData }))
  }

  const handleBlur = (day) => {
    const d = hours[day]
    if (!d.open) {
      onSave({ day, open: false })
    } else {
      onSave({
        day,
        open: true,
        opening_time: convertTimeToTimetz(d.opening),
        closing_time: convertTimeToTimetz(d.closing),
        start_time: convertTimeToTimetz(d.first_shift),
        end_time: convertTimeToTimetz(d.last_shift),
      })
    }
  }

  const handleCopyTo = (sourceDay, target) => {
    const source = hours[sourceDay]
    let targetDays = []

    if (target === 'all') targetDays = DAYS_FULL
    else if (target === 'weekdays') targetDays = DAYS_FULL.slice(0, 5)
    else if (target === 'weekends') targetDays = DAYS_FULL.slice(5)
    else targetDays = [target]

    const updated = { ...hours }
    targetDays.forEach(day => {
      updated[day] = { ...source }
    })
    setHours(updated)

    // Save each changed day
    targetDays.forEach(day => {
      const d = updated[day]
      if (!d.open) {
        onSave({ day, open: false })
      } else {
        onSave({
          day,
          open: true,
          opening_time: convertTimeToTimetz(d.opening),
          closing_time: convertTimeToTimetz(d.closing),
          start_time: convertTimeToTimetz(d.first_shift),
          end_time: convertTimeToTimetz(d.last_shift),
        })
      }
    })
  }

  return (
    <Section title="Operating Hours">
      {DAYS_FULL.map(day => (
        <div key={day} onBlur={() => handleBlur(day)}>
          <DayHoursRow
            day={day}
            data={hours[day]}
            onChange={d => handleChange(day, d)}
            onCopyTo={target => handleCopyTo(day, target)}
          />
        </div>
      ))}
    </Section>
  )
}

// ── Section D: Scheduling Rules ──────────────────────────────────────────────

function SectionRules({ rules, onSave }) {
  const [local, setLocal] = useState({
    no_clopening: rules.no_clopening ?? true,
    no_double_shifts: rules.no_double_shifts ?? true,
    fair_weekend_distribution: rules.fair_weekend_distribution ?? true,
    enforce_max_consecutive_days: rules.enforce_max_consecutive_days ?? true,
    max_consecutive_days: rules.max_consecutive_days ?? 6,
    enforce_min_days_off: rules.enforce_min_days_off ?? true,
    min_days_off: rules.min_days_off ?? 1,
    enforce_rest_between_shifts: rules.enforce_rest_between_shifts ?? true,
    min_rest_hours: rules.min_rest_hours ?? 11,
  })

  const update = (field, value) => {
    const next = { ...local, [field]: value }
    setLocal(next)
    onSave({ [field]: value })
  }

  return (
    <Section title="Scheduling Rules">
      <ToggleRow
        label="No clopening"
        description="Prevent close-then-open shifts back-to-back"
        enabled={local.no_clopening}
        onEnabledChange={v => update('no_clopening', v)}
      />
      <ToggleRow
        label="No double shifts"
        description="Prevent two shifts in the same day"
        enabled={local.no_double_shifts}
        onEnabledChange={v => update('no_double_shifts', v)}
      />
      <ToggleRow
        label="Fair weekend distribution"
        description="Distribute weekend shifts evenly across staff"
        enabled={local.fair_weekend_distribution}
        onEnabledChange={v => update('fair_weekend_distribution', v)}
      />
      <ToggleRow
        label="Max consecutive days"
        enabled={local.enforce_max_consecutive_days}
        onEnabledChange={v => update('enforce_max_consecutive_days', v)}
        value={local.max_consecutive_days}
        onValueChange={v => update('max_consecutive_days', v)}
        valueSuffix="days"
      />
      <ToggleRow
        label="Min days off per week"
        enabled={local.enforce_min_days_off}
        onEnabledChange={v => update('enforce_min_days_off', v)}
        value={local.min_days_off}
        onValueChange={v => update('min_days_off', v)}
        valueSuffix="days"
      />
      <ToggleRow
        label="Rest between shifts"
        enabled={local.enforce_rest_between_shifts}
        onEnabledChange={v => update('enforce_rest_between_shifts', v)}
        value={local.min_rest_hours}
        onValueChange={v => update('min_rest_hours', v)}
        valueSuffix="hours"
      />
    </Section>
  )
}

// ── Section E: Teams ─────────────────────────────────────────────────────────

function SectionTeams({ teams, teamHours, locationHours, onReload }) {
  const [newTeamName, setNewTeamName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [expandedTeam, setExpandedTeam] = useState(null)
  const teamsWithColor = assignTeamColors(teams)

  const addTeam = async () => {
    if (!newTeamName.trim()) return
    try {
      await fetch('/api/org-profile/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      })
      setNewTeamName('')
      await onReload()
    } catch (err) {
      console.error('Failed to add team:', err)
    }
  }

  const renameTeam = async (teamId, name) => {
    if (!name.trim()) return
    try {
      await fetch(`/api/org-profile/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      await onReload()
    } catch (err) {
      console.error('Failed to rename team:', err)
    }
  }

  const deleteTeam = async (teamId) => {
    try {
      await fetch(`/api/org-profile/teams/${teamId}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      await onReload()
    } catch (err) {
      console.error('Failed to delete team:', err)
    }
  }

  const saveTeamHours = async (teamId, day, startOverride, endOverride) => {
    try {
      await fetch(`/api/org-profile/teams/${teamId}/hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          start_time_override: startOverride || null,
          end_time_override: endOverride || null,
        }),
      })
      await onReload()
    } catch (err) {
      console.error('Failed to save team hours:', err)
    }
  }

  return (
    <Section title="Teams">
      {teamsWithColor.map((team, idx) => (
        <TeamRow
          key={team.team_id}
          team={team}
          teamHours={teamHours.filter(h => h.team_id === team.team_id)}
          locationHours={locationHours}
          isExpanded={expandedTeam === team.team_id}
          onToggleExpand={() => setExpandedTeam(prev => prev === team.team_id ? null : team.team_id)}
          onRename={(name) => renameTeam(team.team_id, name)}
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={() => setDeleteConfirm(team.team_id)}
          onDeleteCancel={() => setDeleteConfirm(null)}
          onDelete={() => deleteTeam(team.team_id)}
          onSaveHours={(day, s, e) => saveTeamHours(team.team_id, day, s, e)}
        />
      ))}

      {/* Add team row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input
          type="text"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTeam()}
          placeholder="+ Add team"
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 'var(--text-sm)',
            border: '1.5px dashed var(--gray-200)',
            borderRadius: 10,
            outline: 'none',
            color: 'var(--gray-700)',
            background: 'var(--gray-0)',
          }}
        />
        {newTeamName.trim() && (
          <Button variant="primary" size="sm" onClick={addTeam}>Add</Button>
        )}
      </div>
    </Section>
  )
}

function TeamRow({
  team,
  teamHours,
  locationHours,
  isExpanded,
  onToggleExpand,
  onRename,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete,
  onSaveHours,
}) {
  const [name, setName] = useState(team.name)
  const isDeleting = deleteConfirm === team.team_id

  return (
    <div
      style={{
        border: '1.5px solid var(--gray-100)',
        borderRadius: 10,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 4,
            background: team.color,
            flexShrink: 0,
          }}
        />

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => name !== team.name && onRename(name)}
          style={{
            flex: 1,
            border: 'none',
            background: 'none',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-800)',
            outline: 'none',
            padding: '4px 0',
          }}
        />

        <button
          onClick={onToggleExpand}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--gray-200)',
            background: 'var(--gray-0)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--gray-500)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Edit hours
          <ChevronDownIcon
            className="w-3 h-3"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .12s' }}
          />
        </button>

        {!isDeleting ? (
          <button
            onClick={onDeleteConfirm}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gray-300)',
              padding: 4,
            }}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--red-500)', fontWeight: 600 }}>
              Delete {team.name}?
            </span>
            <button
              onClick={onDelete}
              className="btn-danger"
              style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
            >
              Confirm
            </button>
            <button
              onClick={onDeleteCancel}
              style={{
                fontSize: 'var(--text-xs)',
                padding: '4px 10px',
                background: 'none',
                border: '1px solid var(--gray-200)',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--gray-500)',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Expanded hours overrides */}
      {isExpanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--gray-100)' }}>
          <p className="caption" style={{ color: 'var(--gray-400)', margin: '10px 0' }}>
            Override hours for this team. Leave empty to inherit from location.
          </p>
          {DAYS_FULL.map(day => {
            const locRow = locationHours.find(r => r.day === day)
            const teamRow = teamHours.find(r => r.day === day)

            return (
              <TeamDayHourOverride
                key={day}
                day={day}
                locationStart={locRow ? convertTimetzToTime(locRow.start_time) : null}
                locationEnd={locRow ? convertTimetzToTime(locRow.end_time) : null}
                overrideStart={teamRow?.start_time_override ? convertTimetzToTime(teamRow.start_time_override) : ''}
                overrideEnd={teamRow?.end_time_override ? convertTimetzToTime(teamRow.end_time_override) : ''}
                onSave={(s, e) => onSaveHours(day, s ? convertTimeToTimetz(s) : null, e ? convertTimeToTimetz(e) : null)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function TeamDayHourOverride({ day, locationStart, locationEnd, overrideStart, overrideEnd, onSave }) {
  const [start, setStart] = useState(overrideStart)
  const [end, setEnd] = useState(overrideEnd)

  if (!locationStart) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ width: 36, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-300)' }}>
          {day.slice(0, 3)}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-300)', fontStyle: 'italic' }}>
          Location closed
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ width: 36, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-600)' }}>
        {day.slice(0, 3)}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-300)', width: 80 }}>
        ({locationStart} - {locationEnd})
      </span>
      <input
        type="text"
        value={start}
        onChange={e => setStart(e.target.value)}
        onBlur={() => onSave(start, end)}
        placeholder={locationStart}
        style={{
          width: 60,
          padding: '4px 6px',
          fontSize: 'var(--text-xs)',
          border: '1px solid var(--gray-200)',
          borderRadius: 4,
          outline: 'none',
          textAlign: 'center',
          color: start ? 'var(--gray-800)' : 'var(--gray-300)',
        }}
      />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-300)' }}>-</span>
      <input
        type="text"
        value={end}
        onChange={e => setEnd(e.target.value)}
        onBlur={() => onSave(start, end)}
        placeholder={locationEnd}
        style={{
          width: 60,
          padding: '4px 6px',
          fontSize: 'var(--text-xs)',
          border: '1px solid var(--gray-200)',
          borderRadius: 4,
          outline: 'none',
          textAlign: 'center',
          color: end ? 'var(--gray-800)' : 'var(--gray-300)',
        }}
      />
    </div>
  )
}
