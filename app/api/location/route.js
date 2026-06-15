import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
function tzToDecimal(t) {
  if (!t) return null
  const [h, m] = String(t).slice(0, 5).split(':').map(Number)
  return (h || 0) + (m || 0) / 60
}

// GET /api/location → the org's (first) location with its per-day open hours + shift lengths.
// Drives coverage, closed-days and slider ranges on the Shifts/Staff pages.
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { locationIds } = await getOrgScope(userId)
    if (locationIds.length === 0) return NextResponse.json(null)
    const locationId = locationIds[0]

    const [{ data: loc }, { data: hours }] = await Promise.all([
      supabaseAdmin.from('Locations').select('location_id, name, shift_lengths').eq('location_id', locationId).maybeSingle(),
      supabaseAdmin.from('Location Day Hours').select('day, opening_time, closing_time, start_time, end_time').eq('location_id', locationId),
    ])

    // `business` = the window scheduling + coverage run against: the OPERATING window
    // (staff on site, start_time→end_time). `opening` = customer-facing, for reference.
    const business = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
    const opening = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
    for (const r of hours || []) {
      const i = DAY_INDEX[r.day]
      if (i == null) continue
      business[i] = [tzToDecimal(r.start_time ?? r.opening_time), tzToDecimal(r.end_time ?? r.closing_time)]
      opening[i] = [tzToDecimal(r.opening_time), tzToDecimal(r.closing_time)]
    }

    return NextResponse.json({
      location_id: locationId,
      name: loc?.name || 'Location',
      shift_lengths: Array.isArray(loc?.shift_lengths) && loc.shift_lengths.length ? loc.shift_lengths : [4, 6, 8, 10, 12],
      business,
      opening,
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
  }
}
