// Shared-store rate limiting, backed by the jobs_rate_limit Postgres function
// (tasks/schema-rate-limits.sql). Correct on serverless, where in-memory state
// is not shared between instances.
//
// Fails OPEN: if the limiter itself errors, the request is allowed. A limiter
// outage must not take down posting. Abuse during such a window is the lesser
// risk than blocking every legitimate user.

import { supabaseAdmin } from '@/lib/db'

/**
 * @param {string} bucket   stable key, e.g. `complete:ip:${ip}` or `login:email:${email}`
 * @param {object} opts     { limit, windowSeconds }
 * @returns {Promise<{ allowed: boolean, count?: number, limit?: number, resetAt?: string }>}
 */
export async function rateLimit(bucket, { limit, windowSeconds }) {
  if (!supabaseAdmin) return { allowed: true }
  try {
    const { data, error } = await supabaseAdmin.rpc('jobs_rate_limit', {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error('[ratelimit] rpc error', error.message)
      return { allowed: true } // fail open
    }
    return { allowed: Boolean(data?.allowed), count: data?.count, limit: data?.limit, resetAt: data?.reset_at }
  } catch (e) {
    console.error('[ratelimit] threw', e)
    return { allowed: true } // fail open
  }
}

/**
 * Best-effort client IP from the proxy headers Vercel sets. Falls back to a
 * constant so a missing header buckets everyone together rather than throwing,
 * which at worst makes the limit global instead of per-IP.
 */
export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// A 429 body with a Retry-After header, so a well-behaved client can back off.
export function tooMany(resetAt) {
  const retry = resetAt ? Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000)) : 60
  return { retry, headers: { 'Retry-After': String(retry) } }
}
