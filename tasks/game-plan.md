# Shiftly — two-instance game plan

Two Claude Code instances are working on Shiftly from **two different machines**:
- **Instance B ("mobile")** — Apple redesign, Inbox, marketing/tour, and the employee/mobile track. Branch: `apple-redesign`.
- **Instance A ("jobs")** — job board, RLS/security, docs. Branch: TBD (suggest `jobs-board`).

This file is the shared plan. Verified against git on 2026-07-20, not recalled from memory.

---

## 1. Where things actually stand

- **Remote** is `github.com/SeedcraftVentures/Shiftly.git`. Before today, the newest commit on **any**
  remote branch was **2026-06-25**. Neither instance had pushed anything.
- **Every existing remote branch is already merged** — `shiftly-rebuild`, `calling-card-restyle`,
  `feature/v2-roadmap` are all **0 commits ahead of main**. There is nothing outstanding to salvage
  or consolidate. They are stale pointers and can be deleted.
- **`netlify.toml` exists**, so the site deploys from Netlify (almost certainly off `main`).
  => Do NOT merge unverified work straight into `main` or it ships.
- Both instances had **uncommitted** work. Instance B has now committed (§2). Instance A has not, as
  far as B can tell.

## 2. What is on `apple-redesign` (Instance B) — 5 commits, local, not yet pushed

| Commit | Contents |
|---|---|
| `faf1e61` | Apple redesign + dark mode: theme-aware kit (`app/components/ui/kit.jsx`) + every dashboard page + shell. 21 files |
| `4ef64ce` | Dead-code removal: 63 files, -13,580 lines (old workspace/, per-page component+hook splits, legacy rota/ + template/ sets). Isolated so it can be reverted alone |
| `3e63abd` | Onboarding tour rewrite (+ Payroll/Archive steps), try-me restyle, body font -> Cal Sans Text site-wide |
| `9b095af` | **Inbox Wave 5**: un-stubbed `/api/requests`, `/api/notifications`, `/announce`, `/escalations`; rebuilt `lib/createNotification.js`; real Inbox page; NotificationBell realtime casing fix |
| `08c0209` | Docs: reconciliation handover, redesign notes, `.nvmrc`, `.env.example` |

`.env.local` is gitignored and was never committed.

## 3. What Instance A should do next

1. **Commit your work locally**, in logical chunks (job board / RLS+security / docs).
2. **Push to your OWN branch** — suggest `jobs-board`.
   - NOT `apple-redesign` (that's Instance B's).
   - Do NOT push onto `shiftly-rebuild`, and never `--force` it: it's already merged into `main`,
     so a force-push would rewrite shipped history.
3. There is **no clobbering risk** — separate machines, separate clones. Commit and push freely.
4. Answer the RLS question in §5. That's the blocker.

## 4. Target working setup (once both branches are pushed)

- **Integration branch: `develop`**, not `main`. Both branches merge into `develop`, get verified
  there, and only then does `develop -> main` ship via Netlify.
- **Consolidate onto one machine using `git worktree`** — NOT one shared working tree. Two agents
  editing one directory silently clobber each other (A reads, B writes, A writes back stale) and a
  `checkout`/`reset`/`stash` by either yanks the floor out from under the other.
  ```
  git worktree add ../shiftly-jobs jobs-board
  ```
  One `.git`, two directories, one branch each. Each can read the other's files directly
  (`../shiftly-jobs/lib/db.js`) with no push/pull, commits are visible to both instantly, zero
  clobbering, separate dev-server ports.
- Note: instances still communicate **through files** either way. Co-location removes the network
  round trip; it does not create a conversation. Anything not written down does not transfer.

## 5. The one real collision: RLS

**This is the only genuine technical conflict between the two workstreams.**

There is currently **no RLS anywhere** in this project. Every API route uses the **service-role
client** (`supabaseAdmin` in `lib/db.js`), which bypasses RLS, and does authorization **in the route
handler** via `getOrgScope(userId)` + `.in('team_id', teamIds)`.

Instance B's four new Inbox routes follow exactly that pattern.

**=> If Instance A's security work enables real row-level security, Instance B's Inbox routes break.**

Decide once, explicitly:
- **(a) Keep in-handler authorization** (status quo, consistent with the whole codebase), or
- **(b) Introduce real RLS + Clerk-JWT-to-Supabase**, in which case every route needs rework, not
  just the Inbox ones.

`lib/db.js` is **owned by Instance A**. Instance B has not modified it (verified unmodified) and will
not without agreement. But B's routes import `supabaseAdmin` and `getOrgScope` from it, so any change
to those signatures is a breaking change for B.

## 6. Division of labour

- **Instance A:** `lib/db.js`, RLS/security posture, job board, its docs.
- **Instance B:** Inbox (Wave 5), design kit + all dashboard/marketing UI, then the employee/mobile
  track — Phase B (`app/api/employee/*`, fixing the broken staff invite/claim flow in
  `app/api/staff/invite/route.js`) and Phase C (Expo app, a **separate repo**, so no collision).
- **Needs agreement before writing:** anything under `app/api/**` and `lib/`.

## 7. Open items

- [ ] **User:** run `tasks/migration-inbox-uuid.sql` in Supabase. The Inbox does not function until
      then — `Requests`/`Notifications` FK columns are BIGINT while `Teams`/`Staff`/`Shift Patterns`
      are UUID, so they cannot join. Also adds `"Notifications"` to the realtime publication.
- [ ] **Instance B:** Inbox is verified by syntax-parse only, never run. Needs a real click-through
      after the migration.
- [ ] **Instance A:** confirm working directory, exact file list, and the §5 RLS answer.
- [ ] **Both:** push branches, then delete the stale already-merged remote branches.
