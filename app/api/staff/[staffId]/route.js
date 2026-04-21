import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// PATCH — update a staff member
export async function PATCH(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!(await has({ permission: 'org:staff:manage' }))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { staffId } = await params
    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const allowed = [
      'name', 'role', 'team_id', 'contracted_hours', 'max_hours',
      'wage', 'preferred_shift_lengths', 'is_keyholder', 'invite_email',
    ]
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from(DB_TABLES.staff)
      .update(update)
      .eq('staff_id', staffId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating staff:', err)
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 })
  }
}

// DELETE — delete a staff member
export async function DELETE(request, { params }) {
  try {
    const { userId, orgId, has } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    if (!(await has({ permission: 'org:staff:manage' }))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { staffId } = await params
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from(DB_TABLES.staff)
      .delete()
      .eq('staff_id', staffId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting staff:', err)
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 })
  }
}