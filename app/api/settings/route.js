import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope, organizationIdFor } from '@/lib/db'

export const dynamic = 'force-dynamic'

// "Days" enum is Monday..Sunday; we key the UI by index 0=Mon.
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_INDEX = Object.fromEntries(DAY_NAMES.map((d, i) => [d, i]))
const tzToDec = (t) => { if (!t) return null; const [h, m] = String(t).slice(0, 5).split(':').map(Number); return (h || 0) + (m || 0) / 60 }
const decToTz = (d) => { const h = Math.floor(d), m = Math.round((d - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+00` }

// GET /api/settings — org + the ACTIVE location + its per-day hours (both opening & operating).
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = organizationIdFor(userId)
    const { locationIds } = await getOrgScope(userId)
    const locationId = locationIds[0]

    const [{ data: org }, { data: loc }, { data: hours }] = await Promise.all([
      supabaseAdmin.from('Organizations').select('organization_name, industry, currency').eq('organization_id', orgId).maybeSingle(),
      locationId ? supabaseAdmin.from('Locations').select('location_id, name, address, shift_lengths, currency').eq('location_id', locationId).maybeSingle() : Promise.resolve({ data: null }),
      locationId ? supabaseAdmin.from('Location Day Hours').select('day, opening_time, closing_time, start_time, end_time').eq('location_id', locationId) : Promise.resolve({ data: [] }),
    ])

    const days = {}
    for (let i = 0; i < 7; i++) days[i] = { open: false, opening: [9, 17], operating: [8, 18] }
    for (const r of hours || []) {
      const i = DAY_INDEX[r.day]
      if (i == null) continue
      days[i] = { open: true, opening: [tzToDec(r.opening_time), tzToDec(r.closing_time)], operating: [tzToDec(r.start_time), tzToDec(r.end_time)] }
    }

    return NextResponse.json({
      organization: { name: org?.organization_name || '', industry: org?.industry || '', currency: org?.currency || 'GBP' },
      location: loc ? { id: loc.location_id, name: loc.name || '', address: loc.address || '', shift_lengths: Array.isArray(loc.shift_lengths) ? loc.shift_lengths : [4, 6, 8], currency: loc.currency || 'GBP' } : null,
      hours: days,
    })
  } catch (error) {
    console.error('Error loading settings:', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

// PATCH /api/settings — partial save. body: { organization?, location?, hours? }
export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = organizationIdFor(userId)
    const { locationIds } = await getOrgScope(userId)
    const locationId = locationIds[0]
    const body = await request.json()

    if (body.organization) {
      const o = body.organization
      const patch = {}
      if (o.name !== undefined) patch.organization_name = o.name
      if (o.industry !== undefined) patch.industry = o.industry
      if (o.currency !== undefined) patch.currency = o.currency
      if (Object.keys(patch).length) {
        const { error } = await supabaseAdmin.from('Organizations').update(patch).eq('organization_id', orgId)
        if (error) throw error
      }
    }

    if (body.location && locationId) {
      const l = body.location
      const patch = {}
      if (l.name !== undefined) patch.name = l.name
      if (l.address !== undefined) patch.address = l.address
      if (l.currency !== undefined) patch.currency = l.currency
      if (Array.isArray(l.shift_lengths)) patch.shift_lengths = l.shift_lengths
      if (Object.keys(patch).length) {
        const { error } = await supabaseAdmin.from('Locations').update(patch).eq('location_id', locationId).eq('organization_id', orgId)
        if (error) throw error
      }
    }

    if (body.hours && locationId) {
      // replace the per-day rows for this location (open days only)
      await supabaseAdmin.from('Location Day Hours').delete().eq('location_id', locationId)
      const rows = []
      for (let i = 0; i < 7; i++) {
        const d = body.hours[i]
        if (!d?.open) continue
        const [oo, oc] = d.opening || [9, 17]
        const [so, se] = d.operating || [oo, oc]
        rows.push({ location_id: locationId, day: DAY_NAMES[i], opening_time: decToTz(oo), closing_time: decToTz(oc), start_time: decToTz(so), end_time: decToTz(se) })
      }
      if (rows.length) {
        const { error } = await supabaseAdmin.from('Location Day Hours').insert(rows)
        if (error) throw error
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings', details: error.message }, { status: 500 })
  }
}
