import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - list saved rotas for the org's location(s)
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { locationIds } = await getOrgScope(userId)
    if (locationIds.length === 0) return NextResponse.json([])

    const { data, error } = await supabaseAdmin
      .from('Rotas')
      .select('rota_id, name, location_id, week_start, status, generated_at, published_at, notes')
      .in('location_id', locationIds)
      .order('week_start', { ascending: false })
    if (error) throw error

    return NextResponse.json((data || []).map((r) => ({
      id: r.rota_id, name: r.name, week_start: r.week_start, status: r.status,
      generated_at: r.generated_at, published_at: r.published_at, notes: r.notes,
    })))
  } catch (error) {
    console.error('Error listing rotas:', error)
    return NextResponse.json({ error: 'Failed to list rotas' }, { status: 500 })
  }
}

// POST - save a generated rota: a Rotas row + its Rota Assignments
// body: { weekStart, assignments:[{shift_id, staff_id, work_date, week}], status:'Draft'|'Published' }
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { locationIds } = await getOrgScope(userId)
    const locationId = locationIds[0]
    if (!locationId) return NextResponse.json({ error: 'No location. Complete onboarding first.' }, { status: 400 })

    const body = await request.json()
    const { weekStart, assignments, name } = body
    const status = body.status === 'Published' ? 'Published' : 'Draft'
    if (!weekStart || !Array.isArray(assignments)) return NextResponse.json({ error: 'weekStart and assignments are required' }, { status: 400 })

    // one rota per location+week, replace any existing (assignments cascade-delete)
    await supabaseAdmin.from('Rotas').delete().eq('location_id', locationId).eq('week_start', weekStart)

    const now = new Date().toISOString()
    const { data: rota, error } = await supabaseAdmin
      .from('Rotas')
      .insert({ location_id: locationId, name: name || null, week_start: weekStart, status, generated_at: now, published_at: status === 'Published' ? now : null, published_by: status === 'Published' ? userId : null })
      .select('rota_id')
      .single()
    if (error) throw error

    const tz = (hhmm) => (hhmm ? `${hhmm}:00+00` : null) // 'HH:MM' → timetz
    const rows = assignments
      .filter((a) => a.staff_id && a.work_date && (a.shift_id || (a.start_time && a.end_time)))
      .map((a) => {
        const custom = !a.shift_id
        return {
          rota_id: rota.rota_id, shift_id: a.shift_id || null, staff_id: a.staff_id, work_date: a.work_date, week: a.week || 1,
          custom_start: custom ? tz(a.start_time) : null, custom_end: custom ? tz(a.end_time) : null, custom_name: custom ? (a.shift_name || 'Custom shift') : null,
        }
      })
    if (rows.length) {
      const { error: aErr } = await supabaseAdmin.from('Rota Assignments').insert(rows)
      if (aErr) throw aErr
    }

    return NextResponse.json({ id: rota.rota_id, status, saved: rows.length })
  } catch (error) {
    console.error('Error saving rota:', error)
    return NextResponse.json({ error: 'Failed to save rota', details: error.message }, { status: 500 })
  }
}
