import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

async function getTeamInOrg(supabase, teamId, orgId) {
  const { data: team, error } = await supabase
    .from(DB_TABLES.teams)
    .select('team_id, location_id, Locations!inner(organization_id)')
    .eq('team_id', teamId)
    .eq('Locations.organization_id', orgId)
    .maybeSingle()
  if (error) return { error }
  return { team }
}

// PATCH — upsert or clear team day hour overrides
export async function PATCH(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!has({ permission: 'org:staff:manage' })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { teamId } = await params
    const supabase = await createSupabaseServerClient()

    const check = await getTeamInOrg(supabase, teamId, orgId)
    if (check.error) throw check.error
    if (!check.team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const body = await request.json()
    if (!body.day) {
      return NextResponse.json({ error: 'day is required' }, { status: 400 })
    }

    // Both overrides null → delete the row (inherit from location)
    if (!body.start_time_override && !body.end_time_override) {
      const { error } = await supabase
        .from(DB_TABLES.teamDayHours)
        .delete()
        .eq('team_id', teamId)
        .eq('day', body.day)

      if (error) throw error
      return NextResponse.json({ success: true, deleted: true })
    }

    const row = {
      team_id: teamId,
      day: body.day,
      start_time_override: body.start_time_override || null,
      end_time_override: body.end_time_override || null,
    }

    const { data, error } = await supabase
      .from(DB_TABLES.teamDayHours)
      .upsert(row, { onConflict: 'team_id,day' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating team hours:', err)
    return NextResponse.json({ error: 'Failed to update team hours' }, { status: 500 })
  }
}