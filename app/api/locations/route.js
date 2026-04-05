import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { NextResponse } from 'next/server'
import { supabaseService } from '@/app/lib/supabaseService'
import { DB_TABLES } from '@/app/lib/constants'

// GET - Fetch all locations for the logged-in user's organization
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // const { data, error } = await supabase
    //   .from(DB_TABLES.teams)
    //   .select('*')
    //   .eq('user_id', userId)
    //   .order('is_default', { ascending: false }) // Default team first
    //   .order('created_at', { ascending: true })

    // if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}