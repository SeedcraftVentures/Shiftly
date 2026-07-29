# Shiftly — go-live + QA checklist

`main` is live at `69145c9` (the full release: redesign, dark mode, Inbox, employee
app / Phase B, job board). Vercel deploys from `main`. Keep this open while you QA.

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
