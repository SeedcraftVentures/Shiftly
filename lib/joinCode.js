import crypto from 'crypto'
import { supabaseAdmin, organizationIdFor } from '@/lib/db'

// Business join codes. One code per Organization; staff enter it in the Team app
// to join their business, then claim their own pre-created Staff row. This is the
// code-based replacement for the earlier email-matching claim.

// Unambiguous alphabet: no 0/O/1/I/L, so a code read off a screen or said aloud
// isn't misheard. 6 chars over 32 symbols is ~1e9 space, plenty for uniqueness at
// this scale while staying easy to type.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function genCode(len = 6) {
  const bytes = crypto.randomBytes(len)
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length]
  return s
}
export const normaliseCode = (c) => String(c || '').trim().toUpperCase()

const ORG_COLS = 'organization_id, organization_name, join_code'

// Manager's business. Returns the Organizations row or null if they have none.
async function orgFor(userId) {
  const orgId = organizationIdFor(userId)
  const { data } = await supabaseAdmin.from('Organizations').select(ORG_COLS).eq('organization_id', orgId).maybeSingle()
  return data || null
}

async function assignFreshCode(orgId) {
  // Retry on the rare collision; the partial unique index is the real guard.
  for (let i = 0; i < 6; i++) {
    const code = genCode()
    const { data: clash } = await supabaseAdmin.from('Organizations').select('organization_id').eq('join_code', code).maybeSingle()
    if (clash) continue
    const { data, error } = await supabaseAdmin.from('Organizations').update({ join_code: code }).eq('organization_id', orgId).select(ORG_COLS).maybeSingle()
    if (!error && data) return data
  }
  return null
}

// Get the manager's code, generating one on first use.
export async function getOrCreateJoinCode(userId) {
  const org = await orgFor(userId)
  if (!org) return null
  if (org.join_code) return org
  return assignFreshCode(org.organization_id)
}

// Rotate the code (old code stops working).
export async function regenerateJoinCode(userId) {
  const org = await orgFor(userId)
  if (!org) return null
  return assignFreshCode(org.organization_id)
}

// Code -> the business it belongs to (for the staff side).
export async function resolveJoinCode(code) {
  const c = normaliseCode(code)
  if (!c) return null
  const { data } = await supabaseAdmin.from('Organizations').select('organization_id, organization_name').eq('join_code', c).maybeSingle()
  return data || null
}

// Staff rows in a business that nobody has claimed yet, for the "which one are
// you?" pick list. Walks Organization -> Locations -> Teams -> Staff.
export async function unclaimedStaffForOrg(organizationId) {
  const { data: locs } = await supabaseAdmin.from('Locations').select('location_id').eq('organization_id', organizationId)
  const locationIds = (locs || []).map((l) => l.location_id)
  if (!locationIds.length) return []

  const { data: teams } = await supabaseAdmin.from('Teams').select('team_id, name').in('location_id', locationIds)
  const teamName = Object.fromEntries((teams || []).map((t) => [t.team_id, t.name]))
  const teamIds = (teams || []).map((t) => t.team_id)
  if (!teamIds.length) return []

  const { data: staff } = await supabaseAdmin.from('Staff').select('staff_id, name, role, team_id').in('team_id', teamIds).is('user_id', null).order('name')
  return (staff || []).map((s) => ({ staff_id: s.staff_id, name: s.name, role: s.role || '', team_name: teamName[s.team_id] || null }))
}

// Link a staff member's Clerk account to a chosen Staff row. Guarded twice:
// the row must be unclaimed within the code's business, and the update re-checks
// user_id IS NULL so two people claiming at once can't both win.
export async function claimStaff(userId, code, staffId) {
  const org = await resolveJoinCode(code)
  if (!org) return { error: 'That code was not recognised', status: 404 }
  if (!staffId) return { error: 'staff_id is required', status: 400 }

  const unclaimed = await unclaimedStaffForOrg(org.organization_id)
  if (!unclaimed.some((s) => s.staff_id === staffId)) {
    return { error: 'That name is not available to claim', status: 409 }
  }

  const { data: linked, error } = await supabaseAdmin
    .from('Staff').update({ user_id: userId, invite_status: 'Accepted' })
    .eq('staff_id', staffId).is('user_id', null).select('*').maybeSingle()
  if (error || !linked) return { error: 'Someone already claimed that one', status: 409 }

  return { staff: linked }
}
