import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getStaffScope, toEmployeeProfile } from '@/lib/staffScope'

// The employee's own weekly availability, stored on Staff.availability and read
// by the solver via availabilityGrid() in generate-rota.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    return NextResponse.json({ availability_grid: scope.staff.availability || {} })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    // The client sends `availability_grid`; the pre-revamp route read `availability`
    // and so silently saved nothing. Accept either rather than repeat that bug.
    const grid = body.availability_grid ?? body.availability
    if (grid === undefined || grid === null || typeof grid !== 'object') {
      return NextResponse.json({ error: 'availability_grid is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('Staff').update({ availability: grid }).eq('staff_id', scope.staffId).select('*').maybeSingle()
    if (error) throw error

    // Return the adapted profile so the client's invalidated profile query stays consistent.
    return NextResponse.json(toEmployeeProfile({ ...scope, staff: data || scope.staff }))
  } catch (error) {
    console.error('Error updating availability:', error)
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
  }
}
