// Request a magic link to manage listings. Enter an email, and if it belongs to
// an employer we email a sign-in link. The response is identical whether or not
// the email is known, so this cannot be used to discover who has posted.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { signToken, MAGIC_LINK_TTL } from '@/lib/jobs/auth'
import { sendMagicLink, isDev } from '@/lib/jobs/email'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OK = { success: true, sent: true }

export async function POST(request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })
    const body = await request.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })

    const { data: employer } = await supabaseAdmin
      .from('Job Employers')
      .select('employer_id,email')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    // Unknown email: report the same success and send nothing. No enumeration.
    if (!employer) return NextResponse.json(OK)

    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://shiftly.so'
    const token = signToken({ p: 'session', id: employer.employer_id }, MAGIC_LINK_TTL)
    const href = `${base}/api/jobs/verify?token=${encodeURIComponent(token)}`
    const { delivered, link } = await sendMagicLink({
      to: email,
      subject: 'Sign in to manage your Shiftly Jobs listings',
      heading: 'Sign in to manage your jobs',
      body: 'Click below to manage the roles you have posted on Shiftly Jobs. The link is valid for 30 minutes.',
      href,
      cta: 'Manage my jobs',
    })

    return NextResponse.json({ ...OK, delivered, ...(isDev() && !delivered ? { devLink: link } : {}) })
  } catch (e) {
    console.error('[jobs/manage/login]', e)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
