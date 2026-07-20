import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
// Service-role client: this is a server route and RLS is enabled on the app
// tables, so the anon client would read nothing. Auth is enforced by auth() below.
import { supabaseAdmin as supabase } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Fetch template config for a team
export async function GET(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 'team-id': teamId } = await params

    const { data, error } = await supabase
      .from('Teams')
      .select('open_time, close_time, open_buffer, close_buffer, shift_lengths, day_templates, week_template')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

// PUT - Update template config for a team
export async function PUT(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 'team-id': teamId } = await params
    const body = await request.json()

    const updateData = { updated_at: new Date().toISOString() }

    if (body.open_time !== undefined) updateData.open_time = body.open_time
    if (body.close_time !== undefined) updateData.close_time = body.close_time
    if (body.open_buffer !== undefined) updateData.open_buffer = body.open_buffer
    if (body.close_buffer !== undefined) updateData.close_buffer = body.close_buffer
    if (body.shift_lengths !== undefined) updateData.shift_lengths = body.shift_lengths
    if (body.day_templates !== undefined) updateData.day_templates = body.day_templates
    if (body.week_template !== undefined) updateData.week_template = body.week_template

    const { data, error } = await supabase
      .from('Teams')
      .update(updateData)
      .eq('id', teamId)
      .eq('user_id', userId)
      .select('open_time, close_time, open_buffer, close_buffer, shift_lengths, day_templates, week_template')
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}