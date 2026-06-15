import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin, organizationIdFor, ACTIVE_LOCATION_COOKIE } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - the org's workspace name + its locations + which one is active.
// Powers the Notion-style workspace switcher in the nav.
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = organizationIdFor(userId)

    const [{ data: org }, { data: locs }] = await Promise.all([
      supabaseAdmin.from('Organizations').select('organization_name').eq('organization_id', orgId).maybeSingle(),
      supabaseAdmin.from('Locations').select('location_id, name, address').eq('organization_id', orgId).order('name'),
    ])
    const locations = (locs || []).map((l) => ({ id: l.location_id, name: l.name, address: l.address }))

    const store = await cookies()
    const cookieVal = store.get(ACTIVE_LOCATION_COOKIE)?.value
    const active = locations.find((l) => l.id === cookieVal)?.id || locations[0]?.id || null

    return NextResponse.json({ organization_name: org?.organization_name || 'My workspace', active, locations })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

// POST - set the active location (validated against the org), stored in a cookie
// that getOrgScope reads, so the whole app re-scopes on the next request.
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = organizationIdFor(userId)
    const { location_id } = await request.json()

    const { data: loc } = await supabaseAdmin
      .from('Locations').select('location_id')
      .eq('organization_id', orgId).eq('location_id', location_id).maybeSingle()
    if (!loc) return NextResponse.json({ error: 'Unknown location' }, { status: 400 })

    const store = await cookies()
    store.set(ACTIVE_LOCATION_COOKIE, location_id, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    return NextResponse.json({ active: location_id })
  } catch (error) {
    console.error('Error setting active location:', error)
    return NextResponse.json({ error: 'Failed to set location' }, { status: 500 })
  }
}
