import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toClient(row) {
  return {
    id: row.id,
    team_id: row.team_id,
    name: row.name,
    email: row.email,
    role: row.role || '',
    contracted_hours: row.contracted_hours || 0,
    max_hours: row.max_hours || 0,
    hourly_rate: parseFloat(row.hourly_rate) || 0,
    keyholder: row.keyholder || false,
    availability: row.availability || null,
    availability_grid: row.availability_grid || null,
    availability_rules: Array.isArray(row.availability_rules) ? row.availability_rules : [],
    preferred_shift_length: row.preferred_shift_length || null,
    invite_status: row.invite_status || 'none',
    clerk_user_id: row.clerk_user_id || null,
    created_at: row.created_at,
  }
}

function toDB(body, userId) {
  const base = {
    user_id: userId,
    team_id: body.team_id,
    name: body.name,
    email: body.email || null,
    role: body.role || null,
    contracted_hours: body.contracted_hours ?? 0,
    max_hours: body.max_hours ?? body.contracted_hours ?? 0,
    hourly_rate: body.hourly_rate ?? 0,
    keyholder: body.keyholder ?? false,
    availability_rules: body.availability_rules ?? [],
    preferred_shift_length: body.preferred_shift_length ?? null,
  }
  // Only include availability fields if explicitly provided
  if (body.availability !== undefined) base.availability = body.availability
  if (body.availability_grid !== undefined) base.availability_grid = body.availability_grid
  if (body.invite_status !== undefined) base.invite_status = body.invite_status
  return base
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    let query = supabase
      .from('Staff')
      .select('*')
      .eq('user_id', userId)

    if (teamId) query = query.eq('team_id', teamId)

    const { data, error } = await query.order('name')
    if (error) throw error

    return NextResponse.json(data.map(toClient))
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.team_id) return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('Staff')
      .insert([toDB(body, userId)])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(toClient(data))
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { id, ...rest } = body
    const dbPayload = toDB({ ...rest, team_id: rest.team_id }, userId)
    delete dbPayload.user_id

    const { data, error } = await supabase
      .from('Staff')
      .update(dbPayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(toClient(data))
  } catch (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase
      .from('Staff')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
  }
}