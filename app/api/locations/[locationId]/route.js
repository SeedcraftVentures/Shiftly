import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// PATCH — update a single location's settings
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

    const body = await request.json()
    const allowed = ['name', 'address', 'currency', 'min_wage', 'max_consecutive_hours', 'shift_lengths']
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    // RLS scopes to user's active org; additional safety: filter by org too
    const { data, error } = await supabase
      .from(DB_TABLES.locations)
      .update(update)
      .eq('location_id', locationId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating location:', err)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}

// DELETE — delete a location (cascade cleans up children)
export async function DELETE(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!has({ permission: 'org:locations:manage' })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from(DB_TABLES.locations)
      .delete()
      .eq('location_id', locationId)
      .eq('organization_id', orgId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting location:', err)
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  }
}