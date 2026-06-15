import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, organizationIdFor } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_SHIFT_LENGTHS = [4, 6, 8, 10, 12]

// timetz literal from an "HH:MM" string (UTC offset to avoid session-tz drift)
const tz = (t, fallback) => `${t || fallback}:00+00`

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { business_name, industry, teams, operating_hours } = await request.json()
    if (!business_name || !industry || !teams?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const organizationId = organizationIdFor(userId)

    // 1. Organization (manager-as-org: organization_id = Clerk user id)
    const { error: orgErr } = await supabaseAdmin
      .from('Organizations')
      .upsert(
        {
          organization_id: organizationId,
          organization_name: business_name,
          industry,
          onboarding_completed: true,
        },
        { onConflict: 'organization_id' }
      )
    if (orgErr) throw orgErr

    // 2. If the org already has a location, this is a re-onboard — update org only, don't duplicate.
    const { data: existingLocs, error: existErr } = await supabaseAdmin
      .from('Locations')
      .select('location_id')
      .eq('organization_id', organizationId)
      .limit(1)
    if (existErr) throw existErr
    if (existingLocs && existingLocs.length > 0) {
      return NextResponse.json({ success: true, locationId: existingLocs[0].location_id, reonboarded: true })
    }

    // 3. First Location for this org — the billable unit.
    const { data: location, error: locErr } = await supabaseAdmin
      .from('Locations')
      .insert({
        name: business_name,
        organization_id: organizationId,
        shift_lengths: DEFAULT_SHIFT_LENGTHS,
        address: '',
      })
      .select('location_id')
      .single()
    if (locErr) throw locErr
    const locationId = location.location_id

    // 4. Location Day Hours — one row per OPEN day.
    const dayRows = []
    for (const [day, h] of Object.entries(operating_hours || {})) {
      if (!h?.open) continue
      dayRows.push({
        location_id: locationId,
        day, // "Days" enum: 'Monday'..'Sunday'
        opening_time: tz(h.opening, '09:00'),
        closing_time: tz(h.closing, '23:00'),
        start_time: tz(h.first_shift || h.opening, '09:00'),
        end_time: tz(h.last_shift || h.closing, '23:00'),
      })
    }
    if (dayRows.length > 0) {
      const { error: dayErr } = await supabaseAdmin.from('Location Day Hours').insert(dayRows)
      if (dayErr) throw dayErr
    }

    // 5. Location Rules — defaults (all columns have DB defaults; just create the row).
    const { error: rulesErr } = await supabaseAdmin
      .from('Location Rules')
      .insert({ location_id: locationId })
    if (rulesErr) throw rulesErr

    // 6. Teams under the location (team colour is client-only — no column in new schema).
    const teamRows = teams.map((t) => ({ name: t.label, location_id: locationId }))
    const { error: teamErr } = await supabaseAdmin.from('Teams').insert(teamRows)
    if (teamErr) throw teamErr

    return NextResponse.json({ success: true, locationId })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save onboarding data', details: error.message }, { status: 500 })
  }
}
