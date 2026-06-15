import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Shape a new-schema Teams row into the superset the frontend expects.
// (Includes legacy aliases id/team_name + onboarding_completed/is_default so existing
// consumers like OnboardingCheck keep working during the migration.)
function shapeTeam(row, index, onboardingCompleted) {
  return {
    id: row.team_id,
    team_id: row.team_id,
    name: row.name,
    team_name: row.name,
    location_id: row.location_id,
    created_at: row.created_at,
    is_default: index === 0,
    onboarding_completed: onboardingCompleted,
  }
}

// GET - all teams for the logged-in manager's org
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { organizationId, locationIds } = await getOrgScope(userId)

    const { data: org } = await supabaseAdmin
      .from('Organizations')
      .select('onboarding_completed')
      .eq('organization_id', organizationId)
      .maybeSingle()
    const onboardingCompleted = !!org?.onboarding_completed

    if (locationIds.length === 0) return NextResponse.json([])

    const { data: teams, error } = await supabaseAdmin
      .from('Teams')
      .select('*')
      .in('location_id', locationIds)
      .order('created_at', { ascending: true })
    if (error) throw error

    return NextResponse.json((teams || []).map((t, i) => shapeTeam(t, i, onboardingCompleted)))
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

// POST - create a team under the org's (first, or supplied) location
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const teamName = body.team_name || body.name
    if (!teamName) return NextResponse.json({ error: 'Team name is required' }, { status: 400 })

    const { locationIds } = await getOrgScope(userId)
    const locationId = body.location_id || locationIds[0]
    if (!locationId) {
      return NextResponse.json({ error: 'No location found — complete onboarding first' }, { status: 400 })
    }
    if (!locationIds.includes(locationId)) {
      return NextResponse.json({ error: 'Location not in your organization' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('Teams')
      .insert({ name: teamName, location_id: locationId })
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json(shapeTeam(data, 1, true))
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

// PUT - rename a team (ownership enforced via org's locations)
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const teamId = body.id || body.team_id
    const newName = body.team_name || body.name
    if (!teamId) return NextResponse.json({ error: 'Team id is required' }, { status: 400 })

    const { locationIds } = await getOrgScope(userId)
    if (locationIds.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('Teams')
      .update({ name: newName })
      .eq('team_id', teamId)
      .in('location_id', locationIds)
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json(shapeTeam(data, 1, true))
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

// DELETE - remove a team (ownership enforced via org's locations)
export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('id')
    if (!teamId) return NextResponse.json({ error: 'Team id is required' }, { status: 400 })

    const { locationIds } = await getOrgScope(userId)
    if (locationIds.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('Teams')
      .delete()
      .eq('team_id', teamId)
      .in('location_id', locationIds)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
