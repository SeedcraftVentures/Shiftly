import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — list all locations the current user can access
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    const { data: memberships, error: memErr } = await supabase
      .from(DB_TABLES.organizationMembers)
      .select('organization_id')
      .eq('member_user_id', userId)

    if (memErr) throw memErr
    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ locations: [] })
    }

    const orgIds = memberships.map(m => m.organization_id)

    const { data: locations, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id, name, organization_id')
      .in('organization_id', orgIds)
      .order('name', { ascending: true })

    if (locErr) throw locErr

    return NextResponse.json({ locations: locations || [] })
  } catch (err) {
    console.error('Error fetching locations:', err)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

