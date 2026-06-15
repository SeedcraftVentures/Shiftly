import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ── Invite-status enum <-> client mapping ──────────────────────────────────────
const INVITE_TO_CLIENT = { 'Not Invited': 'none', Pending: 'invited', Accepted: 'connected' }
const INVITE_TO_DB = {
  none: 'Not Invited', invited: 'Pending', pending: 'Pending',
  connected: 'Accepted', accepted: 'Accepted',
}

// ── Adapter: new "Staff" row -> the shape the frontend expects ──────────────────
// availability = manager-entered per-day windows JSON { dayIndex: true | [start,end] }.
function toClient(row) {
  return {
    id: row.staff_id,
    team_id: row.team_id,
    name: row.name,
    email: row.invite_email || '',
    role: row.role || '',
    contracted_hours: row.contracted_hours || 0,
    max_hours: row.max_hours || 0,
    hourly_rate: parseFloat(row.wage) || 0,
    pay_basis: row.pay_basis || 'hourly',
    annual_salary: parseFloat(row.annual_salary) || 0,
    annualised_hours: parseFloat(row.annualised_hours) || 0,
    keyholder: row.is_keyholder || false,
    availability: row.availability || {},
    preferred_shift_length: Array.isArray(row.preferred_shift_lengths) ? (row.preferred_shift_lengths[0] ?? null) : null,
    invite_status: INVITE_TO_CLIENT[row.invite_status] || 'none',
    clerk_user_id: row.user_id || null,
    created_at: row.created_at,
  }
}

// Build a new-schema insert payload from the client body.
function toInsert(body) {
  const pref = body.preferred_shift_length
  return {
    team_id: body.team_id,
    name: body.name,
    invite_email: body.email || null,
    role: body.role || null,
    contracted_hours: body.contracted_hours ?? 0,
    max_hours: body.max_hours ?? body.contracted_hours ?? 0,
    wage: body.hourly_rate ?? 0,
    pay_basis: body.pay_basis || 'hourly',
    annual_salary: body.annual_salary ?? null,
    annualised_hours: body.annualised_hours ?? null,
    is_keyholder: body.keyholder ?? false,
    preferred_shift_lengths: pref != null && pref !== '' ? [Number(pref)] : [],
    invite_status: INVITE_TO_DB[body.invite_status] || 'Not Invited',
    availability: body.availability ?? {},
  }
}

// Build a partial update payload (only fields explicitly provided).
function toUpdate(body) {
  const u = {}
  if (body.team_id !== undefined) u.team_id = body.team_id
  if (body.name !== undefined) u.name = body.name
  if (body.email !== undefined) u.invite_email = body.email || null
  if (body.role !== undefined) u.role = body.role || null
  if (body.contracted_hours !== undefined) u.contracted_hours = body.contracted_hours
  if (body.max_hours !== undefined) u.max_hours = body.max_hours
  if (body.hourly_rate !== undefined) u.wage = body.hourly_rate
  if (body.pay_basis !== undefined) u.pay_basis = body.pay_basis || 'hourly'
  if (body.annual_salary !== undefined) u.annual_salary = body.annual_salary
  if (body.annualised_hours !== undefined) u.annualised_hours = body.annualised_hours
  if (body.keyholder !== undefined) u.is_keyholder = body.keyholder
  if (body.availability !== undefined) u.availability = body.availability
  if (body.preferred_shift_length !== undefined) {
    const p = body.preferred_shift_length
    u.preferred_shift_lengths = p != null && p !== '' ? [Number(p)] : []
  }
  if (body.invite_status !== undefined) u.invite_status = INVITE_TO_DB[body.invite_status] || 'Not Invited'
  return u
}

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { teamIds } = await getOrgScope(userId)
    if (teamIds.length === 0) return NextResponse.json([])

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')
    const scopeTeams = teamId ? teamIds.filter((t) => t === teamId) : teamIds
    if (scopeTeams.length === 0) return NextResponse.json([])

    const { data, error } = await supabaseAdmin
      .from('Staff')
      .select('*')
      .in('team_id', scopeTeams)
      .order('name')
    if (error) throw error

    return NextResponse.json((data || []).map(toClient))
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.team_id) return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.includes(body.team_id)) {
      return NextResponse.json({ error: 'Team not in your organization' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('Staff')
      .insert([toInsert(body)])
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json(toClient(data))
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}

// ── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    if (teamIds.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('Staff')
      .update(toUpdate(body))
      .eq('staff_id', body.id)
      .in('team_id', teamIds)
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json(toClient(data))
  } catch (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }
}

// ── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    if (teamIds.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('Staff')
      .delete()
      .eq('staff_id', id)
      .in('team_id', teamIds)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
  }
}
