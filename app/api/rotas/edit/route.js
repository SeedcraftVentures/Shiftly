import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'
import { requireActive } from '@/lib/entitlement'

export const dynamic = 'force-dynamic'

const tz = (hhmm) => (hhmm ? `${String(hhmm).slice(0, 5)}:00+00` : null) // 'HH:MM' → timetz
const mondayOf = (ymd) => { const d = new Date(ymd + 'T00:00:00Z'); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10) }

// POST /api/rotas/edit — small, targeted edits to a SAVED rota (usually the published one),
// for urgent day-to-day changes (sickness, cover, swaps) that keep payroll accurate.
// body: { work_date, op: 'remove'|'reassign'|'swap'|'add', staff_id, to_staff_id,
//         staff_a, staff_b, shift_id, start_time, end_time, name }
// The whole-rota shape is untouched; we only add/remove/reassign individual assignments.
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const denied = await requireActive(userId)
    if (denied) return NextResponse.json({ error: 'trial_ended', ...denied }, { status: 402 })
    const { locationIds } = await getOrgScope(userId)
    if (locationIds.length === 0) return NextResponse.json({ error: 'No location.' }, { status: 400 })

    const body = await request.json()
    const { work_date, op } = body
    if (!work_date || !op) return NextResponse.json({ error: 'work_date and op are required' }, { status: 400 })

    // Find the rota for the week containing this date; prefer the published one (the live rota).
    const ws = mondayOf(work_date)
    const { data: rotas } = await supabaseAdmin.from('Rotas').select('rota_id, status').in('location_id', locationIds).eq('week_start', ws)
    if (!rotas || rotas.length === 0) return NextResponse.json({ error: `No rota exists for the week of ${ws}. Build and publish one first.` }, { status: 404 })
    const rota = rotas.find((r) => r.status === 'Published') || rotas[0]
    const rid = rota.rota_id
    const tbl = () => supabaseAdmin.from('Rota Assignments')

    if (op === 'remove') {
      if (!body.staff_id) return NextResponse.json({ error: 'staff_id is required to remove a shift' }, { status: 400 })
      let q = tbl().delete().eq('rota_id', rid).eq('staff_id', body.staff_id).eq('work_date', work_date)
      if (body.shift_id) q = q.eq('shift_id', body.shift_id)
      const { data, error } = await q.select('assignment_id')
      if (error) throw error
      if (!data || data.length === 0) return NextResponse.json({ error: 'No matching shift to remove on that date.' }, { status: 404 })
      return NextResponse.json({ ok: true, changed: data.length, status: rota.status, summary: `Took them off ${data.length} shift${data.length > 1 ? 's' : ''} on ${work_date}.` })
    }

    if (op === 'reassign') {
      if (!body.staff_id || !body.to_staff_id) return NextResponse.json({ error: 'staff_id (from) and to_staff_id are required' }, { status: 400 })
      let q = tbl().update({ staff_id: body.to_staff_id }).eq('rota_id', rid).eq('staff_id', body.staff_id).eq('work_date', work_date)
      if (body.shift_id) q = q.eq('shift_id', body.shift_id)
      const { data, error } = await q.select('assignment_id')
      if (error) throw error
      if (!data || data.length === 0) return NextResponse.json({ error: 'No matching shift to move on that date.' }, { status: 404 })
      return NextResponse.json({ ok: true, changed: data.length, status: rota.status, summary: `Moved ${data.length} shift${data.length > 1 ? 's' : ''} to the other person on ${work_date}.` })
    }

    if (op === 'swap') {
      if (!body.staff_a || !body.staff_b) return NextResponse.json({ error: 'staff_a and staff_b are required to swap' }, { status: 400 })
      // Capture row ids FIRST, then flip, so the second update can't re-match the first's new rows.
      const { data: rows, error: selErr } = await tbl().select('assignment_id, staff_id').eq('rota_id', rid).eq('work_date', work_date).in('staff_id', [body.staff_a, body.staff_b])
      if (selErr) throw selErr
      const aIds = (rows || []).filter((r) => r.staff_id === body.staff_a).map((r) => r.assignment_id)
      const bIds = (rows || []).filter((r) => r.staff_id === body.staff_b).map((r) => r.assignment_id)
      if (aIds.length === 0 && bIds.length === 0) return NextResponse.json({ error: 'Neither person has a shift on that date to swap.' }, { status: 404 })
      if (aIds.length) { const { error } = await tbl().update({ staff_id: body.staff_b }).in('assignment_id', aIds); if (error) throw error }
      if (bIds.length) { const { error } = await tbl().update({ staff_id: body.staff_a }).in('assignment_id', bIds); if (error) throw error }
      return NextResponse.json({ ok: true, status: rota.status, summary: `Swapped their shifts on ${work_date}.` })
    }

    if (op === 'add') {
      if (!body.staff_id) return NextResponse.json({ error: 'staff_id is required to add a shift' }, { status: 400 })
      const row = { rota_id: rid, staff_id: body.staff_id, work_date, week: 1 }
      if (body.shift_id) {
        row.shift_id = body.shift_id
      } else if (body.start_time && body.end_time) {
        row.shift_id = null; row.custom_start = tz(body.start_time); row.custom_end = tz(body.end_time); row.custom_name = body.name || 'Extra shift'
      } else {
        return NextResponse.json({ error: 'Pass a shift_id, or start_time and end_time, for the shift to add.' }, { status: 400 })
      }
      const { error } = await tbl().insert(row)
      if (error) throw error
      return NextResponse.json({ ok: true, status: rota.status, summary: `Added a shift on ${work_date}.` })
    }

    return NextResponse.json({ error: `Unknown op '${op}'.` }, { status: 400 })
  } catch (error) {
    console.error('Error editing rota:', error)
    return NextResponse.json({ error: 'Failed to edit the rota', details: error.message }, { status: 500 })
  }
}
