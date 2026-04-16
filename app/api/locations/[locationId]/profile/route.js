import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — full profile for a single location (details, hours, rules, teams, team hours)
export async function GET(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    // Fetch location + verify it belongs to an org the user is a member of
    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('*')
      .eq('location_id', locationId)
      .single()

    if (locErr) throw locErr

    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('*')
      .eq('organization_id', location.organization_id)
      .single()

    if (orgErr) throw orgErr

    const { data: membership, error: memErr } = await supabase
      .from(DB_TABLES.organizationMembers)
      .select('member_user_id')
      .eq('organization_id', org.organization_id)
      .eq('member_user_id', userId)
      .maybeSingle()

    if (memErr) throw memErr
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      isOwner: org.owner_user_id === userId,
    })
  } catch (err) {
    console.error('Error fetching location profile:', err)
    return NextResponse.json({ error: 'Failed to fetch location profile' }, { status: 500 })
  }
}