import { clerkClient } from '@clerk/nextjs/server'

/**
 * Per-org last-location persistence using Clerk user publicMetadata.
 * Shape on user: { lastLocationByOrg: { [clerkOrgId]: locationUuid } }
 *
 * Multi-org users: each org has its own "last location I was at."
 */

/**
 * Reads the stored last-location id for a user in a given org.
 */
export async function getLastLocationId(userId, orgId) {
  if (!userId || !orgId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const map = user.publicMetadata?.lastLocationByOrg ?? {}
  return map[orgId] ?? null
}

/**
 * Persists the last-location id for a user in a given org.
 * Merges into existing metadata so other keys aren't overwritten.
 */
export async function setLastLocationId(userId, orgId, locationId) {
  if (!userId || !orgId) return
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const existing = user.publicMetadata ?? {}
  const existingMap = existing.lastLocationByOrg ?? {}

  await client.users.updateUser(userId, {
    publicMetadata: {
      ...existing,
      lastLocationByOrg: {
        ...existingMap,
        [orgId]: locationId,
      },
    },
  })
}

/**
 * Clears a user's last-location for a given org (e.g. if that location was deleted).
 */
export async function clearLastLocationId(userId, orgId) {
  if (!userId || !orgId) return
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const existing = user.publicMetadata ?? {}
  const existingMap = { ...(existing.lastLocationByOrg ?? {}) }
  delete existingMap[orgId]

  await client.users.updateUser(userId, {
    publicMetadata: {
      ...existing,
      lastLocationByOrg: existingMap,
    },
  })
}