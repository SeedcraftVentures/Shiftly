import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { business_name, industry, teams, operating_hours } = await request.json()

    if (!business_name || !industry || !teams?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get existing teams for this user
    const { data: existingTeams, error: fetchError } = await supabase
      .from('Teams')
      .select('id')
      .eq('user_id', userId)

    if (fetchError) throw fetchError

    // Derive open_time and close_time from operating hours
    // Use the most common/earliest open and latest close across active days
    const activeDays = Object.values(operating_hours).filter(d => d.open)
    const openTimes = activeDays.map(d => d.first_shift)
    const closeTimes = activeDays.map(d => d.last_shift)

    const toDecimal = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number)
      return h + m / 60
    }

    // Use earliest first shift as open_time, latest last shift as close_time
    const openTime = openTimes.length > 0
      ? openTimes.reduce((a, b) => toDecimal(a) <= toDecimal(b) ? a : b)
      : '09:00'
    const closeTime = closeTimes.length > 0
      ? closeTimes.reduce((a, b) => toDecimal(a) >= toDecimal(b) ? a : b)
      : '23:00'

    if (existingTeams && existingTeams.length > 0) {
      // User has existing teams — update the default one and create new team rows

      const defaultTeamId = existingTeams[0].id

      // Update default team with business info
      const { error: updateError } = await supabase
        .from('Teams')
        .update({
          business_name,
          industry,
          onboarding_completed: true,
          operating_hours,
          open_time: openTime,
          close_time: closeTime,
        })
        .eq('id', defaultTeamId)
        .eq('user_id', userId)

      if (updateError) throw updateError

      // Rename and update all teams being created
      const teamUpdates = teams.map((team, i) => {
        if (i === 0) {
          // Update first existing team
          return supabase
            .from('Teams')
            .update({
              team_name: team.label,
              color: team.color,
              business_name,
              industry,
              onboarding_completed: true,
              operating_hours,
              open_time: openTime,
              close_time: closeTime,
            })
            .eq('id', defaultTeamId)
            .eq('user_id', userId)
        } else {
          // Insert new teams
          return supabase
            .from('Teams')
            .insert({
              user_id: userId,
              team_name: team.label,
              color: team.color,
              business_name,
              industry,
              onboarding_completed: true,
              operating_hours,
              open_time: openTime,
              close_time: closeTime,
              is_default: false,
            })
        }
      })

      await Promise.all(teamUpdates)

    } else {
      // No existing teams — insert all fresh
      const rows = teams.map((team, i) => ({
        user_id: userId,
        team_name: team.label,
        color: team.color,
        business_name,
        industry,
        onboarding_completed: true,
        operating_hours,
        open_time: openTime,
        close_time: closeTime,
        is_default: i === 0,
      }))

      const { error: insertError } = await supabase
        .from('Teams')
        .insert(rows)

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
  }
}