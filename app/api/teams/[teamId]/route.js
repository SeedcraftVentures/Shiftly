import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// Helper: verify the current user owns the org this team belongs to
async function checkOwnerForTeam(supabase, userId, teamId) {
  const { data: team, error: teamErr } = await supabase
    .from(DB_TABLES.teamsNew)
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

// PATCH — rename a team
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
    const allowed = ['name']
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from(DB_TABLES.teamsNew)
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

// DELETE — delete a team (cascades to team_day_hours, staff, shift_patterns via FK)
export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { teamId } = await params
    const supabase = await createSupabaseServerClient()

    const check = await checkOwnerForTeam(supabase, userId, teamId)
    if (check.error) throw check.error
    if (check.forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from(DB_TABLES.teamsNew)
      .delete()
      .eq('team_id', teamId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting team:', err)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}