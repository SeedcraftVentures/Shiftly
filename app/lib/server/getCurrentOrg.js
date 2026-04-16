import { auth } from '@clerk/nextjs/server'

/**
 * Returns the authed user's id, active Clerk org id, and a permission checker.
 * Use in API routes and server components.
 *
 * - If unauthenticated → { userId: null, orgId: null, has: () => false }
 * - If authed but no active org → { userId, orgId: null, has: () => false }
 *
 * Callers are responsible for handling the null cases with appropriate responses.
 */
export async function getCurrentOrg() {
  const { userId, orgId, has } = await auth()
  return {
    userId: userId ?? null,
    orgId: orgId ?? null,
    has: has ?? (() => false),
  }
}