import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'
import { createLocationWithChildren } from '@/app/lib/server/createLocationWithChildren'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    const {
      organization_name,
      industry,
      address,
      location_nickname,
      currency,
      min_wage,
      teams,
      operating_hours,
      staff_by_team,
    } = await request.json()

    if (!organization_name || !industry || !address || !teams?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create the Organization
    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .insert({
        organization_name,
        owner_user_id: userId,
        industry,
        currency: currency || null,
      })
      .select('organization_id')
      .single()

    if (orgErr) throw orgErr
    const organization_id = org.organization_id

    // 2. Organization Members (owner as highest-permission role)
    const { error: memberErr } = await supabase
      .from(DB_TABLES.organizationMembers)
      .insert({
        member_user_id: userId,
        access: 'Manager',
        organization_id,
      })

    if (memberErr) throw memberErr

    // 3. Create the first location with all its children, via shared helper
    await createLocationWithChildren(supabase, organization_id, {
      name: location_nickname || address,
      address,
      // First location during onboarding inherits currency from org (null = inherit)
      currency: null,
      min_wage: min_wage ?? null,
      operating_hours,
      teams,
      staff_by_team,
    })

    // 4. Mark onboarding complete
    const { error: completeErr } = await supabase
      .from(DB_TABLES.organizations)
      .update({ onboarding_completed: true })
      .eq('organization_id', organization_id)

    if (completeErr) throw completeErr

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
  }
}