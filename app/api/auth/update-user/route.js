import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { DB_TABLES } from '@/app/lib/constants'
import { supabaseService } from '@/app/lib/supabaseService'

export async function POST(request) {
  try {
    const { userId: sessionUserId } = await auth()

    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user_id, name, email } = await request.json()

    if (!user_id || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ensure a user can only create/update their own row.
    if (user_id !== sessionUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseService
      .from(DB_TABLES.users)
      .upsert(
        {
          user_id,
          name,
          email,
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error syncing user after signup:', error)
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
  }
}