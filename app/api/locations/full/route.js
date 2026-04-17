import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { createLocationWithChildren } from '@/app/lib/server/createLocationWithChildren'

export const dynamic = 'force-dynamic'

// POST — create a fully-configured location (name + hours + teams + staff)
// in the current user's active organization.
export async function POST(request) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!has({ permission: 'org:locations:manage' })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const { locationId } = await createLocationWithChildren(supabase, orgId, body)

    return NextResponse.json({ location_id: locationId })
  } catch (err) {
    console.error('Error creating full location:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create location' },
      { status: 500 }
    )
  }
}