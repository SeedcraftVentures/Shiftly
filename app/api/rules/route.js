import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: teams, error: teamsError } = await supabase
      .from('Teams')
      .select('id, team_name, solver_rules')
      .eq('user_id', userId)

    if (teamsError) throw teamsError

    // Return rules per team, with defaults if not set
    const result = (teams || []).map(t => ({
      team_id: t.id,
      team_name: t.team_name,
      rules: t.solver_rules || getDefaultRules(),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching rules:', error)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { team_id, rules } = await request.json()
    if (!team_id) return NextResponse.json({ error: 'team_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('Teams')
      .update({ solver_rules: rules })
      .eq('id', team_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ team_id, rules: data.solver_rules })
  } catch (error) {
    console.error('Error saving rules:', error)
    return NextResponse.json({ error: 'Failed to save rules' }, { status: 500 })
  }
}

function getDefaultRules() {
  return {
    // Hard constraints — OR-Tools enforces these absolutely
    max_consecutive_days: 5,
    min_rest_hours: 11,
    max_weekly_hours: 48,
    enforce_keyholder: true,
    // Soft preferences — OR-Tools optimises toward these
    prefer_consecutive_days_off: true,
    fair_distribution: true,
    balance_keyholder_shifts: true,
    prefer_consistent_shift_times: false,
  }
}