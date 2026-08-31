import { supabaseAdmin, organizationIdFor } from '@/lib/db'

// ── Entitlement: the single derivation of "can this manager use the app" ──────
// Model: a no-card 7-day trial. When a manager first onboards (an Organization
// exists) they get a `Subscriptions` row with status 'trialing' and a trial_end
// 7 days out — NO Stripe, no card. Access is granted while the trial window is
// open OR they hold a paid ('active') subscription. Nothing external flips an
// in-app trial to expired, so expiry is computed here from trial_end vs now
// (the piece the old inline logic was missing — it trusted Stripe to flip it).
//
// Employees never have an Organization, so they are never seeded a trial and
// simply fall through to no-access here (their own app doesn't read this).

const TRIAL_DAYS = 7
const DAY_MS = 86400000

// Stripe price ids that map to the AI-supported (£59) tier. Everyone on a trial
// gets AI regardless of price, so the trial sells the upgrade.
const AI_PRICE_IDS = (process.env.STRIPE_AI_PRICE_IDS || '')
  .split(',').map((s) => s.trim()).filter(Boolean)

const NO_ACCESS = {
  status: 'inactive', hasAccess: false, isTrialing: false, isAiTier: false,
  trialExpired: false, plan: null, trialEndsAt: null, daysLeft: 0,
}

// Insert a no-card trial row if the manager doesn't have one. Insert-if-absent:
// user_id is the table key, so a duplicate insert (race, or an existing paid
// row) fails and we read the existing row back — a trial NEVER clobbers or
// resets a real subscription, and re-onboarding never restarts the clock.
export async function ensureTrial(userId) {
  if (!userId || !supabaseAdmin) return null
  const trialEnd = new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString()
  const { data, error } = await supabaseAdmin
    .from('Subscriptions')
    .insert({ user_id: userId, status: 'trialing', trial_end: trialEnd })
    .select('*')
    .single()
  if (!error && data) return data
  const { data: existing } = await supabaseAdmin
    .from('Subscriptions').select('*').eq('user_id', userId).maybeSingle()
  return existing || null
}

function derive(sub) {
  const now = Date.now()
  const trialEndMs = sub.trial_end ? new Date(sub.trial_end).getTime() : null
  // Fail OPEN on a trialing row with no trial_end (shouldn't happen — our seed
  // and Stripe both set it): a locked-out legit user is worse than a long trial.
  const inTrialWindow = sub.status === 'trialing' && (trialEndMs == null || trialEndMs > now)
  const trialExpired = sub.status === 'trialing' && trialEndMs != null && trialEndMs <= now
  const isActive = sub.status === 'active'
  const hasAccess = isActive || inTrialWindow
  const isTrialing = inTrialWindow
  const isAiTier = hasAccess && (isTrialing || AI_PRICE_IDS.includes(sub.plan))
  const daysLeft = inTrialWindow && trialEndMs != null
    ? Math.max(0, Math.ceil((trialEndMs - now) / DAY_MS)) : 0
  return {
    ...sub, hasAccess, isTrialing, isAiTier, trialExpired,
    plan: sub.plan ?? null, trialEndsAt: sub.trial_end ?? null, daysLeft,
  }
}

// Canonical entitlement for a Clerk user id. Lazily seeds the trial for a
// manager (has an Organization) with no billing row yet — this backfills
// existing accounts and covers any path that skipped the onboarding seed.
export async function getEntitlement(userId) {
  if (!userId || !supabaseAdmin) return { ...NO_ACCESS }

  let { data: sub } = await supabaseAdmin
    .from('Subscriptions').select('*').eq('user_id', userId).maybeSingle()

  if (!sub) {
    const orgId = organizationIdFor(userId)
    const { data: org } = await supabaseAdmin
      .from('Organizations').select('organization_id').eq('organization_id', orgId).maybeSingle()
    if (!org) {
      // No org yet. An employee (linked to a Staff row) never gets a trial. A
      // brand-new manager gets the clock started now, so the trial countdown shows
      // straight after sign-up, before onboarding creates the org.
      const { data: staff } = await supabaseAdmin
        .from('Staff').select('staff_id').eq('user_id', userId).limit(1).maybeSingle()
      if (staff) return { ...NO_ACCESS }
    }
    sub = await ensureTrial(userId)
    if (!sub) return { ...NO_ACCESS }
  }

  return derive(sub)
}

// Server-side write gate. Returns the entitlement when access is denied (so the
// route can 402 with the reason), or null when the caller may proceed.
export async function requireActive(userId) {
  const ent = await getEntitlement(userId)
  return ent.hasAccess ? null : ent
}
