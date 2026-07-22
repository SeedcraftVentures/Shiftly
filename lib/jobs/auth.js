// Passwordless auth for the job board, shared by two flows that are really one
// primitive: prove you own an email, get access scoped to that email.
//
//   purpose 'publish' : a link that flips a pending listing live
//   purpose 'session' : a link that opens the manage dashboard for an employer
//
// Deliberately NOT Clerk. The board ships before the app and must not depend on
// app auth, which is exactly why native posting was decoupled from it. This lives
// entirely under lib/jobs and touches nothing in app/(auth).
//
// Tokens are stateless and HMAC signed, so there is no tokens table to sweep.
// Node's crypto is used directly, no new dependency.

import { createHmac, timingSafeEqual, randomBytes } from 'crypto'

const b64 = (buf) => Buffer.from(buf).toString('base64url')
const unb64 = (s) => Buffer.from(s, 'base64url')

function secret() {
  const s = process.env.JOBS_AUTH_SECRET
  // Fail loud rather than sign with a default: a predictable secret would let
  // anyone mint a valid token and publish or manage another venue's listings.
  if (!s || s.length < 16) throw new Error('JOBS_AUTH_SECRET is not set')
  return s
}

const sign = (data) => b64(createHmac('sha256', secret()).update(data).digest())

/**
 * A signed, expiring token. payload is a small object, for example
 * { p: 'publish', l: listingId, e: email } or { p: 'session', id: employerId }.
 * Callers keep payload keys short because the whole thing rides in a URL.
 */
export function signToken(payload, ttlSeconds) {
  const body = b64(JSON.stringify({ ...payload, x: nowSeconds() + ttlSeconds, n: b64(randomBytes(6)) }))
  return `${body}.${sign(body)}`
}

/**
 * Returns the payload if the token is authentic and unexpired, else null.
 * Never throws on a bad token, so callers can treat null as "denied".
 */
export function verifyToken(token) {
  try {
    const [body, mac] = String(token || '').split('.')
    if (!body || !mac) return null
    const expected = sign(body)
    // Constant time compare. A length mismatch is an instant reject, and
    // timingSafeEqual requires equal length buffers.
    const a = unb64(mac)
    const b = unb64(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload = JSON.parse(unb64(body).toString('utf8'))
    if (typeof payload.x !== 'number' || payload.x < nowSeconds()) return null
    return payload
  } catch {
    return null
  }
}

// Wrapped so tests can reason about it and so the whole module has one clock.
function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

export const MAGIC_LINK_TTL = 30 * 60        // 30 minutes to click the email
export const SESSION_TTL = 14 * 24 * 60 * 60  // 14 days signed in to manage
export const SESSION_COOKIE = 'jobs_employer'

// A publish link proves the poster owns the email before the ad goes live. This
// is the spam control that replaced the account gate.
export const publishToken = (listingId, email) =>
  signToken({ p: 'publish', l: listingId, e: email.toLowerCase() }, MAGIC_LINK_TTL)

// A session token, set as an httpOnly cookie after a magic link is clicked.
export const sessionToken = (employerId) => signToken({ p: 'session', id: employerId }, SESSION_TTL)

/** employer_id for a valid session cookie, else null. */
export function employerFromSession(token) {
  const payload = verifyToken(token)
  return payload && payload.p === 'session' ? payload.id : null
}
