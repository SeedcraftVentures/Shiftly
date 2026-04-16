import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

async function checkOwnerForTeam(supabase, userId, teamId) {
  const { data: team, error: teamErr } = await supabase
    .from(DB_TABLES.teams)
    .select('team_id, location_id')
    .eq('team_id', teamId)
    .single()
  if (teamErr) return { error: teamErr }

  const { data: location, error: locErr } = await supabase
    .from(DB_TABLES.locations)
    .select('organization_id')
    .eq('location_id', team.location_id)
    .single()
  if (locErr) return { error: locErr }

  const { data: org, error: orgErr } = await supabase
    .from(DB_TABLES.organizations)
    .select('owner_user_id')
    .eq('organization_id', location.organization_id)
    .single()
  if (orgErr) return { error: orgErr }

  if (org.owner_user_id !== userId) return { forbidden: true }
  return { team }
}

// PATCH — upsert or clear team day hour overrides
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { teamId } = await params
    const supabase = await createSupabaseServerClient()

    const check = await checkOwnerForTeam(supabase, userId, teamId)
    if (check.error) throw check.error
    if (check.forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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