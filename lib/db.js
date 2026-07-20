import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

// Server-side Supabase client using the service-role key (bypasses RLS).
// Use this in API routes instead of the anon-key client in lib/supabase.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = url && serviceKey ? createClient(url, serviceKey) : null

// The workspace switcher writes this cookie; getOrgScope reads it to narrow the
// whole app to one location. Single source of truth for the name.
export const ACTIVE_LOCATION_COOKIE = 'shiftly_loc'

// Native clients cannot set the cookie the web switcher writes, so they send the
// active location as a header instead. Without this, a mobile request from a
// manager with several venues would silently fall back to "the first location"
// and return another site's data with no error.
export const ACTIVE_LOCATION_HEADER = 'x-shiftly-location'

// ── Tenancy model: manager-as-org ───────────────────────────────────────────
// One login = one business. An Organization's id IS the manager's Clerk user id.
// To upgrade to real Clerk Organizations later, change ONLY this resolver to
// return auth().orgId and thread it through (the rest of the code is agnostic).
export function organizationIdFor(userId) {
  return userId
}

// Resolve a manager's working scope: their org, the ACTIVE location, its teams.
// The app is per-location (billing is per-location), so a manager works one
// location at a time, chosen via the nav's workspace switcher and stored in a
// cookie. Absent/invalid cookie → the first location. `allLocationIds` is also
// returned for the rare consumer that genuinely needs every location (e.g. billing).
// Returns { organizationId, locationIds, teamIds, allLocationIds, activeLocationId }.
//
// Precedence for the active location: explicit argument, then the
// X-Shiftly-Location header (native clients), then the cookie (web switcher),
// then the first location.
//
// An explicit argument or header naming a location the caller does not own
// THROWS rather than falling back. Silently serving a different venue's rota to
// someone who asked for a specific one is worse than an error: they could
// approve a swap against the wrong site and never know.
export async function getOrgScope(userId, { locationId } = {}) {
  const organizationId = organizationIdFor(userId)

  const { data: locations, error: locErr } = await supabaseAdmin
    .from('Locations')
    .select('location_id')
    .eq('organization_id', organizationId)
  if (locErr) throw locErr
  const allLocationIds = (locations || []).map((l) => l.location_id)

  const owns = (id) => Boolean(id) && allLocationIds.includes(id)

  let activeLocationId = allLocationIds[0] || null
  let requested = locationId || null

  if (!requested) {
    try {
      const h = await headers()
      requested = h.get(ACTIVE_LOCATION_HEADER) || null
    } catch {
      // headers() unavailable outside a request scope
    }
  }

  if (requested) {
    if (!owns(requested)) {
      throw new Error(`Location ${requested} does not belong to this organization`)
    }
    activeLocationId = requested
  } else {
    // Web: the switcher's cookie. An invalid cookie is stale rather than
    // hostile (a deleted location, a shared browser), so it falls back quietly.
    try {
      const store = await cookies()
      const v = store.get(ACTIVE_LOCATION_COOKIE)?.value
      if (owns(v)) activeLocationId = v
    } catch {
      // cookies() unavailable outside a request scope, fall back to first location
    }
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
