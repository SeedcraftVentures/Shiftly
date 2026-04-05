import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabaseAnon'
import { DB_TABLES } from '@/app/lib/constants'

// GET - Fetch all teams for the logged-in user
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from(DB_TABLES.teams)
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false }) // Default team first
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

// POST - Create a new team
export async function POST(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { team_name, description } = body

    if (!team_name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from(DB_TABLES.teams)
      .insert([
        {
          user_id: userId,
          team_name,
          description: description || null,
          is_default: false
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

// PUT - Update a team
export async function PUT(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, team_name, description } = body

    const { data, error } = await supabase
      .from(DB_TABLES.teams)
      .update({
        team_name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

// DELETE - Delete a team (and all associated data via CASCADE)
export async function DELETE(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // Check if it's the default team
    const { data: team } = await supabase
      .from(DB_TABLES.teams)
      .select('is_default')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (team?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default team' }, 
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from(DB_TABLES.teams)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}