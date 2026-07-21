import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin, getOrgScope } from '@/lib/db'

// Invite a staff member to claim their account.
//
// This used to mint a token, store it on Staff.invite_token/invite_expires_at and
// email a magic link. Those columns do not exist in the live schema, so that flow
// could never have worked. It now works by verified email instead: the manager
// records the address, and when that person signs up, Clerk has already proven
// they own it, so /api/employee/profile links the Staff row on first load.
//
// That is stronger than a link (which can be forwarded) and, importantly for the
// mobile apps, needs no deep-link handling: sign up with your work email and you
// are in.
export const dynamic = 'force-dynamic'

// Lazy: constructing Resend at module load throws during `next build` when
// RESEND_API_KEY is absent.
const getResend = () => new Resend(process.env.RESEND_API_KEY || 're_placeholder')

// POST — mark a staff member invited and email them a sign-up prompt.
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body?.staff_id) return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    if (!teamIds.length) return NextResponse.json({ error: 'No teams in scope' }, { status: 403 })

    const { data: staffMember } = await supabaseAdmin
      .from('Staff').select('*').eq('staff_id', body.staff_id).maybeSingle()
    if (!staffMember || !teamIds.includes(staffMember.team_id)) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }
    if (staffMember.user_id) {
      return NextResponse.json({ error: 'Staff member already has an account' }, { status: 400 })
    }

    // The manager can supply or correct the address as part of inviting.
    const email = (body.invite_email || staffMember.invite_email || '').trim()
    if (!email) {
      return NextResponse.json({ error: 'Staff member has no email address. Add one first.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('Staff').update({ invite_email: email, invite_status: 'Pending' }).eq('staff_id', staffMember.staff_id)
    if (updateError) throw updateError

    const { data: team } = await supabaseAdmin
      .from('Teams').select('name').eq('team_id', staffMember.team_id).maybeSingle()
    const teamName = team?.name || 'your team'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const signUpUrl = `${baseUrl}/sign-up`

    let emailSent = false
    try {
      await getResend().emails.send({
        from: 'Shiftly <noreply@shiftly.so>',
        to: email,
        subject: `You're invited to join ${teamName} on Shiftly`,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f6f8;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05);">
    <div style="background:#FF1F7D;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold;">Shiftly</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1D1D1F;margin:0 0 16px;font-size:20px;">Hi ${staffMember.name},</h2>
      <p style="color:#3A3A3C;line-height:1.6;margin:0 0 24px;">
        You've been invited to join <strong>${teamName}</strong> on Shiftly. Once you're set up you'll be able to see your shifts, set your availability, request time off and swap shifts with the team.
      </p>
      <p style="color:#3A3A3C;line-height:1.6;margin:0 0 24px;">
        Sign up using this email address, <strong>${email}</strong>, and you'll be connected to your team automatically.
      </p>
      <a href="${signUpUrl}" style="display:block;background:#FF1F7D;color:#fff;text-decoration:none;padding:16px 24px;border-radius:12px;text-align:center;font-weight:600;font-size:16px;">Set up my account</a>
    </div>
    <div style="padding:24px 32px;background:#f6f6f8;text-align:center;">
      <p style="color:#86868B;font-size:12px;margin:0;">If you didn't expect this invite, you can safely ignore this email.</p>
    </div>
  </div>
</body></html>`,
      })
      emailSent = true
    } catch (emailError) {
      // Don't fail the invite: the row is marked Pending, so signing up still links them.
      console.error('Failed to send invite email:', emailError)
    }

    return NextResponse.json({
      success: true,
      staff_name: staffMember.name,
      invite_email: email,
      sign_up_url: signUpUrl,
      email_sent: emailSent,
    })
  } catch (error) {
    console.error('Error inviting staff member:', error)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}

// GET — invite status for a staff member, so the UI can show where they are.
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const staffId = new URL(request.url).searchParams.get('staff_id')
    if (!staffId) return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })

    const { teamIds } = await getOrgScope(userId)
    const { data: s } = await supabaseAdmin
      .from('Staff').select('staff_id, name, invite_email, invite_status, user_id, team_id').eq('staff_id', staffId).maybeSingle()
    if (!s || !teamIds.includes(s.team_id)) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })

    return NextResponse.json({
      staff_id: s.staff_id,
      name: s.name,
      invite_email: s.invite_email,
      invite_status: s.invite_status,
      linked: !!s.user_id,
    })
  } catch (error) {
    console.error('Error reading invite status:', error)
    return NextResponse.json({ error: 'Failed to read invite status' }, { status: 500 })
  }
}
