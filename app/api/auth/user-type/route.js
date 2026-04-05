import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { NextResponse } from 'next/server'
import { STORAGE_VALUES, DB_TABLES } from '@/app/lib/constants'
import { supabaseService as supabase } from '@/app/lib/supabaseService'

// GET /api/auth/user-type
// Returns the user type: 'employee', 'manager', or 'unknown'
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ type: STORAGE_VALUES.userType.unknown }, { status: 401 })
    }

    // Check if user is a MANAGER first (owns teams)
    const { data: teams } = await supabase
      .from(DB_TABLES.teams)
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (teams && teams.length > 0) {
      return NextResponse.json({ type: STORAGE_VALUES.userType.manager })
    }

    // Then check if user is an employee (has clerk_user_id in Staff table)
    const { data: staffProfile, error: staffError } = await supabase
      .from(DB_TABLES.staff)
      .select('id, name, role')
      .eq('clerk_user_id', userId)
      .single()

    if (staffProfile && !staffError) {
      return NextResponse.json({
        type: STORAGE_VALUES.userType.employee,
        profile: {
          id: staffProfile.id,
          name: staffProfile.name,
          role: staffProfile.role
        }
      })
    }

    // New user - default to manager (will create a team)
    return NextResponse.json({ type: STORAGE_VALUES.userType.manager })

  } catch (error) {
    console.error('Error checking user type:', error)
    return NextResponse.json({ type: STORAGE_VALUES.userType.unknown, error: error.message }, { status: 500 })
  }
}