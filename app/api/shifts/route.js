import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// ── GET ──────────────────────────────────────────────────────────────────────
// Returns { shifts, teams, locationHours, teamHourOverrides, shiftLengths }
// for the active org's first location. RLS handles org-scoping.
//
// TODO: Refactor to take ?location_id= once the shifts page moves under
// /dashboard/[locationId]/shifts.
export async function GET(request) {
  try {
    const { userId, orgId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    const supabase = await createSupabaseServerClient()

    const url = new URL(request.url)
    const locationIdParam = url.searchParams.get('location_id')

    let locationId = locationIdParam

    // Fall back to "first location in active org" if no id passed
    if (!locationId) {
      const { data: location, error: locErr } = await supabase
        .from(DB_TABLES.locations)
        .select('location_id')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (locErr) throw locErr
      if (!location) return NextResponse.json({ error: 'No locations' }, { status: 404 })
      locationId = location.location_id
    }

    // Fetch shift_lengths from the location
    const { data: locData, error: locDataErr } = await supabase
      .from(DB_TABLES.locations)
      .select('shift_lengths')
      .eq('location_id', locationId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (locDataErr) throw locDataErr
    if (!locData) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    // Parallel fetch: teams, shifts, location hours, team hour overrides
    const [teamsRes, shiftsRes, hoursRes, overridesRes] = await Promise.all([
      supabase
        .from(DB_TABLES.teams)
        .select('team_id, name')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true }),
      supabase
        .from(DB_TABLES.shiftPatterns)
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from(DB_TABLES.locationDayHours)
        .select('*')
        .eq('location_id', locationId),
      supabase
        .from(DB_TABLES.teamDayHours)
        .select('*'),
    ])

    if (teamsRes.error) throw teamsRes.error
    if (shiftsRes.error) throw shiftsRes.error
    if (hoursRes.error) throw hoursRes.error
    if (overridesRes.error) throw overridesRes.error

    return NextResponse.json({
      shifts: shiftsRes.data || [],
      teams: teamsRes.data || [],
      locationHours: hoursRes.data || [],
      teamHourOverrides: overridesRes.data || [],
      shiftLengths: locData.shift_lengths || [4, 6, 8],
    })
  } catch (err) {
    console.error('Error fetching shifts:', err)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!has({ permission: 'org:shifts:manage' })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    if (!body.shift_team) {
      return NextResponse.json({ error: 'shift_team is required' }, { status: 400 })
    }

    const row = {
      shift_team: body.shift_team,
      shift_name: body.shift_name || 'New Shift',
      shift_type: body.shift_type || 'open',
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      days: body.days || [0, 1, 2, 3, 4],
      break_duration: body.break_duration ?? 0.5,
      break_is_paid: body.break_is_paid ?? false,
      is_keyholder: body.is_keyholder ?? true,
      num_staff_needed: body.num_staff_needed ?? 1,
    }

    const { data, error } = await supabase
      .from(DB_TABLES.shiftPatterns)
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error creating shift:', err)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}