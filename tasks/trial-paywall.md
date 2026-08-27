# No-card 7-day trial + post-trial paywall

**Goal:** Sign up → straight into the app, 7 days full access (AI-on), **no card**. After 7
days unpaid → the **manager** is paywalled (data preserved, "subscribe to keep your
rotas"). Staff keep read-only access to already-published rotas. This makes the marketing
"7-day free trial, no card required" CTA truthful.

Status: CODE COMPLETE (companion-v1, undeployed). `Subscriptions` table created in prod
(mobdakvnkkgzndozrpnw) + entitlement logic verified against live Postgres. Remaining:
deploy + live QA.

### DB dependency discovered + fixed (2026-08-27)
There was **no `Subscriptions` table in any Supabase project** — the billing code (Stripe
webhook + `/api/subscription`) had always written to a non-existent table and silently
degraded to "inactive". This was a latent launch blocker: paid checkouts would have recorded
nothing. Created the table in prod (`user_id` PK, RLS on / no policies — service-role only):
columns match the webhook exactly. Verified: table shape, PK, and a SQL replica of `derive()`
confirms active/trial-live/trial-expired/cancelled all resolve correctly.

---

## The model (decided)

- **Trial starts** when the manager first onboards (org/location created in
  `/api/onboarding`). No card, no Stripe involved.
- **During trial:** full access, **AI-on** (`isTrialing` already drives `isAiTier`).
- **Expiry** is computed from `Subscriptions.trial_end` vs now (today nothing checks this —
  it trusts Stripe to flip status; an in-app trial has no Stripe to flip it).
- **Post-trial unpaid → manager hard-paywalled:** dashboard shows a lock screen +
  plan picker. Data is preserved server-side; paying restores access. That's the
  "don't lose your month of rotas" pressure.
- **Staff app: unchanged.** No `app/api/employee/*` route checks manager billing, so staff
  keep seeing the last published rota (read-only). We deliberately do NOT punish staff —
  the pressure lands on the manager who can't build/publish next week.
- **Subscribe = Stripe checkout WITHOUT `trial_period_days`** (the free week already happened
  in-app; otherwise they double-dip a second free week). Charged on subscribe.

### Entitlement states (single derivation point: `getEntitlement(userId)`)
| Subscriptions row | Result |
|---|---|
| none, but user has an Organization | seed `trialing`, `trial_end = now + 7d` → in trial |
| `status = active` | paid, full access |
| `status = trialing`, `trial_end > now` | in trial (AI-on) |
| `status = trialing`, `trial_end <= now` | **trialExpired** → no access → paywall |
| `past_due` / `cancelled` | no access |

Response flags: `hasAccess, isTrialing, isAiTier, trialExpired, status, plan, trialEndsAt, daysLeft`.

### Defaults I'm building to (override if you disagree — see [Andre] Q1)
- Trial length: **7 days**, **hard cut** (no grace period).
- Subscribing mid-trial **charges immediately** (they forfeit remaining free days). Simple;
  almost everyone converts at the paywall anyway. (Can align Stripe `trial_end` later if we
  care.)
- On deploy, existing test accounts (org, no sub) get a **fresh 7-day trial** — fine, no real
  customers yet.

---

## [CLAUDE] — code lane (I do these)

- [x] **0. `Subscriptions` table** created in prod + verified (see above).
- [x] **1. `lib/entitlement.js`** — `getEntitlement(userId)`: read `Subscriptions`; if no row
      but the user has an `Organization`, lazily seed a `trialing` row (`trial_end = now+7d`,
      insert-if-absent so a paid row is never clobbered); compute `hasAccess / isTrialing /
      isAiTier / trialExpired / trialEndsAt / daysLeft`. Single source of truth.
- [ ] **2. `/api/subscription`** — replace inline logic with `getEntitlement`; add
      `trialExpired / trialEndsAt / daysLeft` to the response.
- [ ] **3. `/api/onboarding`** — on org/location create (fresh **and** the `reonboarded`
      path when no sub exists), seed the `trialing` row via the same helper. Trial starts here.
- [ ] **4. Sign-up redirect** — `app/(auth)/sign-up/page.jsx:88` `/checkout` → `/dashboard`
      (start using it immediately; checkout becomes the "subscribe" action, not a gate).
- [ ] **5. `/api/stripe/checkout`** — remove `subscription_data.trial_period_days: 7` and the
      now-moot 100%-off trial-delete branch. Subscribe = pay now.
- [ ] **6. `app/hooks/useEntitlement.js`** — expose `trialExpired, daysLeft, trialEndsAt`.
- [ ] **7. `<TrialGate>`** (new) mounted in `app/(auth)/dashboard/layout.js`:
      - `trialExpired` → **full paywall lock**: "Your free trial's ended. Your rotas and staff
        are saved — subscribe to carry on." + the two plan cards (reuse checkout tiers) +
        log-out. Blocks the dashboard.
      - `isTrialing` → slim **countdown banner**: "N days left in your free trial · Subscribe".
      - `loading` → don't flash the wall (fail open until known).
- [ ] **8. Server write-gate** — `requireActive(userId)` guard (402 when `!hasAccess`) on the
      core mutating endpoints so the API can't be hit around the wall. Priority: **publish
      rota** + **build/generate rota** (also protects paid solver/AI spend); then template
      sync, shift save, staff invite.
- [ ] **9. Staff app** — no change (document only). Confirm no `employee` route regresses.
- [ ] **10. Verify** — babel-parse every edited JS/JSX; seed check (fresh onboarding writes a
      `trialing` row +7d); expiry check (SQL-backdate `trial_end` → paywall shows, dashboard
      blocked, staff endpoints still serve published rota); subscribe check (removing the
      trial still produces an `active` sub via webhook).
- [ ] **11. (follow-up, not blocking)** "Build a month of rotas in week one" companion nudge —
      amplifies the loss-aversion hook. Backlog.

## [ANDRE] — your lane (async)

- [ ] **Q1. Confirm the 3 defaults above** (7-day hard cut / charge-on-subscribe / existing
      accounts get a fresh trial). One line back is enough; I've built to these unless you say
      otherwise.
- [ ] **Stripe** — no config change needed for this (trial removal is code). Just sanity-check
      a **live** checkout once I ship: card charged immediately, sub goes `active`, founding
      coupon still applies on AI-annual.
- [ ] **Mobile (your lane)** — **no v1 change** for the trial gate (staff stay read-only by
      design). Backlog: a "your manager's plan has lapsed" info banner in the staff app for
      extra social pressure. Existing mobile tasks still stand (wire `DeleteAccount`, `eas.json`,
      `EXPO_PUBLIC_API_URL=prod`, store listings).
- [ ] **QA the paywall** on a throwaway account after I ship (or I'll backdate `trial_end` via
      SQL and screenshot it for you).
- [ ] **Marketing (separate workstream)** — once the gate's in, the CTA is truthful: "Start
      free — no card required. 7 days, full AI." I'll draft the landing/features/pricing copy;
      you approve. Tracked separately from this doc.

---

## Files touched (Claude lane)
- New: `lib/entitlement.js`, `app/components/TrialGate.jsx`
- Edit: `app/api/subscription/route.js`, `app/api/onboarding/route.js`,
  `app/api/stripe/checkout/route.js`, `app/(auth)/sign-up/page.jsx`,
  `app/hooks/useEntitlement.js`, `app/(auth)/dashboard/layout.js`, + write-gate on
  publish/generate (+ template-sync/shift-save/staff-invite) routes.
- No change: `app/api/employee/*`, `middleware.js` (client-side gate as its comment intends).
