import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

/**
 * Creates a Supabase client authenticated with the current Clerk session token.
 * Uses the native Clerk ↔ Supabase integration — no JWT template needed.
 * Use this in API routes and server components so RLS policies resolve correctly.
 */
export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const { getToken } = await auth()

  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: () => getToken(),
  })
}

/**
 * Service-role client for admin operations (webhooks, background jobs).
 * Bypasses RLS — use sparingly.
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}
