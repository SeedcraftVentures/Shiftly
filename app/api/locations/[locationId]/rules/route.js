import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// PATCH — upsert scheduling rules for a location
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    // Owner check via the location's org
    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id, organization_id')
      .eq('location_id', locationId)
      .single()

    if (locErr) throw locErr

    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('owner_user_id')
      .eq('organization_id', location.organization_id)
      .single()

    if (orgErr) throw orgErr
    if (org.owner_user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const allowed = [
      'no_clopening',
      'no_double_shifts',
      'fair_weekend_distribution',
      'enforce_max_consecutive_days',
      'max_consecutive_days',
      'enforce_min_days_off',
      'min_days_off',
      'enforce_rest_between_shifts',
      'min_rest_hours',
    ]

    const update = { location_id: locationId }
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from(DB_TABLES.locationRules)
      .upsert(update, { onConflict: 'location_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating location rules:', err)
    return NextResponse.json({ error: 'Failed to update location rules' }, { status: 500 })
  }
}