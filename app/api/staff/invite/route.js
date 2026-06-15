import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Lazy: constructing Resend at module load throws during `next build` (page-data
// collection) when RESEND_API_KEY is absent. Build it only when the route runs.
const getResend = () => new Resend(process.env.RESEND_API_KEY || 're_placeholder')

// POST - Generate invite link for a staff member
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { staff_id } = body

    if (!staff_id) {
      return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })
    }

    // Verify the staff member belongs to the user
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('*, team:team_id(user_id, team_name)')
      .eq('id', staff_id)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check if already has an account
    if (staffMember.clerk_user_id) {
      return NextResponse.json({ error: 'Staff member already has an account' }, { status: 400 })
    }

    // Check if staff member has an email
    if (!staffMember.email) {
      return NextResponse.json({ error: 'Staff member has no email address. Please add one first.' }, { status: 400 })
    }

    // Generate unique invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    
    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Update staff record with invite token
    const { data, error } = await supabase
      .from('Staff')
      .update({
        invite_token: inviteToken,
        invite_expires_at: expiresAt.toISOString()
      })
      .eq('id', staff_id)
      .select()
      .single()

    if (error) throw error

    // Build the invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`

    // Send invite email
    const teamName = staffMember.team?.team_name || 'your team'
    
    try {
      await getResend().emails.send({
        from: 'Shiftly <noreply@shiftly.so>',
        to: staffMember.email,
        subject: `You're invited to join ${teamName} on Shiftly`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px;">
              <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Shiftly</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 32px;">
                  <h2 style="color: #111827; margin: 0 0 16px; font-size: 20px;">Hi ${staffMember.name}! 👋</h2>
                  
                  <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                    You've been invited to join <strong>${teamName}</strong> on Shiftly. Once you're set up, you'll be able to:
                  </p>
                  
                  <ul style="color: #4b5563; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
                    <li>View your upcoming shifts</li>
                    <li>Request time off</li>
                    <li>Update your availability</li>
                  </ul>
                  
                  <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: white; text-decoration: none; padding: 16px 24px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px;">
                    Accept Invite
                  </a>
                  
                  <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0; text-align: center;">
                    This link expires in 7 days
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="padding: 24px 32px; background: #f9fafb; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    If you didn't expect this invite, you can safely ignore this email.
                  </p>
                </div>
                
              </div>
            </body>
          </html>
        `
      })
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError)
      // Don't fail the whole request if email fails - they can still use the link
    }

    return NextResponse.json({ 
      invite_url: inviteUrl,
      expires_at: expiresAt.toISOString(),
      staff_name: staffMember.name,
      email_sent: true
    })
  } catch (error) {
    console.error('Error generating invite:', error)
    return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 })
  }
}

// GET - Validate an invite token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find staff member with this token
    const { data: staffMember, error } = await supabase
      .from('Staff')
      .select('id, name, role, team_id, invite_expires_at, clerk_user_id')
      .eq('invite_token', token)
      .single()

    if (error || !staffMember) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    // Check if already claimed
    if (staffMember.clerk_user_id) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
    }

    // Check if expired
    if (new Date(staffMember.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      staff_id: staffMember.id,
      staff_name: staffMember.name,
      role: staffMember.role
    })
  } catch (error) {
    console.error('Error validating invite:', error)
    return NextResponse.json({ error: 'Failed to validate invite' }, { status: 500 })
  }
}

// PUT - Accept invite (link Clerk user to staff record)
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in to accept this invite' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find staff member with this token
    const { data: staffMember, error: findError } = await supabase
      .from('Staff')
      .select('id, name, invite_expires_at, clerk_user_id')
      .eq('invite_token', token)
      .single()

    if (findError || !staffMember) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    // Check if already claimed
    if (staffMember.clerk_user_id) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
    }

    // Check if expired
    if (new Date(staffMember.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    // Check if this Clerk user is already linked to another staff record
    const { data: existingLink } = await supabase
      .from('Staff')
      .select('id, name')
      .eq('clerk_user_id', userId)
      .single()

    if (existingLink) {
      return NextResponse.json({ 
        error: `This account is already linked to ${existingLink.name}` 
      }, { status: 400 })
    }

    // Link the Clerk user to the staff record
    const { data, error } = await supabase
      .from('Staff')
      .update({
        clerk_user_id: userId,
        invite_token: null, // Clear the token
        invite_expires_at: null
      })
      .eq('id', staffMember.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      message: `Welcome, ${staffMember.name}! Your account is now set up.`,
      staff_id: staffMember.id
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}