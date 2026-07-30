import { supabaseAdmin } from '@/lib/db'

// Staff-side counterpart to getOrgScope.
//
// A manager is identified by owning an Organizations row; a staff member is
// identified by their own Clerk id sitting on Staff.user_id. Everything a staff
// member may see hangs off that one row: their team, and through it their location.
//
// Deliberately a separate module from lib/db.js, which is instance A's lane.
//
// Returns null when the caller is not a staff member. Routes should treat that as
// 404 (the employee page renders an "Account Not Linked" screen on 404) rather
// than 401: they are authenticated, just not linked to an employee record.

export async function getStaffScope(userId) {
  if (!userId) return null

  // select('*') rather than a column list: Staff has picked up columns over time
  // (availability, pay_basis, annualised_hours) that exist in the live DB but not
  // in tasks/schema.sql, and naming a missing one would fail the whole query.
  const { data: staff } = await supabaseAdmin
    .from('Staff').select('*').eq('user_id', userId).limit(1)
  const row = staff?.[0]
  if (!row) return null

  return withTeam(row)
}

async function withTeam(row) {
  const { data: team } = await supabaseAdmin
    .from('Teams').select('team_id, name, location_id').eq('team_id', row.team_id).maybeSingle()
  return {
    staff: row,
    staffId: row.staff_id,
    teamId: row.team_id,
    teamName: team?.name || null,
    locationId: team?.location_id || null,
  }
}

// Account linking is done explicitly by the join-by-code flow (lib/joinCode.js +
// /api/staff/claim), which superseded the earlier email-matching approach. This
// module now only resolves an ALREADY-linked staff member; getStaffScope above is
// the single lookup.

// The employee UI predates the schema rename and still expects the old field
// names, so adapt rather than leak raw columns. Mirrors toClient() in
// app/api/staff/route.js.
export function toEmployeeProfile(scope) {
  const s = scope.staff
  return {
    id: s.staff_id,
    team_id: s.team_id,
    team_name: scope.teamName,
    location_id: scope.locationId,
    name: s.name,
    role: s.role || '',
    contracted_hours: s.contracted_hours ?? 0,
    max_hours: s.max_hours ?? null,
    keyholder: !!s.is_keyholder,
    email: s.invite_email || null,
    availability_grid: s.availability || {},
    // The availability modal does `preferredLengths={preferred_shift_length || []}`
    // and maps over it, so this must be an ARRAY.
    preferred_shift_length: s.preferred_shift_lengths || [],
  }
}
