import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getLastLocationId, setLastLocationId } from '@/app/lib/server/lastLocation'

export const dynamic = 'force-dynamic'

// GET — read the current user's last location for their active org
export async function GET() {
  try {
    const { userId, orgId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ last_location_id: null })

    const lastLocationId = await getLastLocationId(userId, orgId)
    return NextResponse.json({ last_location_id: lastLocationId })
  } catch (err) {
    console.error('Error fetching last location:', err)
    return NextResponse.json({ error: 'Failed to fetch last location' }, { status: 500 })
  }
}

// PATCH — update the current user's last location for their active org
export async function PATCH(request) {
  try {
    const { userId, orgId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 404 })

    const { location_id } = await request.json()
    await setLastLocationId(userId, orgId, location_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error updating last location:', err)
    return NextResponse.json({ error: 'Failed to update last location' }, { status: 500 })
  }
}