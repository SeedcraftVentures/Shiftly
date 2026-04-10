import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { NextResponse } from 'next/server'
import { supabaseService } from '@/app/lib/supabaseService'
import { DB_TABLES } from '@/app/lib/constants'
import { DEFAULT_LOCALE } from '@/app/lib/shiftUtils'
import { convertTimeToTimetz } from '@/app/lib/timeUtils'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { organization_name, industry, otherIndustry, address, teams, operating_hours } = await request.json()

    if (!organization_name || !industry || !address || !teams?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dayEntries = Object.entries(operating_hours)
    if (dayEntries.length === 0) {
      return NextResponse.json({ error: 'operating_hours is required' }, { status: 400 })
    }

    // 1. Organizations
    const { data: organization, error: organizationInsertError } = await supabaseService
      .from(DB_TABLES.organizations)
      .insert({
        organization_name: organization_name,
        owner_user_id: userId,
        industry: industry,
        other_industry: otherIndustry || "",
        onboarding_completed: true,
      })
      .select('organization_id')
      .single()

    if (organizationInsertError) throw organizationInsertError

    const organization_id = organization?.organization_id
    if (!organization_id) throw new Error('Organization ID not returned')

    // 2. Organization Members
    const { error: memberInsertError } = await supabaseService
      .from(DB_TABLES.organizationMembers)
      .insert({
        member_user_id: userId,
        access: 'Manager',
        organization_id: organization_id,
      })

    if (memberInsertError) throw memberInsertError

    // 3. Locations
    const { data: location, error: locationInsertError } = await supabaseService
      .from(DB_TABLES.locations)
      .insert({
        name: address,
        organization_id: organization_id,
        // TODO: Replace with locale
        shift_lengths: DEFAULT_LOCALE.shift_lengths,
        max_consecutive_days: DEFAULT_LOCALE.max_consecutive_days,
        min_wage: DEFAULT_LOCALE.min_wage
      })
      .select('location_id')
      .single()

    if (locationInsertError) throw locationInsertError

    const location_id = location?.location_id
    if (!location_id) throw new Error('Location ID not returned')

    // 4. Teams (one team row per team)
    const teamsRows = teams.map((team) => ({
      name: team.label,
      location_id: location_id
    }))

    const { data: insertedTeams, error: teamsInsertError } = await supabaseService
      .from(DB_TABLES.teamsNew)
      .insert(teamsRows)
      .select('team_id')

    if (teamsInsertError) throw teamsInsertError

    // 5. Location Day hours (open days only)
    const locationDayHoursRows = dayEntries
      .filter(([, dayData]) => dayData?.open)
      .map(([day, dayData]) => ({
        // row_id: `${location_id}_${day}`,
        location_id: location_id,
        day: day,
        opening_time: convertTimeToTimetz(dayData.opening),
        closing_time: convertTimeToTimetz(dayData.closing),
        start_time: convertTimeToTimetz(dayData.first_shift),
        end_time: convertTimeToTimetz(dayData.last_shift),
      }))

    if (locationDayHoursRows.length > 0) {
      const { error: locationDayHoursInsertError } = await supabaseService
        .from(DB_TABLES.locationDayHours)
        .insert(locationDayHoursRows)

      if (locationDayHoursInsertError) throw locationDayHoursInsertError
    }

    // 6. Team Day Hours (open days only)
    const teamDayHoursRows = insertedTeams.flatMap((teamRow) =>
      dayEntries
      .filter(([, dayData]) => dayData.open)
      .map(([day]) => ({
        // row_id: `${teamRow.team_id}_${day}`,
        team_id: teamRow.team_id,
        day: day,
      }))
    )

    if (teamDayHoursRows.length > 0) {
      const { error: teamDayHoursInsertError } = await supabaseService
        .from(DB_TABLES.teamDayHours)
        .insert(teamDayHoursRows)

      if (teamDayHoursInsertError) throw teamDayHoursInsertError
    }

    return NextResponse.json({ success: true })
    // throw new Error('Testing ongoing onboarding work - not actually saving data yet')
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
  }
}