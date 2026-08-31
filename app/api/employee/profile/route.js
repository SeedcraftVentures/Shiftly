import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getStaffScope, toEmployeeProfile } from '@/lib/staffScope'

// The employee's own record. GET reads it; PATCH lets them change the handful of
// preferences that are theirs to set. Linking an account to a Staff row is NOT done
// here: that happens explicitly via /api/staff/claim, the join-by-code flow.
//
// Returns 404 (not an error) when the caller is not linked to a Staff row, because
// the employee app turns 404 into its "enter your join code" screen.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    return NextResponse.json(toEmployeeProfile(scope))
  } catch (error) {
    console.error('Error fetching employee profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

// The staff member's own preferences. /api/staff is manager-scoped through
// getOrgScope, so it returns nothing for a staff caller and the app cannot use it;
// this is the employee-scoped equivalent.
//
// Deliberately a strict allowlist of ONE field rather than a general update. This is
// the only route in the app a non-manager can write through, and the row it touches
// also holds wage, contracted_hours and is_keyholder. Spreading the body into the
// update would let anyone give themselves a pay rise. Add fields here one at a time,
// on purpose.
const STAFF_EDITABLE = {
  prefers_consistent: (v) => ({ prefers_consistent_shifts: !!v }),
}

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = await getStaffScope(userId)
    if (!scope) return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const update = {}
    for (const [key, toColumn] of Object.entries(STAFF_EDITABLE)) {
      if (body[key] !== undefined) Object.assign(update, toColumn(body[key]))
    }
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Scoped to the caller's own staff_id, so this cannot reach anybody else's row.
    const { data, error } = await supabaseAdmin
      .from('Staff').update(update).eq('staff_id', scope.staffId).select('*').maybeSingle()
    if (error) throw error

    return NextResponse.json(toEmployeeProfile({ ...scope, staff: data || scope.staff }))
  } catch (error) {
    console.error('Error updating employee profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
