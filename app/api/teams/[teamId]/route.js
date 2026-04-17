import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * Verify the team belongs to a location in the user's active org.
 * Returns the team + its location_id, or null if not found / not accessible.
 */
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

// PATCH — rename a team
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
    const allowed = ['name']
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from(DB_TABLES.teams)
      .update(update)
      .eq('team_id', teamId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating team:', err)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

// DELETE — delete a team (cascade cleans up Team Day Hours, Staff, Shift Patterns)
export async function DELETE(request, { params }) {
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

    const { error } = await supabase
      .from(DB_TABLES.teams)
      .delete()
      .eq('team_id', teamId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting team:', err)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}