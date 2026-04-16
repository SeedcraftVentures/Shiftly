import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — list all locations the current user can access in their active org
export async function GET() {
  try {
    const { userId, orgId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ locations: [] })

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from(DB_TABLES.locations)
      .select('location_id, name, organization_id')
      .eq('organization_id', orgId)
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ locations: data || [] })
  } catch (err) {
    console.error('Error fetching locations:', err)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}