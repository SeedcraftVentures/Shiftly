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

// ── Claiming an account by verified email ───────────────────────────────────
// The manager puts a staff member's work email on the Staff row and marks them
// invited. When that person signs up, Clerk has already VERIFIED they own the
// address, so matching on it is a stronger proof than a token in a URL, which can
// be forwarded or leaked. It also means the mobile apps need no deep-link
// handling at all: sign up with your work email and you are linked.
//
// Only ever links rows with a null user_id, so an account can never be taken over.
export async function claimStaffByEmail(userId, emails) {
  if (!userId || !emails?.length) return null

  const wanted = emails.filter(Boolean).map((e) => e.toLowerCase())
  if (!wanted.length) return null

  const { data: candidates } = await supabaseAdmin
    .from('Staff').select('*').is('user_id', null).not('invite_email', 'is', null)
  const match = (candidates || []).find((s) => wanted.includes(String(s.invite_email).toLowerCase()))
  if (!match) return null

  const { data: linked, error } = await supabaseAdmin
    .from('Staff')
    .update({ user_id: userId, invite_status: 'Accepted' })
    .eq('staff_id', match.staff_id)
    .is('user_id', null) // re-check under the write, so two concurrent claims cannot both win
    .select('*').maybeSingle()
  if (error || !linked) return null

  return withTeam(linked)
}

// Resolve the caller to a staff member, claiming an outstanding invite if this is
// their first sign-in. `emails` comes from Clerk and must be verified addresses.
export async function resolveStaff(userId, emails) {
  return (await getStaffScope(userId)) || (await claimStaffByEmail(userId, emails))
}

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

// Verified email addresses off a Clerk user object.
export function verifiedEmails(user) {
  return (user?.emailAddresses || [])
    .filter((e) => e?.verification?.status === 'verified' || !e?.verification)
    .map((e) => e.emailAddress)
    .filter(Boolean)
}
