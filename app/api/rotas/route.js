import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'
import { requireActive } from '@/lib/entitlement'

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
    // Trial/paywall gate: an expired trial can view saved rotas (GET) but cannot
    // save, publish, or overwrite them.
    const denied = await requireActive(userId)
    if (denied) return NextResponse.json({ error: 'trial_ended', ...denied }, { status: 402 })
    const { locationIds } = await getOrgScope(userId)
    const locationId = locationIds[0]
    if (!locationId) return NextResponse.json({ error: 'No location. Complete onboarding first.' }, { status: 400 })

    const body = await request.json()
    const { weekStart, assignments, name } = body
    const status = body.status === 'Published' ? 'Published' : 'Draft'
    if (!weekStart || !Array.isArray(assignments)) return NextResponse.json({ error: 'weekStart and assignments are required' }, { status: 400 })

    const now = new Date().toISOString()
    const tz = (hhmm) => (hhmm ? `${hhmm}:00+00` : null) // 'HH:MM' → timetz
    const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
    const prettyWeek = (ymd) => { try { return `Week of ${new Date(ymd + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}` } catch { return name || 'Rota' } }

    // The model is one rota per location+week. A multi-week build arrives as one payload,
    // so split it into ONE rota row PER WEEK, each keyed to its own Monday — otherwise
    // weeks 2+ have no rota row and never surface (dashboard/employee/archive look up by week).
    const byWeek = new Map()
    for (const a of assignments) {
      const w = a.week || 1
      if (!byWeek.has(w)) byWeek.set(w, [])
      byWeek.get(w).push(a)
    }
    // Iterate the FULL span 1..maxWeek (not just weeks that happen to carry assignments), so a
    // week can never be silently dropped from a multi-week publish. Each week is named by its
    // own Monday so the archive reads clearly.
    const maxWeek = assignments.reduce((m, a) => Math.max(m, a.week || 1), 1)
    const multi = maxWeek > 1

    let firstId = null
    let totalSaved = 0
    for (let w = 1; w <= maxWeek; w++) {
      const weekAssignments = byWeek.get(w) || []
      const ws = addDays(weekStart, (w - 1) * 7)
      // Replace like-for-like (assignments cascade-delete). Publishing supersedes any draft
      // OR published rota for the week; saving a draft only replaces an existing draft, so a
      // work-in-progress draft never wipes the rota that's already live with staff.
      const del = supabaseAdmin.from('Rotas').delete().eq('location_id', locationId).eq('week_start', ws)
      await (status === 'Published' ? del : del.eq('status', 'Draft'))
      const { data: rota, error } = await supabaseAdmin
        .from('Rotas')
        .insert({ location_id: locationId, name: multi ? prettyWeek(ws) : (name || null), week_start: ws, status, generated_at: now, published_at: status === 'Published' ? now : null, published_by: status === 'Published' ? userId : null })
        .select('rota_id')
        .single()
      if (error) throw error
      if (firstId === null) firstId = rota.rota_id

      const rows = weekAssignments
        .filter((a) => a.staff_id && a.work_date && (a.shift_id || (a.start_time && a.end_time)))
        .map((a) => {
          const custom = !a.shift_id
          return {
            rota_id: rota.rota_id, shift_id: a.shift_id || null, staff_id: a.staff_id, work_date: a.work_date, week: 1,
            custom_start: custom ? tz(a.start_time) : null, custom_end: custom ? tz(a.end_time) : null, custom_name: custom ? (a.shift_name || 'Custom shift') : null,
          }
        })
      if (rows.length) {
        const { error: aErr } = await supabaseAdmin.from('Rota Assignments').insert(rows)
        if (aErr) throw aErr
        totalSaved += rows.length
      }
    }

    return NextResponse.json({ id: firstId, status, saved: totalSaved, weeks: maxWeek })
  } catch (error) {
    console.error('Error saving rota:', error)
    return NextResponse.json({ error: 'Failed to save rota', details: error.message }, { status: 500 })
  }
}
