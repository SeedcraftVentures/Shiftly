import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase client using the service-role key (bypasses RLS).
// Use this in API routes instead of the anon-key client in lib/supabase.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = url && serviceKey ? createClient(url, serviceKey) : null

// The workspace switcher writes this cookie; getOrgScope reads it to narrow the
// whole app to one location. Single source of truth for the name.
export const ACTIVE_LOCATION_COOKIE = 'shiftly_loc'

// ── Tenancy model: manager-as-org ───────────────────────────────────────────
// One login = one business. An Organization's id IS the manager's Clerk user id.
// To upgrade to real Clerk Organizations later, change ONLY this resolver to
// return auth().orgId and thread it through (the rest of the code is agnostic).
export function organizationIdFor(userId) {
  return userId
}

// Resolve a manager's working scope: their org, the ACTIVE location, its teams.
// The app is per-location (billing is per-location), so a manager works one
// location at a time — chosen via the nav's workspace switcher and stored in a
// cookie. Absent/invalid cookie → the first location. `allLocationIds` is also
// returned for the rare consumer that genuinely needs every location (e.g. billing).
// Returns { organizationId, locationIds, teamIds, allLocationIds, activeLocationId }.
export async function getOrgScope(userId) {
  const organizationId = organizationIdFor(userId)

  const { data: locations, error: locErr } = await supabaseAdmin
    .from('Locations')
    .select('location_id')
    .eq('organization_id', organizationId)
  if (locErr) throw locErr
  const allLocationIds = (locations || []).map((l) => l.location_id)

  // Active location: cookie if valid, else the first location.
  let activeLocationId = allLocationIds[0] || null
  try {
    const store = await cookies()
    const v = store.get(ACTIVE_LOCATION_COOKIE)?.value
    if (v && allLocationIds.includes(v)) activeLocationId = v
  } catch {
    // cookies() unavailable outside a request scope — fall back to first location
  }
  const locationIds = activeLocationId ? [activeLocationId] : []

  let teamIds = []
  if (locationIds.length > 0) {
    const { data: teams, error: teamErr } = await supabaseAdmin
      .from('Teams')
      .select('team_id')
      .in('location_id', locationIds)
    if (teamErr) throw teamErr
    teamIds = (teams || []).map((t) => t.team_id)
  }

  return { organizationId, locationIds, teamIds, allLocationIds, activeLocationId }
}
