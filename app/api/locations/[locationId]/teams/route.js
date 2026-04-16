import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// POST — create a new team in this location
export async function POST(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!has({ permission: 'org:staff:manage' })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    // Verify location belongs to active org
    const { data: location, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id')
      .eq('location_id', locationId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (locErr) throw locErr
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const body = await request.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from(DB_TABLES.teams)
      .insert({ name: body.name.trim(), location_id: locationId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error creating team:', err)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}