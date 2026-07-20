import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
// Service-role client: this is a server route and RLS is enabled on the app
// tables, so the anon client would read nothing. Auth is enforced by auth() below.
import { supabaseAdmin as supabase } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Calculate coverage stats for a team
export async function GET(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 'team-id': teamId } = await params

    const { data: team, error: teamError } = await supabase
      .from('Teams')
      .select('open_time, close_time, open_buffer, close_buffer, day_templates, week_template')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { data: staff, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, contracted_hours, max_hours, keyholder, preferred_shift_length')
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (staffError) throw staffError

    const { day_templates: dayTemplates, week_template: weekTemplate } = team

    if (!dayTemplates || !weekTemplate) {
      return NextResponse.json({
        coverage_percent: 0, total_shift_hours: 0, total_contracted_hours: 0,
        total_max_hours: 0, total_slots_needed: 0, total_slots_provided: 0,
        keyholder_slots_needed: 0, keyholder_slots_provided: 0, gaps: [], staff_count: staff?.length || 0
      })
    }

    let totalShiftHours = 0
    let totalSlotsNeeded = 0
    let keyholderSlotsNeeded = 0

    const openTime = parseFloat(team.open_time) || 8
    const closeTime = parseFloat(team.close_time) || 18

    for (const [dayAbbr, dayConfig] of Object.entries(weekTemplate)) {
      if (!dayConfig.on) continue
      const template = dayTemplates[dayConfig.tmpl]
      if (!template || !template.shifts) continue

      for (const shift of template.shifts) {
        totalShiftHours += shift.length * shift.headcount
        totalSlotsNeeded += shift.headcount
        const isOpening = shift.start <= openTime
        const isClosing = shift.start + shift.length >= closeTime
        if (isOpening || isClosing) keyholderSlotsNeeded += 1
      }
    }

    const totalContractedHours = (staff || []).reduce((sum, s) => sum + (s.contracted_hours || 0), 0)
    const totalMaxHours = (staff || []).reduce((sum, s) => sum + (s.max_hours || s.contracted_hours || 0), 0)

    const avgShiftLength = totalSlotsNeeded > 0 ? totalShiftHours / totalSlotsNeeded : 8
    const totalSlotsProvided = Math.floor(totalContractedHours / avgShiftLength)

    const keyholderStaff = (staff || []).filter(s => s.keyholder)
    const keyholderSlotsProvided = keyholderStaff.reduce((sum, s) => sum + Math.floor((s.contracted_hours || 0) / avgShiftLength), 0)

    const coveragePercent = totalShiftHours > 0
      ? Math.min(100, Math.round((totalContractedHours / totalShiftHours) * 100))
      : 0

    const gaps = []
    if (totalSlotsProvided < totalSlotsNeeded) gaps.push({ type: 'shifts', message: `Need ${totalSlotsNeeded - totalSlotsProvided} more shifts to cover the week`, severity: 'error' })
    if (keyholderSlotsProvided < keyholderSlotsNeeded) gaps.push({ type: 'keyholder', message: `Need ${keyholderSlotsNeeded - keyholderSlotsProvided} more keyholder shifts`, severity: 'warning' })
    if (totalContractedHours < totalShiftHours && totalMaxHours >= totalShiftHours) gaps.push({ type: 'overtime', message: `${Math.round(totalShiftHours - totalContractedHours)}h overtime needed to fill all shifts`, severity: 'warning' })
    if (totalMaxHours < totalShiftHours) gaps.push({ type: 'understaffed', message: `${Math.round(totalShiftHours - totalMaxHours)}h short even with maximum overtime`, severity: 'error' })

    return NextResponse.json({
      coverage_percent: coveragePercent,
      total_shift_hours: Math.round(totalShiftHours * 10) / 10,
      total_contracted_hours: Math.round(totalContractedHours * 10) / 10,
      total_max_hours: Math.round(totalMaxHours * 10) / 10,
      total_slots_needed: totalSlotsNeeded,
      total_slots_provided: totalSlotsProvided,
      keyholder_slots_needed: keyholderSlotsNeeded,
      keyholder_slots_provided: keyholderSlotsProvided,
      gaps,
      staff_count: staff?.length || 0
    })
  } catch (error) {
    console.error('Error calculating coverage:', error)
    return NextResponse.json({ error: 'Failed to calculate coverage' }, { status: 500 })
  }
}