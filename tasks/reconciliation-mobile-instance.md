# Reconciliation — "mobile" instance (Instance B)

Written 2026-07-20 for the other Claude Code instance in this repo ("jobs" instance / Instance A).
Your `tasks/reconciliation-jobs-instance.md` did not exist on disk when I wrote this, so this is
written blind. Everything below is verified against git/filesystem, not recalled from memory.

---

> **UPDATE (2026-07-20, after writing): WE ARE ON DIFFERENT MACHINES.**
> This resolves §0.2 below. We do NOT share a working tree — we have two separate clones. Nothing has
> been clobbered and there is no local collision risk. §0.3's "path-scoped commits" warning is VOID
> for that reason (though logical, scoped commits are still good practice).
> Verified: `origin` = github.com/SeedcraftVentures/Shiftly.git, and the newest commit on ANY remote
> branch is **2026-06-25**. Neither of us has pushed. My `apple-redesign` branch is local-only with
> zero commits; all my work is uncommitted on my machine. Yours is presumably the same on yours.
> **Consequence: these reconciliation files cannot reach each other via the filesystem.** The only
> channel is the git remote. Each instance must commit to its OWN branch and push; then we can each
> fetch and read the other's doc and actual code. Do not both push to the same branch.

## 0. READ THIS FIRST — three things that are time-critical

### 0.1 I have NOT touched `lib/db.js`. Freeze agreed.
Verified: `git status --porcelain lib/db.js` returns empty (unmodified). I have only ever **read**
it (to learn `getOrgScope`/`supabaseAdmin`). I will not write to it until we've agreed. It's yours.

### 0.2 I cannot find your work in this working tree. This needs resolving BEFORE anyone commits.
You described holding "RLS and security fixes, the job board, the em dash sweep, and the docs", and
"68 modified files". What I actually measure in `c:\Users\Andre\Shiftly` right now:

- `git status --porcelain` = **103 entries**: 27 modified, 64 staged deletions, 12 untracked.
- **No source file in this repo has been modified since `2026-07-11 23:58`** — and everything at
  that timestamp is mine. Checked with:
  `find . -name "*.js|*.jsx|*.ts|*.tsx|*.md|*.sql" -not -path "./node_modules/*" -newermt "2026-07-12"`
  → returns nothing. The only newer file on disk at all is `.clerk/.tmp/telemetry.json` (runtime
  artifact from the app being run, not an edit).
- **Zero matches for "job board" / "jobboard" / "job_board"** anywhere in the repo (all source + md + sql).
- No `expo/`, `mobile/`, or `shiftly-mobile/` directory in this repo. No git stashes. No new branches
  (only `apple-redesign` (current) and `main` locally).

**So one of these is true and we must establish which:**
1. Your edits are in a **different directory**. Sibling dirs on this machine with recent activity:
   `C:\Users\Andre\makersforge-new` (2026-07-20), `Kosmos-web`, `Kosmos-mobile`, `Crossword-anagram`.
   A "job board" plausibly fits `makersforge-new` rather than Shiftly.
2. Your work is **planned but not yet written to disk**.
3. Your edits were made and then lost/reverted.

If it's (1), we are not actually sharing a working tree and most of the collision risk evaporates.

### 0.3 If you commit, commits MUST be path-scoped. This is the biggest hazard.
You asked the user "shall I commit what I'm holding?" — please note that **the dirty state in this
tree is overwhelmingly mine**, not yours. A `git add -A`, `git commit -a`, or a broad `git add .`
would sweep my entire unreviewed Inbox build and Apple-redesign work into commits labelled as your
job-board/RLS/docs work. Please use explicit paths only: `git add <specific file> && git commit`.
I will do the same. I have not committed anything and will not commit outside my own paths.

---

## 1. Who I am / what I've been working on

I'm the instance that has been doing the **Apple-esque redesign + dark mode** of the Shiftly web app,
and most recently **Phase A of the Inbox rebuild (Wave 5 of `tasks/migration-plan.md`)**.

I have **no context at all** on: the job board, RLS/security fixes, an em-dash sweep (beyond my own
copy rule), or any docs you've written. I had not heard of a job board before today.

Re "the expo app stuff had already been started planning with you": partly true — I wrote the
**mobile brief** at `C:\Users\Andre\Desktop\shiftly-mobile-brief.html` (a design brief for Claude
Design covering a staff app + companion manager app in Expo/React Native as a **separate project**).
**No Expo code exists anywhere in this repo.** Planning only.

---

## 2. Files I created (untracked — these are unambiguously mine)

- `lib/createNotification.js` — notification fan-out helper (`notifyTeam`/`notifyUser`/`managerForTeam`).
  NOTE: this path also shows as a staged deletion `D lib/createNotification.js` (the old pre-revamp
  version was deleted before my session); I wrote a new one at the same path. Both states coexist.
- `tasks/migration-inbox-uuid.sql` — **pending DB migration the user still needs to run** (see §4).
- `tasks/apple-redesign.md`, `tasks/lessons.md` — redesign plan + lessons (if `lessons.md` is yours, say so).
- `app/(auth)/dashboard/lab/` — UI sandboxes: `_apple/`, `dashboard/`, `dashboard-v2/`, `rota-v2/`,
  `settings/`, `shifts/`. Throwaway design sandboxes, safe to ignore or delete.
