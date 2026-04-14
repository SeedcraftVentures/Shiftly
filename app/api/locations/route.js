import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES, DEFAULT_SHIFT_LENGTHS, DEFAULT_MAX_CONSECUTIVE_HOURS } from '@/app/lib/constants'

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

// POST — create a new location
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

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
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from(DB_TABLES.locations)
      .insert({
        organization_id: org.organization_id,
        name: body.name.trim(),
        address: body.address?.trim() || '',
        currency: body.currency || null,
        min_wage: body.min_wage ?? null,
        shift_lengths: DEFAULT_SHIFT_LENGTHS,
        max_consecutive_hours: DEFAULT_MAX_CONSECUTIVE_HOURS,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error creating location:', err)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}