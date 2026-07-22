// Every listing belonging to the signed-in employer, drafts and closed roles
// included, so they can see and act on all of them. Session gated: it only ever
// returns the caller's own rows.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { currentEmployerId } from '@/lib/jobs/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })
  const employerId = await currentEmployerId()
  if (!employerId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('Job Listings')
    .select('listing_id,slug,title,status,city,pay_min,pay_max,pay_period,pay_is_estimated,shift_pattern,contract_type,posted_at,featured_until,description')
    .eq('employer_id', employerId)
    .order('posted_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listings: data || [] })
}
