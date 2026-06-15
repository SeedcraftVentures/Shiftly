import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Universal solver rules. Stored per-LOCATION in "Location Rules".solver_rules (jsonb),
// with the overlapping typed columns kept in sync. The scheduler reads this object directly.
function getDefaultRules() {
  return {
    enforce_keyholder: true,
    min_rest_hours: 11,
    max_consecutive_days: 5,
    fair_distribution: true,
    prefer_consecutive_days_off: true,
    balance_keyholder_shifts: true,
  }
}

// Map the rule object onto the typed "Location Rules" columns it overlaps with.
function typedColumns(rules) {
  const c = {}
  if (typeof rules.min_rest_hours === 'number') c.min_rest_hours = rules.min_rest_hours
  if (typeof rules.max_consecutive_days === 'number') c.max_consecutive_days = rules.max_consecutive_days
  if (typeof rules.fair_distribution === 'boolean') c.fair_weekend_distribution = rules.fair_distribution
  return c
}

// GET - returns one entry per location (the page reads data[0].rules)
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { locationIds } = await getOrgScope(userId)
    if (locationIds.length === 0) {
      return NextResponse.json([{ location_id: null, rules: getDefaultRules() }])
    }

    const [{ data: locs }, { data: ruleRows }] = await Promise.all([
      supabaseAdmin.from('Locations').select('location_id, name').in('location_id', locationIds),
      supabaseAdmin.from('Location Rules').select('location_id, solver_rules').in('location_id', locationIds),
    ])
    const rulesByLoc = Object.fromEntries((ruleRows || []).map((r) => [r.location_id, r.solver_rules]))

    const result = (locs || []).map((l) => ({
      location_id: l.location_id,
      location_name: l.name,
      rules: { ...getDefaultRules(), ...(rulesByLoc[l.location_id] || {}) },
    }))

    return NextResponse.json(result.length ? result : [{ location_id: null, rules: getDefaultRules() }])
  } catch (error) {
    console.error('Error fetching rules:', error)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }
}

// PUT - accepts { rules } plus EITHER location_id OR team_id (the page sends team_id per team).
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { team_id, location_id, rules } = await request.json()
    if (!rules) return NextResponse.json({ error: 'rules required' }, { status: 400 })

    const { locationIds } = await getOrgScope(userId)

    let locId = location_id
    if (!locId && team_id) {
      const { data: team } = await supabaseAdmin
        .from('Teams')
        .select('location_id')
        .eq('team_id', team_id)
        .maybeSingle()
      locId = team?.location_id
    }
    if (!locId) locId = locationIds[0]
    if (!locId || !locationIds.includes(locId)) {
      return NextResponse.json({ error: 'Location not in your organization' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('Location Rules')
      .upsert(
        { location_id: locId, solver_rules: rules, ...typedColumns(rules) },
        { onConflict: 'location_id' }
      )
    if (error) throw error

    return NextResponse.json({ location_id: locId, rules })
  } catch (error) {
    console.error('Error saving rules:', error)
    return NextResponse.json({ error: 'Failed to save rules' }, { status: 500 })
  }
}
