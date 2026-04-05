import { DB_TABLES } from '@/app/lib/constants'
import { supabaseService as supabase } from '@/app/lib/supabaseService'

/**
 * Create notification(s) directly via Supabase (server-side only)
 * 
 * @param {Object|Object[]} notifications - Single or array of notification objects
 * Each notification: { recipient_user_id, team_id, type, title, message?, sender_staff_id?, related_id?, related_type? }
 */
export async function createNotification(notifications) {
  const items = Array.isArray(notifications) ? notifications : [notifications]
  
  if (items.length === 0) return { data: null, error: null }

  const { data, error } = await supabase
    .from(DB_TABLES.notifications)
    .insert(items)
    .select()

  if (error) {
    console.error('Failed to create notification:', error)
  }

  return { data, error }
}

/**
 * Notify all staff in a team (e.g., rota published, announcement)
 * Excludes the sender if sender_user_id is provided
 */
export async function notifyTeam({ team_id, type, title, message, sender_user_id, related_id, related_type }) {
  // Get all staff in the team who have a clerk_user_id (connected employees)
  const { data: staff, error: staffError } = await supabase
    .from(DB_TABLES.staff)
    .select('id, clerk_user_id')
    .eq('team_id', team_id)
    .not('clerk_user_id', 'is', null)

  if (staffError || !staff?.length) return { data: null, error: staffError }

  // Also get the manager (team owner)
  const { data: team } = await supabase
    .from(DB_TABLES.teams)
    .select('user_id')
    .eq('id', team_id)
    .single()

  // Build recipient list — all connected staff + manager, minus sender
  const recipients = new Set()
  
  staff.forEach(s => {
    if (s.clerk_user_id && s.clerk_user_id !== sender_user_id) {
      recipients.add(JSON.stringify({ user_id: s.clerk_user_id, staff_id: s.id }))
    }
  })

  // Add manager if they're not the sender
  if (team?.user_id && team.user_id !== sender_user_id) {
    recipients.add(JSON.stringify({ user_id: team.user_id, staff_id: null }))
  }

  const notifications = Array.from(recipients).map(r => {
    const { user_id, staff_id } = JSON.parse(r)
    return {
      recipient_user_id: user_id,
      recipient_staff_id: staff_id,
      team_id,
      sender_user_id: sender_user_id || null,
      type,
      title,
      message,
      related_id,
      related_type,
    }
  })

  return createNotification(notifications)
}

/**
 * Notify a single user
 */
export async function notifyUser({ recipient_user_id, recipient_staff_id, team_id, type, title, message, sender_staff_id, related_id, related_type }) {
  return createNotification({
    recipient_user_id,
    recipient_staff_id,
    team_id,
    type,
    title,
    message,
    sender_staff_id,
    related_id,
    related_type,
  })
}