import { DB_TABLES, DEFAULT_SHIFT_LENGTHS, DEFAULT_MAX_CONSECUTIVE_HOURS, DEFAULT_LOCATION_RULES, DEFAULT_STAFF } from '@/app/lib/constants'
import { convertTimeToTimetz } from '@/app/lib/timeUtils'

/**
 * Creates a fully-configured location with all its children:
 *   Locations → Location Day Hours → Location Rules → Teams_new → Staff_new
 *
 * Used by both the onboarding route (which also creates the org first) and
 * the add-location route (which adds to an existing org).
 *
 * @param {object} supabase - An authenticated Supabase client
 * @param {string} organizationId
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} [payload.address]
 * @param {string} [payload.currency]        - null/undefined = inherit from org
 * @param {number} [payload.min_wage]
 * @param {object} payload.operating_hours   - { [dayName]: { open, opening, closing, first_shift, last_shift } }
 * @param {Array}  payload.teams             - [{ id, label }, ...]
 * @param {object} [payload.staff_by_team]   - { [teamClientId]: [name, name, ...] }
 *
 * @returns {{ locationId: string }}
 * @throws on any Supabase error
 */
export async function createLocationWithChildren(supabase, organizationId, payload) {
  const {
    name,
    address = '',
    currency = null,
    min_wage = null,
    operating_hours = {},
    teams = [],
    staff_by_team = {},
  } = payload

  if (!name?.trim()) {
    throw new Error('Location name is required')
  }
  if (!teams?.length) {
    throw new Error('At least one team is required')
  }

  // 1. Locations
  const { data: location, error: locErr } = await supabase
    .from(DB_TABLES.locations)
    .insert({
      name: name.trim(),
      address: address.trim(),
      organization_id: organizationId,
      currency: currency || null,
      min_wage: min_wage ?? null,
      shift_lengths: DEFAULT_SHIFT_LENGTHS,
      max_consecutive_hours: DEFAULT_MAX_CONSECUTIVE_HOURS,
    })
    .select('location_id')
    .single()

  if (locErr) throw locErr
  const locationId = location.location_id

  // 2. Location Day Hours (one row per open day)
  const dayEntries = Object.entries(operating_hours)
  const openDays = dayEntries.filter(([, d]) => d?.open)

  if (openDays.length > 0) {
    const dayRows = openDays.map(([day, d]) => ({
      location_id: locationId,
      day,
      opening_time: convertTimeToTimetz(d.opening),
      closing_time: convertTimeToTimetz(d.closing),
      start_time: convertTimeToTimetz(d.first_shift),
      end_time: convertTimeToTimetz(d.last_shift),
    }))

    const { error: dayErr } = await supabase
      .from(DB_TABLES.locationDayHours)
      .insert(dayRows)

    if (dayErr) throw dayErr
  }

  // 3. Location Rules (defaults)
  const { error: rulesErr } = await supabase
    .from(DB_TABLES.locationRules)
    .insert({
      location_id: locationId,
      ...DEFAULT_LOCATION_RULES,
    })

  if (rulesErr) throw rulesErr

  // 4. Teams
  const teamRows = teams.map(t => ({
    name: t.label,
    location_id: locationId,
  }))

  const { data: insertedTeams, error: teamsErr } = await supabase
    .from(DB_TABLES.teamsNew)
    .insert(teamRows)
    .select('team_id, name')

  if (teamsErr) throw teamsErr

  // 5. Staff (optional; only for teams that have names provided)
  if (staff_by_team && Object.keys(staff_by_team).length > 0) {
    // Map the client-side team IDs (e.g. "foh", "custom_123") to real team_ids
    const teamLabelToId = {}
    teams.forEach((t, i) => {
      if (insertedTeams[i]) {
        teamLabelToId[t.id] = insertedTeams[i].team_id
      }
    })

    const staffRows = []
    for (const [teamClientId, names] of Object.entries(staff_by_team)) {
      const teamId = teamLabelToId[teamClientId]
      if (!teamId || !Array.isArray(names)) continue
      for (const name of names) {
        if (!name.trim()) continue
        staffRows.push({
          name: name.trim(),
          team_id: teamId,
          ...DEFAULT_STAFF,
        })
      }
    }

    if (staffRows.length > 0) {
      const { error: staffErr } = await supabase
        .from(DB_TABLES.staffNew)
        .insert(staffRows)

      if (staffErr) throw staffErr
    }
  }

  return { locationId }
}