import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// PATCH — upsert or clear Team Day Hours overrides
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { team_id } = await params
    const supabase = await createSupabaseServerClient()

    // Owner check
    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('organization_id, owner_user_id')
      .single()

    if (orgErr) throw orgErr
    if (org.owner_user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    // body = { day: string, start_time_override?: string|null, end_time_override?: string|null }

    if (!body.day) {
      return NextResponse.json({ error: 'day is required' }, { status: 400 })
    }

    // If both overrides are null/empty, delete the row (inherit from location)
    if (!body.start_time_override && !body.end_time_override) {
      const { error } = await supabase
        .from(DB_TABLES.teamDayHours)
        .delete()
        .eq('team_id', team_id)
        .eq('day', body.day)

      if (error) throw error
      return NextResponse.json({ success: true, deleted: true })
    }

    const row = {
      team_id,
      day: body.day,
      start_time_override: body.start_time_override || null,
      end_time_override: body.end_time_override || null,
    }

    const { data, error } = await supabase
      .from(DB_TABLES.teamDayHours)
      .upsert(row, { onConflict: 'team_id,day' })
      .select()

    if (error) throw error

    return NextResponse.json(data?.[0] || { success: true })
  } catch (error) {
    console.error('Error updating team hours:', error)
    return NextResponse.json({ error: 'Failed to update team hours' }, { status: 500 })
  }
}
