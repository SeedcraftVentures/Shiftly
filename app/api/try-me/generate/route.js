import { NextResponse } from 'next/server'

// Public, no-auth rota generation for the /try-me lead-magnet tool.
// Takes the builder's in-browser state, converts it to the scheduler's payload,
// and calls the same Python OR-Tools service the real app uses. No database.

export const dynamic = 'force-dynamic'

const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const hhmm = (h) => {
  if (!Number.isFinite(h)) return '00:00'
  const hr = Math.floor(h), m = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
// scheduler only uses day-level availability — a day is available if avail[d] is truthy
function availabilityGrid(avail) {
  const grid = {}
  for (let d = 0; d < 7; d++) grid[SHORT[d]] = avail && avail[d] ? 'available' : 'unavailable'
  return grid
}

// Best-effort IP rate limit (per serverless instance — a light guard, not bulletproof).
const HITS = new Map() // ip -> [timestamps]
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 12
function rateLimited(ip, now) {
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  arr.push(now)
  HITS.set(ip, arr)
  if (HITS.size > 5000) HITS.clear() // crude memory bound
  return arr.length > MAX_PER_WINDOW
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
    // Date.now is fine in a request handler (not a workflow); used only for rate limiting.
    if (rateLimited(ip, Date.now())) return NextResponse.json({ error: 'Too many tries — give it a minute.' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

    const business = body.business || { 0: [9, 17], 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: null }
    const openDays = new Set([0, 1, 2, 3, 4, 5, 6].filter((d) => Array.isArray(business[d])))
    const inShifts = Array.isArray(body.shifts) ? body.shifts : []
    const inStaff = Array.isArray(body.staff) ? body.staff : []

    // demo caps — keep the public scheduler call small
    if (inShifts.length === 0 || inStaff.length === 0) return NextResponse.json({ error: 'Add at least one shift and one team member first.' }, { status: 400 })
    if (inShifts.length > 40) return NextResponse.json({ error: 'This free tool handles up to 40 shift patterns.' }, { status: 400 })
    if (inStaff.length > 30) return NextResponse.json({ error: 'This free tool handles up to 30 team members.' }, { status: 400 })

    const staff = inStaff.map((s, i) => ({
      id: s.id || `s${i}`,
      name: s.name || `Person ${i + 1}`,
      contracted_hours: Number(s.contracted) || 0,
      max_hours: Number(s.max) || Number(s.contracted) || 48,
      keyholder: !!s.keyholder,
      availability_grid: availabilityGrid(s.avail),
      team_id: 'demo',
      team_name: 'Team',
    }))

    // expand each shift pattern into one shift per open day it runs
    const shifts = []
    for (const [i, p] of inShifts.entries()) {
      const days = Array.isArray(p.days) ? p.days : []
      for (const d of days) {
        if (!openDays.has(d)) continue
        const anchor = p.start <= (business[d]?.[0] ?? 9) + 0.01 ? 'open' : (p.end >= (business[d]?.[1] ?? 17) - 0.01 ? 'close' : 'fixed')
        shifts.push({
          id: `${p.id || 'sh' + i}`,
          name: p.name || `Shift ${i + 1}`,
          day: DAY_FULL[d],
          start_time: hhmm(p.start),
          end_time: hhmm(p.end),
          staff_required: Number(p.staff) || 1,
          keyholder_required: !!p.keyholder,
          anchor_type: anchor,
        })
      }
    }
    if (shifts.length === 0) return NextResponse.json({ error: 'Your shifts don’t run on any open days — check your opening hours.' }, { status: 400 })

    const rules = { min_rest_hours: 11, max_consecutive_days: 5, enforce_keyholder: false, fair_distribution: true }
    const pythonUrl = process.env.PYTHON_SCHEDULER_URL || 'https://shiftly-scheduler-e470.onrender.com'

    const resp = await fetch(`${pythonUrl}/schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff, shifts, rules, weeks: 1 }) })
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      return NextResponse.json({ error: 'The scheduler is waking up — try again in a few seconds.', detail: txt.slice(0, 200) }, { status: 502 })
    }
    const result = await resp.json()
    if (!result || result.success === false) return NextResponse.json({ error: result?.error || 'Couldn’t build a rota from those inputs. Add more availability or staff.' }, { status: 200 })

    return NextResponse.json({ success: true, assignments: result.assignments || [], stats: result.stats || null })
  } catch (e) {
    return NextResponse.json({ error: 'Something went wrong generating the rota.', detail: String(e).slice(0, 200) }, { status: 500 })
  }
}
