import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — all staff + teams for a location
export async function GET(request, { params }) {
  try {
    const { userId, orgId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    // Verify location belongs to org
    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id')
      .eq('location_id', locationId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (locErr) throw locErr
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const [teamsRes, staffRes] = await Promise.all([
      supabase
        .from(DB_TABLES.teams)
        .select('team_id, name')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true }),
      supabase
        .from(DB_TABLES.staff)
        .select('*, ...Teams!inner(location_id)')
        .eq('Teams.location_id', locationId)
        .order('name', { ascending: true }),
    ])

    if (teamsRes.error) throw teamsRes.error
    if (staffRes.error) throw staffRes.error

    return NextResponse.json({
      staff: staffRes.data || [],
      teams: teamsRes.data || [],
    })
  } catch (err) {
    console.error('Error fetching staff:', err)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// POST — create a new staff member
export async function POST(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!(await has({ permission: 'org:staff:manage' }))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    if (!body.team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    }

    // Verify team belongs to this location
    const { data: team, error: teamErr } = await supabase
      .from(DB_TABLES.teams)
      .select('team_id')
      .eq('team_id', body.team_id)
      .eq('location_id', locationId)
      .maybeSingle()

    if (teamErr) throw teamErr
    if (!team) return NextResponse.json({ error: 'Team not found in this location' }, { status: 404 })

    const row = {
      team_id: body.team_id,
      name: body.name || 'New Staff',
      role: body.role || null,
      contracted_hours: body.contracted_hours ?? 0,
      max_hours: body.max_hours ?? 40,
      wage: body.wage ?? 0,
      preferred_shift_lengths: body.preferred_shift_lengths || [],
      is_keyholder: body.is_keyholder ?? false,
    }

    const { data, error } = await supabase
      .from(DB_TABLES.staff)
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error creating staff:', err)
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 })
  }
}