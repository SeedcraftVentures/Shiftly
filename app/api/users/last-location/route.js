import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES } from '@/app/lib/constants'

export const dynamic = 'force-dynamic'

// GET — return the current user's last_location_id
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from(DB_TABLES.users)
      .select('last_location_id')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return NextResponse.json({ last_location_id: data?.last_location_id ?? null })
  } catch (err) {
    console.error('Error fetching last location:', err)
    return NextResponse.json({ error: 'Failed to fetch last location' }, { status: 500 })
  }
}

// PATCH — update the current user's last_location_id
export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { location_id } = await request.json()

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from(DB_TABLES.users)
      .update({ last_location_id: location_id ?? null, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error updating last location:', err)
    return NextResponse.json({ error: 'Failed to update last location' }, { status: 500 })
  }
}