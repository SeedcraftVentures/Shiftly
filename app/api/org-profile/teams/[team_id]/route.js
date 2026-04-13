import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// PATCH — rename a team
export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { team_id } = await params
    const supabase = await createSupabaseServerClient()

    // Owner check
    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('organization_id, owner_user_id')
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
      .from(DB_TABLES.teamsNew)
      .update({ name: body.name.trim() })
      .eq('team_id', team_id)
      .select()

    if (error) throw error
    if (!data?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error renaming team:', error)
    return NextResponse.json({ error: 'Failed to rename team' }, { status: 500 })
  }
}

// DELETE — delete a team (FK cascade handles shift patterns + staff)
export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { team_id } = await params
    const supabase = await createSupabaseServerClient()

    // Owner check
    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .select('organization_id, owner_user_id')
      .single()

    if (orgErr) throw orgErr
    if (org.owner_user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get cascade counts for the confirmation message
    const [shiftsRes, staffRes] = await Promise.all([
      supabase.from(DB_TABLES.shiftPatterns).select('shift_id', { count: 'exact', head: true }).eq('shift_team', team_id),
      supabase.from(DB_TABLES.staffNew).select('staff_id', { count: 'exact', head: true }).eq('team_id', team_id),
    ])

    const { error } = await supabase
      .from(DB_TABLES.teamsNew)
      .delete()
      .eq('team_id', team_id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      cascaded: {
        shifts: shiftsRes.count || 0,
        staff: staffRes.count || 0,
      },
    })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
