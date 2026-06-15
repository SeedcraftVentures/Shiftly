import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ANCHOR_TO_DB = { open: 'Open', close: 'Close', fixed: 'Fixed' }
const ANCHOR_TO_CLIENT = { Open: 'open', Close: 'close', Fixed: 'fixed' }

// timetz string ("07:30:00+00") → decimal hours (7.5)
function timeTzToDecimal(t) {
  if (!t) return 0
  const [h, m] = String(t).slice(0, 5).split(':').map(Number)
  return (h || 0) + (m || 0) / 60
}
// decimal hours (7.5) → timetz literal ("07:30:00+00")
function decimalToTimeTz(d) {
  const h = Math.floor(d)
  const m = Math.round((d - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+00`
}
function dayNamesToIndices(names) {
  if (!Array.isArray(names)) return []
  return names.map((n) => DAY_NAMES.indexOf(n)).filter((i) => i !== -1)
}
function indicesToDayNames(indices) {
  if (!Array.isArray(indices)) return []
  return indices.map((i) => DAY_NAMES[i]).filter(Boolean)
}

// new "Shift Patterns" row → the shape the frontend expects
function toClient(row) {
  return {
    id: row.shift_id,
    team_id: row.shift_team,
    name: row.shift_name,
    anchor_type: ANCHOR_TO_CLIENT[row.shift_type] || 'fixed',
    start: timeTzToDecimal(row.start_time),
    end: timeTzToDecimal(row.end_time),
    days: dayNamesToIndices(row.days || []),
    staff: row.num_staff_needed || 1,
    keyholder: row.is_keyholder || false,
    // break_duration is stored as MINUTES (matches the UI's break_duration_mins)
    break_duration_mins: row.break_duration || 0,
    break_type: row.break_is_paid ? 'paid' : 'unpaid',
    created_at: null,
  }
}

// client payload → "Shift Patterns" row
function toDB(body) {
  return {
    shift_team: body.team_id,
    shift_name: body.name || 'New Shift',
    shift_type: ANCHOR_TO_DB[body.anchor_type] || 'Fixed',
    start_time: decimalToTimeTz(body.start ?? 9),
    end_time: decimalToTimeTz(body.end ?? 17),
    days: indicesToDayNames(body.days || []),
    num_staff_needed: body.staff || 1,
    is_keyholder: body.keyholder || false,
    break_duration: body.break_duration_mins || 0,
    break_is_paid: body.break_type === 'paid',
  }
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
      .from('Shift Patterns')
      .select('*')
      .in('shift_team', scopeTeams)
      .order('shift_name', { ascending: true })
    if (error) throw error

    return NextResponse.json((data || []).map(toClient))
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.team_id) return NextResponse.json({ error: 'team_id is required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.includes(body.team_id)) {
      return NextResponse.json({ error: 'Team not in your organization' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('Shift Patterns')
      .insert([toDB(body)])
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json(toClient(data))
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
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

    // Only set columns that map from the provided body; team move must stay in-org.
    const payload = toDB({ ...body, team_id: body.team_id })
    if (body.team_id !== undefined && !teamIds.includes(body.team_id)) {
      return NextResponse.json({ error: 'Team not in your organization' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('Shift Patterns')
      .update(payload)
      .eq('shift_id', body.id)
      .in('shift_team', teamIds)
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json(toClient(data))
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
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
      .from('Shift Patterns')
      .delete()
      .eq('shift_id', id)
      .in('shift_team', teamIds)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}
