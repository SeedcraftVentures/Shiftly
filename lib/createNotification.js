import { supabaseAdmin } from '@/lib/db'

// ── Notification helpers (server-side only) ─────────────────────────────────
// Writes to the "Notifications" table. In the current schema there are no FK
// constraints, so the manager (org owner) for a team is resolved manually via
// Teams -> Locations.organization_id (which holds the manager's Clerk user id).

/**
 * Insert one or many notification rows.
 * Each item: { recipient_user_id, recipient_staff_id?, team_id?, sender_user_id?,
 *              sender_staff_id?, type, title, message?, related_id?, related_type? }
 */
export async function createNotification(notifications) {
  const items = Array.isArray(notifications) ? notifications : [notifications]
  if (items.length === 0) return { data: null, error: null }

  const { data, error } = await supabaseAdmin.from('Notifications').insert(items).select()
  if (error) console.error('Failed to create notification:', error)
  return { data, error }
}

// The manager's Clerk id for a team = organization_id of the team's location.
async function managerForTeam(teamId) {
  const { data: team } = await supabaseAdmin.from('Teams').select('location_id').eq('team_id', teamId).single()
  if (!team?.location_id) return null
  const { data: loc } = await supabaseAdmin.from('Locations').select('organization_id').eq('location_id', team.location_id).single()
  return loc?.organization_id || null
}

export { managerForTeam }

/**
 * Notify everyone connected to a team: every staff row with a linked login
 * (user_id set) plus the team's manager, excluding the sender.
 */
export async function notifyTeam({ team_id, type, title, message, sender_user_id, related_id, related_type }) {
  const { data: staff, error: staffError } = await supabaseAdmin
    .from('Staff')
    .select('staff_id, user_id')
    .eq('team_id', team_id)
    .not('user_id', 'is', null)
  if (staffError) return { data: null, error: staffError }

  const managerUserId = await managerForTeam(team_id)

  // user_id -> recipient_staff_id (null for the manager, who has no staff row here)
  const recipients = new Map()
  ;(staff || []).forEach((s) => {
    if (s.user_id && s.user_id !== sender_user_id) recipients.set(s.user_id, s.staff_id)
  })
  if (managerUserId && managerUserId !== sender_user_id && !recipients.has(managerUserId)) {
    recipients.set(managerUserId, null)
  }
  if (recipients.size === 0) return { data: [], error: null }

  const notifications = Array.from(recipients.entries()).map(([user_id, staff_id]) => ({
    recipient_user_id: user_id,
    recipient_staff_id: staff_id,
    team_id,
    sender_user_id: sender_user_id || null,
    type,
    title,
    message: message ?? null,
    related_id: related_id ?? null,
    related_type: related_type ?? null,
  }))
  return createNotification(notifications)
}

/** Notify a single user. */
export async function notifyUser({
  recipient_user_id, recipient_staff_id, team_id, type, title, message,
  sender_staff_id, sender_user_id, related_id, related_type,
}) {
  return createNotification({
    recipient_user_id,
    recipient_staff_id: recipient_staff_id ?? null,
    team_id: team_id ?? null,
    sender_staff_id: sender_staff_id ?? null,
    sender_user_id: sender_user_id ?? null,
    type,
    title,
    message: message ?? null,
    related_id: related_id ?? null,
    related_type: related_type ?? null,
  })
}
