import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — current user's active organization with locations list
export async function GET() {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    const supabase = await createSupabaseServerClient()

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
      // Caller uses this for UI gating of org-level edits
      canManageSettings: has({ permission: 'org:settings:manage' }),
    })
  } catch (err) {
    console.error('Error fetching organization:', err)
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

// PATCH — update organization fields
export async function PATCH(request) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!has({ permission: 'org:settings:manage' })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const allowed = ['organization_name', 'industry', 'currency']
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from(DB_TABLES.organizations)
      .update(update)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating organization:', err)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}