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

    const body = await request.json()
    const allowed = ['name', 'address', 'min_wage', 'max_consecutive_hours', 'shift_lengths']
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data: location } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id')
      .eq('organization_id', org.organization_id)
      .limit(1)
      .single()

    const { data, error } = await supabase
      .from(DB_TABLES.locations)
      .update(update)
      .eq('location_id', location.location_id)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}
