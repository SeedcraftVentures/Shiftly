import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { DB_TABLES, DEFAULT_SHIFT_LENGTHS, DEFAULT_MAX_CONSECUTIVE_HOURS, DEFAULT_LOCATION_RULES, DEFAULT_STAFF } from '@/app/lib/constants'
import { convertTimeToTimetz } from '@/app/lib/timeUtils'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  let supabase
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    supabase = await createSupabaseServerClient()

    const {
      organization_name,
      industry,
      address,
      location_nickname,
      currency,
      min_wage,
      teams,
      operating_hours,
      staff_by_team,
    } = await request.json()

    if (!organization_name || !industry || !address || !teams?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dayEntries = Object.entries(operating_hours || {})
    if (dayEntries.length === 0) {
      return NextResponse.json({ error: 'operating_hours is required' }, { status: 400 })
    }

    // 1. Organizations
    const { data: org, error: orgErr } = await supabase
      .from(DB_TABLES.organizations)
      .insert({
        organization_name,
        owner_user_id: userId,
        industry,
      })
      .select('organization_id')
      .single()

    if (orgErr) throw orgErr
    const organization_id = org.organization_id

    // 2. Organization Members (owner as highest-permission role)
    const { error: memberErr } = await supabase
      .from(DB_TABLES.organizationMembers)
      .insert({
        member_user_id: userId,
        access: 'Manager',
        organization_id,
      })

    if (memberErr) throw memberErr

    // 3. Locations
    const { data: loc, error: locErr } = await supabase
      .from(DB_TABLES.locations)
      .insert({
        name: location_nickname || address,
        address,
        organization_id,
        min_wage: min_wage || null,
        currency: currency || 'GBP',
        shift_lengths: DEFAULT_SHIFT_LENGTHS,
        max_consecutive_hours: DEFAULT_MAX_CONSECUTIVE_HOURS,
      })
      .select('location_id')
      .single()

    if (locErr) throw locErr
    const location_id = loc.location_id

    // 4. Location Day Hours (one row per open day)
    const openDays = dayEntries.filter(([, d]) => d?.open)
    if (openDays.length > 0) {
      const dayRows = openDays.map(([day, d]) => ({
        location_id,
        day,
        opening_time: convertTimeToTimetz(d.opening),
        closing_time: convertTimeToTimetz(d.closing),
        start_time: convertTimeToTimetz(d.first_shift),
        end_time: convertTimeToTimetz(d.last_shift),
      }))

      const { error: dayErr } = await supabase
        .from(DB_TABLES.locationDayHours)
        .insert(dayRows)

      if (dayErr) throw dayErr
    }

    // 5. Location Rules (defaults)
    const { error: rulesErr } = await supabase
      .from(DB_TABLES.locationRules)
      .insert({
        location_id,
        ...DEFAULT_LOCATION_RULES,
      })

    if (rulesErr) throw rulesErr

    // 6. Teams_new (one row per selected team)
    const teamRows = teams.map(t => ({
      name: t.label,
      location_id,
    }))

    const { data: insertedTeams, error: teamsErr } = await supabase
      .from(DB_TABLES.teamsNew)
      .insert(teamRows)
      .select('team_id, name')

    if (teamsErr) throw teamsErr

    // Team Day Hours (open days per team)
    const teamDayRows = insertedTeams.flatMap(t =>
      openDays.map(([day]) => ({
        team_id: t.team_id,
        day,
      }))
    )

    if (teamDayRows.length > 0) {
      const { error: tdErr } = await supabase
        .from(DB_TABLES.teamDayHours)
        .insert(teamDayRows)

      if (tdErr) throw tdErr
    }

    // 7. Staff_new (quick-added names; all other fields from DEFAULT_STAFF)
    if (staff_by_team && Object.keys(staff_by_team).length > 0) {
      // Build a map from team label → inserted team_id
      const teamLabelToId = {}
      teams.forEach((t, i) => {
        if (insertedTeams[i]) {
          teamLabelToId[t.id] = insertedTeams[i].team_id
        }
      })

      const staffRows = []
      for (const [teamKey, names] of Object.entries(staff_by_team)) {
        const teamId = teamLabelToId[teamKey]
        if (!teamId || !Array.isArray(names)) continue
        for (const name of names) {
          if (!name.trim()) continue
          staffRows.push({
            name: name.trim(),
            team_id: teamId,
            ...DEFAULT_STAFF,
          })
        }
      }

      if (staffRows.length > 0) {
        const { error: staffErr } = await supabase
          .from(DB_TABLES.staffNew)
          .insert(staffRows)

        if (staffErr) throw staffErr
      }
    }

    // 8. Mark onboarding complete
    const { error: completeErr } = await supabase
      .from(DB_TABLES.organizations)
      .update({ onboarding_completed: true })
      .eq('organization_id', organization_id)

    if (completeErr) throw completeErr

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
  }
}
