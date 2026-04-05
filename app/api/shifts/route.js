import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabaseAnon'
import { DB_TABLES } from '@/app/lib/constants'
import {
  timeStringToDecimal,
  decimalToTimeString,
  dayNamesToIndices,
  indicesToDayNames,
} from '@/app/lib/timeUtils'

export const dynamic = 'force-dynamic'

// Map a DB row → UI-friendly shape
function toClient(row) {
  return {
    id: row.id,
    team_id: row.team_id,
    name: row.shift_name,
    anchor_type: row.anchor_type || 'fixed',
    start: timeStringToDecimal(row.start_time),
    end: timeStringToDecimal(row.end_time),
    days: dayNamesToIndices(row.days_of_week || []),
    staff: row.staff_required || 1,
    keyholder: row.keyholder_required || false,
    break_duration_mins: row.break_duration_mins || 0,
    break_type: row.break_type || 'unpaid',
    created_at: row.created_at,
  }
}

// Map UI payload → DB shape
function toDB(body, userId) {
  return {
    user_id: userId,
    team_id: body.team_id,
    shift_name: body.name,
    anchor_type: body.anchor_type || 'fixed',
    start_time: decimalToTimeString(body.start),
    end_time: decimalToTimeString(body.end),
    days_of_week: indicesToDayNames(body.days || []),
    staff_required: body.staff || 1,
    keyholder_required: body.keyholder || false,
    break_duration_mins: body.break_duration_mins || 0,
    break_type: body.break_type || 'unpaid',
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    let query = supabase
      .from(DB_TABLES.shifts)
      .select('*')
      .eq('user_id', userId)

    if (teamId) query = query.eq('team_id', teamId)

    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) throw error

    return NextResponse.json(data.map(toClient))
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

    const body = await request.json()
    if (!body.team_id) return NextResponse.json({ error: 'team_id is required' }, { status: 400 })

    const { data, error } = await supabase
      .from(DB_TABLES.shifts)
      .insert([toDB(body, userId)])
      .select()

    if (error) throw error

    return NextResponse.json(toClient(data[0]))
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
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
    delete dbPayload.user_id // don't overwrite user_id on update

    const { data, error } = await supabase
      .from(DB_TABLES.shifts)
      .update(dbPayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()

    if (error) throw error

    return NextResponse.json(toClient(data[0]))
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
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
      .from(DB_TABLES.shifts)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}