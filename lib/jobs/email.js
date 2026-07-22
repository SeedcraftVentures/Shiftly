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

const keyPresent = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder')
const getResend = () => new Resend(process.env.RESEND_API_KEY || 're_placeholder')

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
    await getResend().emails.send({ from: FROM, to, subject, html })
    return { delivered: true, link: href }
  } catch (e) {
    console.error('[jobs/email] send failed', e)
    return { delivered: false, link: href, error: true }
  }
}

export const isDev = () => process.env.NODE_ENV !== 'production'
export const mailConfigured = keyPresent
