import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { shift_id } = await params
    if (!shift_id) return NextResponse.json({ error: 'shift_id is required' }, { status: 400 })

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    // Only allow updating known fields
    const allowed = [
      'shift_name', 'shift_type', 'start_time', 'end_time', 'days',
      'break_duration', 'break_is_paid', 'is_keyholder', 'num_staff_needed',
    ]
    const update = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { data, error } = await supabase
      .from(DB_TABLES.shiftPatterns)
      .update(update)
      .eq('shift_id', shift_id)
      .select()

    if (error) throw error
    if (!data?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { shift_id } = await params
    if (!shift_id) return NextResponse.json({ error: 'shift_id is required' }, { status: 400 })

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from(DB_TABLES.shiftPatterns)
      .delete()
      .eq('shift_id', shift_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}
