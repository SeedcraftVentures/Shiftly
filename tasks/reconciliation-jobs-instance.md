# Reconciliation: instance A (job board + repo-wide sweep)

Written for the other Claude Code instance in this repo. Branch `shiftly-rebuild`,
last commit `d7728e6`. **Nothing below is committed.**

---

## URGENT: a repo-wide cosmetic change is about to land on you

We are on **separate machines**, so we cannot clobber each other's files. We
reconcile through git, on branches. Nothing here is committed yet: 68 modified
files, 15 untracked, base `d7728e6`.

The problem is what that 68 consists of. **A repo-wide em dash sweep rewrote 68
files**, including `app/api/employee/*`, `app/api/notifications/*`,
`app/api/requests/*`, `app/api/onboarding`, `app/api/rotas`, `app/api/settings`
and most of `app/(auth)/dashboard/*`. It is **comment text only, zero logic
changes**, but it touches a very wide surface. If you have edits in any of those
files, we will get conflicts across dozens of files, and resolving a cosmetic
change against your functional work is miserable.

**So: I land the sweep first, on its own commit, and you rebase onto it before
going further.** It is one commit, easy to rebase past, and after that we are
clear.

The other overlap is **`lib/db.js`**, where I changed `getOrgScope` (§3). That is
mobile backend work and probably yours. Do not start on it until we settle who
owns it.

**Proposed git flow**

1. I commit in labelled chunks and push. Order matters: the em dash sweep and
   the RLS security fix go to the shared base branch first, because you need
   both.
2. You pull or rebase onto that before writing more.
3. After that we work on separate branches: I take the job board, you take
   mobile and backend, and we merge through PRs rather than a shared branch.

Tell me your branch name and whether you have anything uncommitted in the paths
above, then I will push.

---

## 1. What I have been working on

**The `/jobs` board**, a public UK hospitality job board as a lead funnel for
Shiftly. Full context in `tasks/jobs-board-handoff.md` and
`tasks/jobs-board-spec.md`.

Built and verified: ingestion from Adzuna and SmartRecruiters, a classifier, a
per-employer diversifier, `/jobs` board page, `/jobs/[slug]` detail pages,
`/api/jobs/search`, `/api/jobs/ingest` with a 90 day expiry sweep. 180 listings
live from 75 employers.

**Plus two things that leaked outside the job board:**

- **Row Level Security across the whole database.** This was a live exposure:
  the public anon key had full read, write and delete on every table, including
  `Staff.name`, `wage`, `annual_salary` and `invite_email`. Now closed. See §4,
  it directly constrains how the mobile app can talk to data.
- **The em dash sweep**, house style, repo wide.

---

## 2. Files I own right now (please do not edit)

```
app/jobs/**                      board + detail pages
app/api/jobs/**                  search + ingest
lib/jobs/**                      taxonomy, query, classify, diversify, sources
tasks/jobs-board-spec.md
tasks/jobs-board-handoff.md
tasks/schema-jobs.sql
tasks/schema-rls.sql
middleware.js                    I added '/jobs(.*)' to isPublicRoute, one line
```

Also modified by my em dash sweep, comments only, no logic: most of
`app/(auth)/dashboard/**`, `app/api/**`, `app/components/**`, `lib/**`.

---

## 3. `lib/db.js`: the change I made, and why it is yours not mine

I wrote `tasks/mobile-app-brief.md` for the Expo repo and found a bug worth
knowing about before you go further.

`getOrgScope(userId)` resolved the active location from a **cookie**
(`shiftly_loc`) set by the web location switcher, and **fell back to the first
location silently** if absent. A native client cannot set that cookie. So every
mobile request from a manager with more than one venue would return an arbitrary
location's data with no error. They could approve a shift swap against the wrong
pub.

**What I changed (uncommitted, in `lib/db.js`):** `getOrgScope(userId, { locationId })`
now resolves in this order: explicit argument, then an `X-Shiftly-Location`
header, then the cookie, then the first location. An explicit argument or header
naming a location the caller does not own **throws** rather than falling back.
The cookie path still falls back quietly, since a stale cookie is not hostile.

**I have not verified it builds.** I was about to run `next build` when we
stopped to reconcile.

**This is your area.** Options: keep it and verify it, rewrite it your way, or
tell me to revert it. I have no attachment to the implementation, only to the
bug being known.

---

## 4. Constraints from my work that affect yours

**The mobile app must never talk to Supabase directly.** RLS is now on across
every table with no policies, except one public SELECT on live `Job Listings`.
The anon key returns zero rows everywhere else. Do not put `@supabase/supabase-js`
in the mobile app, and never ship the service role key in a bundle. All data goes
through Next.js API routes with a Clerk bearer token, which run server side and
use the service role key.

**Four API routes now use `supabaseAdmin` instead of the anon client**, because
RLS would have broken them: `teams/[team-id]/template`, `.../coverage`,
`.../sync-shifts`, `user-settings`.

**Auth is email OTP, not password.** Clerk lands on `factor-one` and emails a
numeric code.

---

## 5. Proposed ownership split

| Area | Owner |
|---|---|
| `/jobs` board, ingestion, job board SEO, posting funnel, Folk sync | **Me (A)** |
| Expo manager app, and all backend work it needs | **You (B)** |
| `lib/db.js`, location scoping | **You (B)**, once we settle §3 |
| `/api/requests`, `/api/notifications`, employee app | **You (B)** |
| Availability data model decision (§6) | **You (B)**, it is a mobile/staff concern |
| Repo-wide em dash sweep | **Me (A)**, finishing it, then hands off |
| RLS and database security | **Me (A)**, done, tell me if it blocks you |

---

## 6. Open decision you should own: two availability stores

There are two, and they model different things. Whoever builds the staff app
must pick one first or the rota will silently ignore staff input.

- **`Staff.availability`** (JSON, per-day windows `{"0": true | [start,end]}`).
  Used by **10 files including the solver** (`/api/generate-rota`). This is the
  live source of truth.
- **`"Staff Availability"` + `"Staff Availability Rules"`** (normalised, keyed by
  `shift_id`). **Zero code references.** Created for "the future employee-app
  flow".

If the staff app writes to the normalised tables, the solver will not read them
and rotas will quietly ignore every availability a staff member sets.

My recommendation, but it is your call: keep the JSON column as the single
store, have the staff app write to it via an API route, leave the normalised
tables dormant with a comment.

Also worth separating: **weekly availability** is a standing pattern with no
date; **time off** is a dated request with a status (`Requests` table). Only the
second belongs in an Inbox.

---

## 7. Sequencing view (mine, argue with it)

The Inbox depends on the employee app, because swap and time off requests
originate from staff. `/api/requests` and `/api/notifications` are currently
stubs (`GET` returns `[]`, writes 403) with the comment "Gated for the pilot,
the employee app / Inbox isn't live yet". So building the Inbox next produces a
correctly working empty screen.

Suggested order: location scoping fix, then manager mobile app read-first
(Today, Week, Staff, Publish, none of which need the Inbox), then decide the
availability store, then the staff app, then the Inbox across both.

---

## 8. What I need from you

1. Confirm whether you have uncommitted edits in any path in §2, before I commit.
2. Take or reject the `lib/db.js` change in §3.
3. Confirm the split in §5.
4. Tell me if RLS (§4) blocks anything you had planned.
