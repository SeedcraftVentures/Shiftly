import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
// Service-role client: this is a server route and RLS is enabled on the app
// tables, so the anon client would read nothing. Auth is enforced by auth() below.
import { supabaseAdmin as supabase } from '@/lib/db'

export const dynamic = 'force-dynamic'

const FULL_DAYS = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
}

function decimalToTime(dec) {
  const h = Math.floor(((dec % 24) + 24) % 24)
  const m = Math.round((dec - Math.floor(dec)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function shiftName(start, length) {
  const h = Math.floor(start)
  if (h < 12) return `Morning ${length}h`
  if (h < 17) return `Afternoon ${length}h`
  return `Evening ${length}h`
}

// POST - Regenerate Shifts table from templates
export async function POST(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 'team-id': teamId } = await params

    const { data: team, error: teamError } = await supabase
      .from('Teams')
      .select('day_templates, week_template')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { day_templates: dayTemplates, week_template: weekTemplate } = team

    if (!dayTemplates || !weekTemplate) {
      return NextResponse.json({ error: 'No templates configured for this team' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('Shifts')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    const shiftRows = []

    for (const [dayAbbr, dayConfig] of Object.entries(weekTemplate)) {
      if (!dayConfig.on) continue

      const templateName = dayConfig.tmpl
      const template = dayTemplates[templateName]
      if (!template || !template.shifts || template.shifts.length === 0) continue

      for (const shift of template.shifts) {
        const startTime = decimalToTime(shift.start)
        const endDec = shift.start + shift.length
        const endTime = decimalToTime(endDec)

        shiftRows.push({
          team_id: teamId,
          user_id: userId,
          shift_name: shiftName(shift.start, shift.length),
          day_of_week: FULL_DAYS[dayAbbr],
          start_time: startTime,
          end_time: endTime,
          staff_required: shift.headcount || 1
        })
      }
    }

    let inserted = 0
    if (shiftRows.length > 0) {
      const { error: insertError } = await supabase
        .from('Shifts')
        .insert(shiftRows)

      if (insertError) throw insertError
      inserted = shiftRows.length
    }

    return NextResponse.json({
      success: true,
      shifts_generated: inserted,
      days_active: Object.values(weekTemplate).filter(d => d.on).length
    })
  } catch (error) {
    console.error('Error syncing shifts:', error)
    return NextResponse.json({ error: 'Failed to sync shifts from templates' }, { status: 500 })
  }
}