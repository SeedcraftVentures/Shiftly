import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

async function checkOwnerForLocation(supabase, userId, locationId) {
  const { data: location, error: locErr } = await supabase
    .from(DB_TABLES.locations)
    .select('location_id, organization_id')
    .eq('location_id', locationId)
    .single()
  if (locErr) return { error: locErr }

  const { data: org, error: orgErr } = await supabase
    .from(DB_TABLES.organizations)
    .select('organization_id, owner_user_id')
    .eq('organization_id', location.organization_id)
    .single()
  if (orgErr) return { error: orgErr }

  if (org.owner_user_id !== userId) {
    return { forbidden: true }
  }
  return { location, org }
}

// PATCH — update a single location
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    const check = await checkOwnerForLocation(supabase, userId, locationId)
    if (check.error) throw check.error
    if (check.forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const allowed = ['name', 'address', 'currency', 'min_wage', 'max_consecutive_hours', 'shift_lengths']
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from(DB_TABLES.locations)
      .update(update)
      .eq('location_id', locationId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating location:', err)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}

// DELETE — delete a location (cascade handled by FK on delete cascade in DB)
export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { locationId } = await params
    const supabase = await createSupabaseServerClient()

    const check = await checkOwnerForLocation(supabase, userId, locationId)
    if (check.error) throw check.error
    if (check.forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from(DB_TABLES.locations)
      .delete()
      .eq('location_id', locationId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting location:', err)
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  }
}