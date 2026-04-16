import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// ── GET ───────────────────────────────────────────────────────────────────────
// Returns { shifts, teams, locationHours, teamHourOverrides } for the current
// user's location. RLS handles org-scoping automatically.

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    // Find the user's organization → location
    const { data: member, error: memErr } = await supabase
      .from(DB_TABLES.organizationMembers)
      .select('organization_id')
      .eq('member_user_id', userId)
      .single()

    if (memErr) throw memErr

    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id, shift_lengths')
      .eq('organization_id', member.organization_id)
      .limit(1)
      .single()

    if (locErr) throw locErr
    const locationId = location.location_id

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
      shiftLengths: location.shift_lengths || [4, 6, 8],
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      .insert([row])
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}
