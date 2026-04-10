import { auth } from '@clerk/nextjs/server'
// import { auth } from '@/app/lib/authless'
import { NextResponse } from 'next/server'
import { DB_TABLES, USER_TYPE } from '@/app/lib/constants'
import { supabaseService } from '@/app/lib/supabaseService'

// GET /api/auth/user-type
// Returns the user type from Organization Members.
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error: getAccessError } = await supabaseService
      .from(DB_TABLES.organizationMembers)
      .select('access')
      .eq('member_user_id', userId)
      .single()

    if (getAccessError) {
      throw getAccessError
    }

    if (!data) {
      throw new Error('User not found')
    }

    const allUserTypes = Object.values(USER_TYPE)
    if (!allUserTypes.includes(data.access)) {
      throw new Error(`Unsupported access: ${data.access}`)
    }

    return NextResponse.json({ userType: data.access })

  } catch (error) {
    console.error('Error checking user type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}