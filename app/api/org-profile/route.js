import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// ── GET ── Full org profile payload for the current user's organization
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    // Get user's org membership
    const { data: member, error: memErr } = await supabase
      .from(DB_TABLES.organizationMembers)
      .select('organization_id')
      .eq('member_user_id', userId)
      .single()

    if (memErr) throw memErr

    const orgId = member.organization_id

    // Get organization
    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (orgErr) throw orgErr

    // Get location (single for now)
    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('*')
      .eq('organization_id', orgId)
      .limit(1)
      .single()

    if (locErr) throw locErr

    const locationId = location.location_id

    // Parallel fetch: location hours, location rules, teams, team hours
    const [hoursRes, rulesRes, teamsRes, teamHoursRes] = await Promise.all([
      supabase
        .from(DB_TABLES.locationDayHours)
        .select('*')
        .eq('location_id', locationId),
      supabase
        .from(DB_TABLES.locationRules)
        .select('*')
        .eq('location_id', locationId)
        .single(),
      supabase
        .from(DB_TABLES.teamsNew)
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true }),
      supabase
        .from(DB_TABLES.teamDayHours)
        .select('*'),
    ])

    if (hoursRes.error) throw hoursRes.error
    if (rulesRes.error && rulesRes.error.code !== 'PGRST116') throw rulesRes.error
    if (teamsRes.error) throw teamsRes.error
    if (teamHoursRes.error) throw teamHoursRes.error

    return NextResponse.json({
      organization: org,
      location,
      locationHours: hoursRes.data || [],
      locationRules: rulesRes.data || null,
      teams: teamsRes.data || [],
      teamHours: teamHoursRes.data || [],
      isOwner: org.owner_user_id === userId,
    })
  } catch (error) {
    console.error('Error fetching org profile:', error)
    return NextResponse.json({ error: 'Failed to fetch org profile' }, { status: 500 })
  }
}
