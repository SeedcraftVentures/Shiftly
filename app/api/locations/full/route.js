import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import { createLocationWithChildren } from '@/app/lib/server/createLocationWithChildren'

export const dynamic = 'force-dynamic'

// POST — create a fully-configured location (name + hours + teams + staff)
// in the current user's organization.
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    // Find the user's organization and verify they're the owner
    const { data: member, error: memErr } = await supabase
      .from(DB_TABLES.organizationMembers)
      .select('organization_id')
      .eq('member_user_id', userId)
      .single()

    if (memErr) throw memErr

    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('organization_id, owner_user_id')
      .eq('organization_id', member.organization_id)
      .single()

    if (orgErr) throw orgErr
    if (org.owner_user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const { locationId } = await createLocationWithChildren(
      supabase,
      org.organization_id,
      body
    )

    return NextResponse.json({ location_id: locationId })
  } catch (err) {
    console.error('Error creating full location:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create location' },
      { status: 500 }
    )
  }
}