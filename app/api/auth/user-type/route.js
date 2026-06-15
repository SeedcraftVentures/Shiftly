import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, organizationIdFor } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/auth/user-type → 'manager' | 'employee' | 'new' | 'unknown'
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ type: 'unknown' }, { status: 401 })

    // Manager: an Organization exists for this user (manager-as-org → they've onboarded).
    const { data: org } = await supabaseAdmin
      .from('Organizations')
      .select('organization_id')
      .eq('organization_id', organizationIdFor(userId))
      .maybeSingle()
    if (org) return NextResponse.json({ type: 'manager' })

    // Employee: this user is linked to a Staff row.
    const { data: staffRows } = await supabaseAdmin
      .from('Staff')
      .select('staff_id, name, role')
      .eq('user_id', userId)
      .limit(1)
    const staffProfile = staffRows?.[0]
    if (staffProfile) {
      return NextResponse.json({
        type: 'employee',
        profile: { id: staffProfile.staff_id, name: staffProfile.name, role: staffProfile.role },
      })
    }

    // New user — will be sent through onboarding.
    return NextResponse.json({ type: 'new' })
  } catch (error) {
    console.error('Error checking user type:', error)
    return NextResponse.json({ type: 'unknown', error: error.message }, { status: 500 })
  }
}
