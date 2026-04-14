import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — current user's organization with locations list
export async function GET() {
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

    const orgId = member.organization_id

    const [orgRes, locsRes] = await Promise.all([
      supabase
        .from(DB_TABLES.organizations)
        .select('*')
        .eq('organization_id', orgId)
        .single(),
      supabase
        .from(DB_TABLES.locations)
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true }),
    ])

    if (orgRes.error) throw orgRes.error
    if (locsRes.error) throw locsRes.error

    return NextResponse.json({
      organization: orgRes.data,
      locations: locsRes.data || [],
      isOwner: orgRes.data.owner_user_id === userId,
    })
  } catch (err) {
    console.error('Error fetching organization:', err)
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

// PATCH — update organization fields
export async function PATCH(request) {
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
    const allowed = ['organization_name', 'industry', 'currency']
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from(DB_TABLES.organizations)
      .update(update)
      .eq('organization_id', org.organization_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating organization:', err)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}