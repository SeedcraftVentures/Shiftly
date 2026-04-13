import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const { data: location } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id')
      .eq('organization_id', org.organization_id)
      .limit(1)
      .single()

    const body = await request.json()
    // body = { day: string, opening_time, closing_time, start_time, end_time, open: boolean }

    if (!body.day) {
      return NextResponse.json({ error: 'day is required' }, { status: 400 })
    }

    if (body.open === false) {
      // Delete the row for this day (closed)
      const { error } = await supabase
        .from(DB_TABLES.locationDayHours)
        .delete()
        .eq('location_id', location.location_id)
        .eq('day', body.day)

      if (error) throw error
      return NextResponse.json({ success: true, deleted: true })
    }

    // Upsert the day hours
    const row = {
      location_id: location.location_id,
      day: body.day,
      opening_time: body.opening_time,
      closing_time: body.closing_time,
      start_time: body.start_time,
      end_time: body.end_time,
    }

    const { data, error } = await supabase
      .from(DB_TABLES.locationDayHours)
      .upsert(row, { onConflict: 'location_id,day' })
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating location hours:', error)
    return NextResponse.json({ error: 'Failed to update location hours' }, { status: 500 })
  }
}
