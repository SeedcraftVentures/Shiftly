import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabaseAnon'
import { DB_TABLES } from '@/app/lib/constants'

// GET - Fetch a specific rota
export async function GET(request, context) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { data, error } = await supabase
      .from(DB_TABLES.rotas)
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return NextResponse.json({
      ...data,
      name: data.rota_name,
      rota_data: data.schedule_data
    })
  } catch (error) {
    console.error('Error fetching rota:', error)
    return NextResponse.json({ error: 'Failed to fetch rota' }, { status: 500 })
  }
}

// PATCH - Update a specific rota (including approve)
export async function PATCH(request, context) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const body = await request.json()
    
    // Build update object from provided fields
    const updateData = {}
    if (body.name !== undefined) updateData.rota_name = body.name
    if (body.rota_data !== undefined) updateData.schedule_data = body.rota_data
    if (body.approved !== undefined) updateData.approved = body.approved
    if (body.start_date !== undefined) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.end_date = body.end_date
    if (body.week_count !== undefined) updateData.week_count = body.week_count
    if (body.team_id !== undefined) updateData.team_id = body.team_id

    const { data, error } = await supabase
      .from(DB_TABLES.rotas)
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      id: data.id,
      name: data.rota_name,
      rota_data: data.schedule_data,
      approved: data.approved,
      start_date: data.start_date,
      end_date: data.end_date,
      week_count: data.week_count
    })
  } catch (error) {
    console.error('Error updating rota:', error)
    return NextResponse.json({ error: 'Failed to update rota' }, { status: 500 })
  }
}

// DELETE - Delete a specific rota
export async function DELETE(request, context) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { error } = await supabase
      .from(DB_TABLES.rotas)
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rota:', error)
    return NextResponse.json({ error: 'Failed to delete rota' }, { status: 500 })
  }
}