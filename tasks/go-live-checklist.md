# Shiftly — launch checklist

## SOFT LAUNCH v1 — companion + billing + leave (CURRENT)

Since the prior release (redesign/Inbox/jobs, documented further down), we added: the
in-app setup companion (retired `/onboarding`), the AI companion + agent (£59 tier),
two-tier pricing + the Founding Member offer, shift breaks, and holiday/sick
allowances. That's the current soft-launch scope. Manager mobile is deferred to
post-launch; staff mobile is the mobile session's lane.

### Blocker status
- Desktop is feature-complete for a founding-member soft launch.
- The solver "honour contracted hours" change is NOT a launch blocker: the rota-builder
  walkthrough guides the manager to add shifts by hand (baseline flex). Launch now;
  deploy the solver upgrade after it's validated (see the last section).

### Only you can do these (gating)
1. **Clerk dev -> prod:** create a production instance; put the LIVE
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` in Vercel; set
   `NEXT_PUBLIC_APP_URL` to the real domain; set sign-in/up redirect URLs. If Clerk uses
   a **custom domain, allow for DNS propagation** — the one item that can push a same-day
   launch to tomorrow.
2. **Stripe dev -> prod:**
   - Live `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (from the live webhook).
   - Create **live-mode GBP prices**: Manual £49/mo + £449/yr, AI £59/mo + £549/yr. Set
     `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY`/`_ANNUAL`, `NEXT_PUBLIC_STRIPE_PRICE_AI_MONTHLY`/`_ANNUAL`,
     and `STRIPE_AI_PRICE_IDS` (the two AI ids, comma-separated) — the last is what grants
     the agent post-trial.
   - **Founding Member:** create a promotion code that discounts the AI annual to £299;
     set `NEXT_PUBLIC_STRIPE_FOUNDING_CODE` (the banner is gated on this).
   - **Webhook:** add the live endpoint -> `POST /api/stripe/webhook`; copy its signing secret.
   - **Trial:** 7 days is already in code (`trial_period_days: 7`). Confirm on a test checkout.
3. **Anthropic:** `ANTHROPIC_API_KEY` in Vercel prod (companion Q&A + agent). Without it the
   assistant soft-fails with a friendly message.
