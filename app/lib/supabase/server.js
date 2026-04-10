import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

/**
 * Creates a Supabase client authenticated with the current Clerk user's JWT.
 * Use this in API routes and server components so RLS policies resolve correctly.
 *
 * Falls back to the service-role client when no Clerk session exists
 * (e.g. webhook handlers that run outside a user session).
 */
export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const { getToken } = await auth()
  const token = await getToken({ template: 'supabase' })

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * Service-role client for admin operations (webhooks, background jobs).
 * Bypasses RLS — use sparingly.
 */
export function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}
