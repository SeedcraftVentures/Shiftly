import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — full profile for a single location (details, hours, rules, teams, team hours)
export async function GET(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    // Verify the location belongs to the user's active org.
    // RLS already filters, but we want an explicit 403/404 rather than an empty result.
    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('*')
      .eq('location_id', locationId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (locErr) throw locErr
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (orgErr) throw orgErr

    // Parallel fetch everything scoped to this location
    const [hoursRes, rulesRes, teamsRes, teamHoursRes] = await Promise.all([
      supabase
        .from(DB_TABLES.locationDayHours)
        .select('*')
        .eq('location_id', locationId),
      supabase
        .from(DB_TABLES.locationRules)
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle(),
      supabase
        .from(DB_TABLES.teams)
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true }),
      supabase
        .from(DB_TABLES.teamDayHours)
        .select('*'),
    ])

    if (hoursRes.error) throw hoursRes.error
    if (rulesRes.error) throw rulesRes.error
    if (teamsRes.error) throw teamsRes.error
    if (teamHoursRes.error) throw teamHoursRes.error

    // Filter team hours to only the teams in this location
    const teamIds = new Set((teamsRes.data || []).map(t => t.team_id))
    const filteredTeamHours = (teamHoursRes.data || []).filter(th => teamIds.has(th.team_id))

    return NextResponse.json({
      organization: org,
      location,
      locationHours: hoursRes.data || [],
      locationRules: rulesRes.data || null,
      teams: teamsRes.data || [],
      teamHours: filteredTeamHours,
      // UI permission gates
      canManageLocations: has({ permission: 'org:locations:manage' }),
      canManageStaff: has({ permission: 'org:staff:manage' }),
      canManageSettings: has({ permission: 'org:settings:manage' }),
    })
  } catch (err) {
    console.error('Error fetching location profile:', err)
    return NextResponse.json({ error: 'Failed to fetch location profile' }, { status: 500 })
  }
}