4. **Deploy:** everything is on `companion-v1` (local, ahead of origin, and it INCLUDES the
   mobile session's commits). Coordinate with the mobile session, merge `companion-v1 -> main`,
   push to `SeedcraftVentures/Shiftly`; Vercel builds from `main`. Then QA the deployed build.

### Discoverability / adoption (in-app)
- **FTUE:** the setup companion auto-opens for new managers (no separate onboarding) and
  walks name -> hours -> teams -> baseline -> review -> staff -> build. Verify it triggers
  on a brand-new account.
- **Post-setup nudges:** SetupCoach (build/review/publish walkthrough), SetupChecklist
  (pay/invite/publish), LeaveNudge (year-end holiday). Confirm they render from live data.
- **Help centre** (`/dashboard/help`) "Show the setup guide" re-opens the coach — verify.
- **Pricing page:** unlimited-staff lead + competitor comparison + Founding banner (shows
  once the founding code env is set).
- Manual-tier users who ask the assistant to *do* something get an upgrade nudge to the AI plan.

### QA (new flows, on the deployed build)
- New account -> companion onboarding -> build -> publish -> dashboard checklist.
- Billing: start a trial (test mode first) -> 7-day trial + AI-on during trial; after trial
  `isAiTier` resolves from the price; founding coupon applies on AI annual.
- Leave: Settings "Holidays & sick" saves; Reports "Holidays & sick" tab shows per-staff;
  LeaveNudge appears near a year boundary.
- AI: with the key set, Ask Shiftly answers; on the AI tier the agent stages a draft and
  publish needs a human click.

### Solver upgrade (post-validate, then deploy)
- Edit `python-scheduler/scheduler.py` (headcount `>= required` + bounded extra +
  overstaffing penalty). Run `test_contract.py` + `py_compile`. Push to the Render-tracked
  branch; confirm Render redeploys and the start command targets the right entrypoint.

---

# Earlier release QA (redesign / Inbox / jobs) — still valid

`main` was live at `69145c9` (redesign, dark mode, Inbox, employee app / Phase B, job
board). Vercel deploys from `main`. Keep this open while you QA.

---

## 1. Two things only YOU can confirm (in the Vercel dashboard)

1. **Is a Vercel project connected to `SeedcraftVentures/Shiftly`, deploying from `main`?**
   Check vercel.com → project → Deployments for a build triggered by the push to main.
   If nothing built, the project isn't linked and the push changed nothing user-visible.
2. **Are the Production env vars set?** Without them the build boots and every page 500s
   on the missing Supabase/Clerk clients. This is the #1 reason QA would be a waste.

## 2. Production env vars

**Required — the app will not run without these.** All values already exist in your
local `.env.local` except where noted; copy them into Vercel → Settings → Environment
Variables (Production):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL` — ⚠️ do NOT copy from `.env.local` (it's `http://localhost:3000`).
  Set the real production domain, e.g. `https://shiftly.so`, or Clerk redirects and
  staff invite links point at localhost.

**Job board — needed for it to populate (empty, not broken, without them):**
- `ADZUNA_APP_ID`, `ADZUNA_API_KEY`
- `JOBS_INGEST_SECRET` and `CRON_SECRET` — the ingest cron (`vercel.json`, every 2 days
  at 04:00) hits `POST /api/jobs/ingest`, which returns 401 until these are set. The board
  will look empty on first deploy until an ingest runs.
- Optional secondary source: `REED_API_KEY`.

**Safe to skip for QA:**
- Stripe (`STRIPE_*`) — billing is mocked.
- `RESEND_API_KEY` — invites won't email, but the Staff row still marks Pending so
  account-claiming by verified email still works.
- `PYTHON_SCHEDULER_URL` — code falls back to the hardcoded Render URL.

## 3. Database

Production must point at a Supabase project that has had these run:
- The BIGINT→UUID migration (`tasks/migration-inbox-uuid.sql`) — DONE on the dev/shared clone.
- RLS (instance A's security work) — DONE on the shared clone.
- The job-board tables (A's migrations: `schema-jobs.sql`, `schema-industry.sql`,
  `schema-rate-limits.sql`).

If Production uses the **same** Supabase project as dev, you're set. If it's a **separate**
prod project, none of those have run there and it will be broken until they do.

## 4. Known caveats going in (not blockers)

- **Nothing has been run as a combined app.** The whole release is parse-verified and
  merged clean, but the scheduling app + job board have never run in one process together.
  This QA is the first time.
- **`/jobs(.*)` appears twice** in `middleware.js`'s public list (one from each merge).
  Harmless duplicate; one-line cleanup next time middleware is touched.
- **Vercel plan / solver timeout.** `generate-rota` and `try-me/generate` set
  `maxDuration = 60`. Hobby allows 60s; confirm the plan supports it or a long solve 504s.
- **`NotificationBell` polls** every 60s (realtime is dead under RLS by design). New
  notifications can take up to a minute to appear. Not a bug.

## 5. QA path (roughly the order things depend on each other)

Manager side:
1. Sign in → dashboard renders, readiness/coverage cards populate.
2. Shifts, Staff, Rules pages load and save.
3. Rota Builder → generate a week → publish. (Watch for the 60s timeout.)
4. Inbox → log a request on behalf of staff → approve (see the coverage guardrail) → deny.
5. Payroll, Reports, Archive load.
6. Dark mode toggle (Settings) holds across pages.

The two-sided loop (the Phase B payoff, never run end to end):
7. Staff page → set a staff member's email → Invite (marks them Pending).
8. Incognito → sign up with THAT email → land on `/employee` seeing shifts, NOT
   "Account Not Linked". (Publish a rota first, or the shift list is legitimately empty.)
9. As that staff member: set availability, file a time-off request.
10. Back as manager: the request appears in the Inbox. Approve it, generate that week,
    confirm they're not rostered and the amber "needs cover" note shows.

Job board:
11. `/jobs` loads. `/jobs/hospitality` + `/jobs/retail` toggle. A `/jobs/[slug]` detail page.
12. `/jobs/post` funnel (Clerk-gated). Social-share preview uses the real domain (metadataBase).

## 6. Deferred / owed (post-QA)

- Marketing copy still says "no app store download" — reword once the native apps are real.
- App Store (iOS) developer account + listings; Play console is ready.
- Push notifications backend (v2).
