import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// PATCH — upsert or clear a single day's hours for a location
export async function PATCH(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!has({ permission: 'org:locations:manage' })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    // Verify location belongs to active org (RLS also filters, but we want explicit 404)
    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id')
      .eq('location_id', locationId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (locErr) throw locErr
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const body = await request.json()
    if (!body.day) {
      return NextResponse.json({ error: 'day is required' }, { status: 400 })
    }

    // Closed: delete the row
    if (body.open === false) {
      const { error } = await supabase
        .from(DB_TABLES.locationDayHours)
        .delete()
        .eq('location_id', locationId)
        .eq('day', body.day)

      if (error) throw error
      return NextResponse.json({ success: true, deleted: true })
    }

    // Open: upsert
    const row = {
      location_id: locationId,
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
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating location hours:', err)
    return NextResponse.json({ error: 'Failed to update location hours' }, { status: 500 })
  }
}