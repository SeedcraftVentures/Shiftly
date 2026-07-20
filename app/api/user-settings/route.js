import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
// Service-role client: this is a server route and RLS is enabled on the app
// tables, so the anon client would read nothing. Auth is enforced by auth() below.
import { supabaseAdmin as supabase } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Fetch user settings
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// POST - Create or update user settings
export async function POST(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { manual_rota_time, total_rotas_generated } = body

    // Try to update first
    const { data: existingData } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingData) {
      // Update existing
      const updateData = {}
      if (manual_rota_time !== undefined) updateData.manual_rota_time = manual_rota_time
      if (total_rotas_generated !== undefined) updateData.total_rotas_generated = total_rotas_generated
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('user_settings')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('user_settings')
        .insert([{
          user_id: userId,
          manual_rota_time: manual_rota_time || null,
          total_rotas_generated: total_rotas_generated || 0
        }])
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error saving user settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}