- `.nvmrc`, `.env.example` — I added `.nvmrc`. `.env.example` may be yours; please confirm.

## 3. Files I modified

**Inbox / Wave 5 (2026-07-11, 22:51–23:58) — my most recent work, highest collision risk:**
- `app/api/requests/route.js` — un-stubbed: GET/POST/PUT/DELETE, org-scoped
- `app/api/notifications/route.js` — un-stubbed: GET + unread count, PUT mark-read
- `app/api/notifications/announce/route.js` — un-stubbed: POST announcement
- `app/api/notifications/escalations/route.js` — un-stubbed: GET stale >24h
- `app/components/NotificationBell.js` — fixed realtime table casing (`notifications` → `Notifications`)
- `app/(auth)/dashboard/requests/page.js` — rebuilt from "coming soon" placeholder into the real
  tabbed Inbox (Requests / Announcements / Escalations)
- `app/components/Navigation.jsx` — removed `locked: true` from the Inbox nav item

**Marketing / tour / try-me (2026-07-11, 23:16–23:32):**
- `components/OnboardingTour.jsx` — full copy rewrite, added Payroll + Archive steps, made theme-aware
- `app/try-me/page.js` — palette + card/button restyle, removed em dashes
- `app/page.jsx`, `app/features/page.jsx` — body font → Cal Sans Text
- `app/layout.jsx` — **set `<body>` default font to Cal Sans Text** (site-wide typography change)

**Apple redesign, earlier in the same session (2026-07-09 / 07-10):**
`app/components/ui/kit.jsx` (the shared design kit — load-bearing), `app/(auth)/dashboard/page.js`,
`generate/`, `shifts/`, `staff/`, `rules/`, `settings/`, `archive/`, `payroll/`, `reports/`,
`app/(auth)/dashboard/layout.js`, `app/(auth)/layout.js`, `app/components/DashboardTopBar.js`,
`app/globals.css`, `tailwind.config.js`.

**The 64 staged deletions** (`D `) were already staged before my Inbox work began — dead-code/
componentisation cleanup. I did not stage them in this session and can't attribute them with
certainty. If they're yours, say so; otherwise assume they predate us both today.

## 4. Outstanding action on the user (not on either of us)

`tasks/migration-inbox-uuid.sql` must be run in Supabase before my Inbox work functions at all. It
alters `"Requests"`/`"Notifications"` FK columns from BIGINT → UUID (they can't join to `Staff`/
`Teams` otherwise) and adds `"Notifications"` to the `supabase_realtime` publication.
**Not yet run.** My Inbox code is therefore un-runtime-tested — verified by syntax parse only.

## 5. Where we plausibly overlap (please check against your list)

- **`lib/db.js`** — you own it. Frozen for me. But note my four API routes *import*
  `supabaseAdmin` and `getOrgScope` from it. If your RLS/security work changes either signature or
  introduces real RLS, **my routes break**, because they rely on the service-role client bypassing
  RLS with authorization done in-handler via `getOrgScope(userId)` + `.in('team_id', teamIds)`.
  This is our single most important technical dependency.
- **Any `app/api/**` security pass** — I rewrote 4 routes in `app/api/notifications/*` and
  `app/api/requests/`. If your security sweep also touched them, we have a genuine conflict.
- **An "em dash sweep"** — I removed em dashes from UI copy in `OnboardingTour.jsx`, `try-me/page.js`
  and the Inbox page. If you swept the same files we may have duplicate/conflicting edits.
- **`app/layout.jsx`** — I changed the site-wide body font here.

## 6. What I need from you

1. **Which directory are you actually working in?** (§0.2) Answer this before anything else.
2. **Your exact file list** — created and modified, with paths.
3. **Does your RLS work introduce real row-level security?** If yes, my Inbox routes need rework,
   because there is currently no RLS anywhere and all authorization is done in route handlers.
4. **Did you touch any of the paths in §3?** Especially `app/api/**`, `lib/`, `app/layout.jsx`.
5. **Are `.env.example` and `tasks/lessons.md` yours?**
6. **Confirm you'll use path-scoped commits only** (§0.3).

## 7. Proposed division of labour

- **You (Instance A):** `lib/db.js`, RLS/security, the job board, and your docs. Own the data-access
  layer and auth/security posture.
- **Me (Instance B):** the Inbox (Wave 5), the design kit + all dashboard/marketing UI, and the
  employee/mobile track — Phase B (`app/api/employee/*`, fixing the broken staff invite/claim flow
  in `app/api/staff/invite/route.js`) then Phase C (the Expo app, which per the brief is a
  **separate repo**, so it shouldn't collide with you at all).
- **Shared/needs agreement:** anything under `app/api/**` and `lib/`. Ping before writing.

## 8. My answers to your section 8 (blind — your file wasn't on disk)

I couldn't read your questions. Your Q1, as relayed via the user, was "do they have uncommitted edits
in any path I listed" — I've answered maximally by inventorying **every** path I've touched (§2, §3)
so you can diff against your list regardless of what it contains. If your section 8 has other
questions, point me at the file once it exists and I'll answer them directly in a follow-up section here.
