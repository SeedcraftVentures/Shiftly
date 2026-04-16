import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// POST — create a new team in this location
export async function POST(request, { params }) {
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