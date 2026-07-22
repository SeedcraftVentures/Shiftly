// Email sender for the job board's magic links. Wraps Resend the same way the
// staff invite route does: a lazy client, so `next build` does not construct it
// (and throw) while RESEND_API_KEY is absent during page-data collection.
//
// When the key is missing (local dev, and currently production until it is set)
// the send is a no-op that returns { delivered: false, link }. The API routes
// surface that link directly in dev so the whole flow is testable without a
// mail provider. NEVER return the link in production: see jobs/post/complete.

import { Resend } from 'resend'

const FROM = 'Shiftly Jobs <noreply@shiftly.so>'

// RESEND is accepted as an alias for RESEND_API_KEY. The existing staff-invite
// route reads RESEND_API_KEY, so standardising on that name eventually is worth
// doing, but honouring both here means the board works whichever is set.
const resendKey = () => process.env.RESEND_API_KEY || process.env.RESEND || ''
const keyPresent = () => Boolean(resendKey() && resendKey() !== 're_placeholder')
const getResend = () => new Resend(resendKey() || 're_placeholder')

function shell(bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05);padding:36px;">
      ${bodyHtml}
      <p style="color:#9ca3af;font-size:12px;margin-top:28px;">If you did not request this, ignore this email and nothing happens.</p>
    </div>
  </body></html>`
}

const button = (href, text) =>
  `<a href="${href}" style="display:inline-block;background:#FF1F7D;color:#fff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:9999px;">${text}</a>`

/**
 * Send a magic link. Returns { delivered, link }.
 * delivered is false when no mail key is configured, and the caller decides
 * whether to expose link (dev only).
 */
export async function sendMagicLink({ to, subject, heading, body, href, cta }) {
  const html = shell(`
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">${heading}</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">${body}</p>
    ${button(href, cta)}
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Or paste this link into your browser:<br><span style="color:#6b7280;word-break:break-all;">${href}</span></p>
  `)

  if (!keyPresent()) {
    console.warn(`[jobs/email] RESEND_API_KEY not set, not sending. Link for ${to}: ${href}`)
    return { delivered: false, link: href }
  }

  try {
    // The Resend SDK RETURNS { data, error } and does not throw on an API error
    // (a 403 for an unverified domain, a bad key). Checking error is the only way
    // to know a send actually failed, otherwise this would report delivered:true
    // while nothing was sent.
    const { data, error } = await getResend().emails.send({ from: FROM, to, subject, html })
    if (error) {
      console.error('[jobs/email] send rejected', error)
      return { delivered: false, link: href, error: true }
    }
    return { delivered: true, link: href, id: data?.id }
  } catch (e) {
    console.error('[jobs/email] send threw', e)
    return { delivered: false, link: href, error: true }
  }
}

export const isDev = () => process.env.NODE_ENV !== 'production'
export const mailConfigured = keyPresent
