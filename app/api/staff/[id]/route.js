import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INVITE_TO_CLIENT = { 'Not Invited': 'none', Pending: 'invited', Accepted: 'connected' }
const INVITE_TO_DB = {
  none: 'Not Invited', invited: 'Pending', pending: 'Pending',
  connected: 'Accepted', accepted: 'Accepted',
}

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
    keyholder: row.is_keyholder || false,
    preferred_shift_length: Array.isArray(row.preferred_shift_lengths) ? (row.preferred_shift_lengths[0] ?? null) : null,
    invite_status: INVITE_TO_CLIENT[row.invite_status] || 'none',
    clerk_user_id: row.user_id || null,
    created_at: row.created_at,
  }
}

function toUpdate(body) {
  const u = {}
  if (body.name !== undefined) u.name = body.name
  if (body.email !== undefined) u.invite_email = body.email || null
  if (body.role !== undefined) u.role = body.role || null
  if (body.contracted_hours !== undefined) u.contracted_hours = body.contracted_hours
  if (body.max_hours !== undefined) u.max_hours = body.max_hours
  if (body.hourly_rate !== undefined) u.wage = body.hourly_rate
  if (body.keyholder !== undefined) u.is_keyholder = body.keyholder
  if (body.preferred_shift_length !== undefined) {
    const p = body.preferred_shift_length
    u.preferred_shift_lengths = p != null && p !== '' ? [Number(p)] : []
  }
  if (body.invite_status !== undefined) u.invite_status = INVITE_TO_DB[body.invite_status] || 'Not Invited'
  return u
}

export async function GET(request, { params }) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { teamIds } = await getOrgScope(userId)
  if (teamIds.length === 0) return Response.json({ error: 'Staff member not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('Staff')
    .select('*')
    .eq('staff_id', id)
    .in('team_id', teamIds)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Staff member not found' }, { status: 404 })

  return Response.json(toClient(data))
}

export async function PUT(request, { params }) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { teamIds } = await getOrgScope(userId)
  if (teamIds.length === 0) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('Staff')
    .update(toUpdate(body))
    .eq('staff_id', id)
    .in('team_id', teamIds)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating staff:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(toClient(data))
}

export async function DELETE(request, { params }) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { teamIds } = await getOrgScope(userId)
  if (teamIds.length === 0) return Response.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('Staff')
    .delete()
    .eq('staff_id', id)
    .in('team_id', teamIds)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
