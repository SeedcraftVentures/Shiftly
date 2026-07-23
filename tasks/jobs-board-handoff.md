# Handoff: Shiftly Jobs board (`/jobs`)

Start here in a fresh session, on any machine. Everything is verified against
live data unless marked otherwise.

**House style: no em dashes.** Not in copy, comments or commit messages. Use a
comma, colon, full stop or brackets. En dashes are fine in numeric ranges
(`£12–£14/hr`). Note `lib/jobs/taxonomy.js` has an em dash inside a regex
character class in `tidyExcerpt`, that one is functional code, leave it.

---

## SESSION UPDATE (going live is the next job)

The board is feature-complete and verified on localhost, **not deployed**. The
owner wants it live to unblock the Shiftly Expo apps, and asked to do the
deploy/merge in a following session. Nothing is pushed. `jobs-board` is ~28
commits ahead of its base, working tree clean.

**Built and verified this stretch (all on `jobs-board`):**

- Expired pages stay at 200 (6.1), JobPosting JSON-LD (6.2), `metadataBase` (6.3).
- Full posting funnel: `/jobs/post` is public, drafts as `pending`, an emailed
  magic link confirms and publishes. Pay + shift pattern required. Featured is
  earned (fill everything), never sold. Optional waitlist offer with a dynamic
  Real-Living-Wage-style founder tier (first 200 get lifetime pricing, read live
  from the Clerk waitlist count).
- Passwordless employer login and management (`/jobs/manage`): magic-link
  session, edit / take down / repost, ownership-scoped, enumeration safe.
- Transparency badges (pay shown, meets living wage) + a living-wage filter.
  Wording is descriptive, NOT the Living Wage Foundation trademark. A verified
  "accredited" tier cross-referencing their public directory is a future upgrade.
- Reed connector (full descriptions, unlocks JobPosting). EXCLUDED from the
  scheduled ingest until its terms are confirmed.
- Two industries: classifier (hospitality | retail | other, off-topic dropped),
  `/jobs/hospitality`, `/jobs/retail`, an industry toggle, and a retail posting
  picker. Board reads industry from a shared column; only hospitality and retail
  are ever shown.
- Town pages `/jobs/in/[town]` for local marketing, with a seed-a-town
  conversion state (a target town renders "be the first to post" before it has
  any jobs). `TARGET_TOWNS` in `lib/jobs/taxonomy.js`, extend freely.
- The board has its own "Shiftly Jobs" header (`app/jobs/JobsNav.jsx`), distinct
  from the marketing nav, linked from the main site as "Job Board".
- Rate limiting (Supabase-backed), draft-spam cap, abandoned-draft sweep.
- Scheduled auto-refresh: `vercel.json` cron hits `/api/jobs/ingest` every 2
  days, pulling BOTH industries (Adzuna hospitality + retail categories + SR).

**Migrations, ALL APPLIED to Supabase `mobdakvnkkgzndozrpnw`:**
`schema-employers.sql`, `schema-employer-verify.sql`, `schema-rate-limits.sql`,
`schema-industry.sql`. The demo-clone DB currently holds ~409 live listings
(316 hospitality, 93 retail) from manual ingests.

### Going live: the checklist

1. **Merge target is a release decision.** The plan was jobs-board AFTER
   release 1; the owner now wants it live for the Expo apps. Confirm with the
   owner / instance B whether it merges to `apple-redesign`, `develop` or `main`.
2. **Deploy to Vercel.**
3. **Set Vercel production env vars.** Everything in `.env.local` PLUS:
   - `NEXT_PUBLIC_APP_URL=https://shiftly.so` (locally it is set to
     `http://localhost:3001` for dev; production MUST be the real domain or magic
     links break).
   - `CRON_SECRET` (any strong random string). Vercel sends it as
     `Authorization: Bearer` on cron calls; the ingest route checks it. Without
     it the scheduled refresh is unauthorised.
   - Clerk **pk_live / sk_live** for production (`.env.local` has pk_test for
     localhost). `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`.
   - `RESEND` (or `RESEND_API_KEY`). `shiftly.so` is a VERIFIED Resend domain,
     sends from `noreply@shiftly.so` work.
   - `JOBS_AUTH_SECRET` (magic-link signing, keep stable across deploys or
     existing links/sessions break), Supabase keys, Adzuna, `REED_JOBSEEKERS`.
4. **Check the Vercel plan.** The ingest route asks for `maxDuration = 300`,
   which needs Pro. On Hobby it caps lower and a full sweep can time out, trim
   SmartRecruiters or split the run.
5. **Reed terms** stay unconfirmed, so Reed is correctly out of the scheduled
   ingest (DEFAULT_SOURCES). Confirm attribution/caching before enabling it in
   production.
6. **First production ingest** to populate prod: let the cron fire, or POST to
   `/api/jobs/ingest` with `x-ingest-secret` (`JOBS_INGEST_SECRET`, add it to
   Vercel too if using the manual path).
7. **SEO discoverability (not launch-blocking, but do it soon):** a sitemap from
   live listings + cities + towns, and browse-by-town links, so the town and
   industry pages are crawlable. `listCities()` in `lib/jobs/query.js` is the
   helper for the town list. Until this lands, town pages only serve
   directly-advertised URLs, not organic local search.

Verification this session was via built scripts in the session scratchpad (now
gone). Re-verify by rendering (curl/Playwright), as section 7 says.

---

## 0. Getting running on a new machine

```bash
git fetch origin
git checkout jobs-board          # branched from shiftly-rebuild
npm install
npm run dev                      # note the port it reports
```

**`.env.local` is gitignored, so git will not bring it.** Copy it from the other
machine, or recreate it. Required variable names:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY     # pk_test_ for localhost, not pk_live_
CLERK_SECRET_KEY                      # sk_test_
NEXT_PUBLIC_APP_URL
ADZUNA_APP_ID                         # 60e652f2
ADZUNA_API_KEY                        # the code accepts this as an alias for ADZUNA_APP_KEY
JOBS_INGEST_SECRET                    # NOT SET YET, see below
```

Two gotchas that have cost real time:

- **Write it UTF-8 without BOM.** A BOM breaks the Supabase CLI env parser.
- **Clerk keys must be `pk_test_` / `sk_test_`.** Live keys cannot sign in on
  localhost, and the symptom is a confusing redirect loop rather than an error.

`JOBS_INGEST_SECRET` has never been set. Without it `POST /api/jobs/ingest`
returns 401 by design. Ingest has so far been run by importing the pipeline
directly in a scratch script instead. Either add a secret and POST to the route,
or call `fetchRegion` / `fetchAll` and upsert with `supabaseAdmin`.

### Where things stand in git

```
origin/shiftly-rebuild   4c3f79d
  2494902 chore(style): remove em dashes from copy and comments   (57 files)
  4c3f79d fix(security): enable RLS and stop routes using anon client

origin/jobs-board        0f42374   (this branch)
  7eb40b6 feat(jobs): UK hospitality job board at /jobs           (~1800 lines)
  6a0e9c9 feat(db): resolve active location from a header, not just a cookie
  c38c88d docs: handoff, Expo brief, reconciliation
  84bb946 docs: reply to instance B, correct the RLS premise
  0f42374 docs: answer instance B, confirm inbox migration still needed
```

Nothing is merged. `main` and `develop` are untouched.

---

## 1. There is a second Claude Code instance. Stay in your lane

Instance B works on the Apple redesign, the Inbox, dark mode and the
employee/mobile track, on branch `apple-redesign`. Read
`tasks/reconciliation-jobs-instance.md` and `tasks/game-plan.md` for the full
exchange.

**Yours to edit:**

```
app/jobs/**            app/api/jobs/**        lib/jobs/**
tasks/jobs-board-*.md  tasks/schema-jobs.sql  tasks/schema-rls.sql
middleware.js          (one line, the '/jobs(.*)' public route)
```

**Not yours, do not edit without agreeing first:**

- `lib/db.js`. Commit `6a0e9c9` on this branch changes `getOrgScope` and is
  isolated so B can cherry-pick, rewrite or drop it. It is mobile backend
  territory.
- `app/(auth)/dashboard/**`, `app/api/notifications*`, `app/api/requests`,
  `app/components/**` beyond what the board needs.

---

## 2. What this is

A public UK hospitality job board at `/jobs`, "powered by Shiftly". It is a
marketing funnel: aggregated listings give density and SEO, and free employer
posting (account gated, still to build) puts every posting venue into the Clerk
waitlist as a warm, consented lead, later syncing to Folk CRM for outreach.

Deliberately independent of the main app: own tables, public reads, no
`getOrgScope`. It can ship while the app rebuild continues.

Full spec: `tasks/jobs-board-spec.md`. Read it before changing behaviour.

---

## 3. Current state, verified

**Working:**

- Ingestion from Adzuna (primary) and SmartRecruiters (secondary), normalised
  through one classifier, diversified so no chain dominates.
- `/jobs`: HeatGlow hero, live stats strip, sticky filter bar with facet counts,
  cards, numbered pagination, Adzuna attribution.
- `/jobs/[slug]`: HeatGlow header, breadcrumb, three "Apply on site" CTAs,
  "At a glance" sidebar, excerpt notice, related roles in the same city.
- `GET /api/jobs/search`, public, filtered, paginated.
- `POST /api/jobs/ingest`, secret guarded, idempotent upsert, expiry sweep.
- 90 day expiry, enforced in the query layer and swept on every ingest.

**Last verified numbers:** 180 listings, 75 distinct employers, 117 with
employer-stated pay. Filters correct: `role=kitchen` 68, `venue=hotel` 50,
`city=Edinburgh` 86, `kitchen`+`Glasgow` 20. Zero console errors. Build compiles.

**Database:** Supabase project `mobdakvnkkgzndozrpnw`. `tasks/schema-jobs.sql`
and `tasks/schema-rls.sql` are both already applied. Do not re-run blindly.

---

## 4. File map

```
lib/jobs/taxonomy.js         pure taxonomy, labels, formatPay, showsPay, tidyExcerpt
                             (no server imports, safe for client components)
lib/jobs/query.js            server reads: searchListings, getFacets,
                             getListingBySlug, getRelatedListings, MAX_AGE_DAYS
lib/jobs/classify.js         title -> role, brand/address -> venue, contract,
                             experience, agency detection, hospitality filter,
                             pay parsing, slug builder
lib/jobs/diversify.js        round robin per employer so no chain dominates
lib/jobs/sources/adzuna.js           primary source, reaches the ICP
lib/jobs/sources/smartrecruiters.js  secondary, employer direct, no auth
app/jobs/page.jsx            the board
app/jobs/JobFilters.jsx      client filter bar (URL driven)
app/jobs/[slug]/page.jsx     detail page
app/api/jobs/search/route.js public search
app/api/jobs/ingest/route.js ingest + expiry sweep
```

**Why taxonomy and query are separate:** `query.js` imports `supabaseAdmin`,
which pulls in `next/headers` and cannot be bundled into a client component. The
filter bar is a client component and needs the taxonomy. Keep them apart or the
build fails with a client/server boundary error.

---

## 5. Constraints you must not break

**RLS is on with no policies, except one.** `Job Listings` has a single public
SELECT policy for live rows. `Job Employers` has none, on purpose, because it
holds employer emails and PECR consent records. Never add a public read policy
to it. All writes are service role only, via API routes.

**Adzuna terms.** Listings must be labelled "Jobs by Adzuna" with a link back to
adzuna.co.uk (already on the board footer and the detail sidebar). The
`description` field is a **snippet capped at 500 characters**, not the full ad,
so never present it as complete. Free tier is 25/min, 250/day, 1,000/week,
**2,500/month**: scheduled sweeps only, never per-user live search. Their
caching position is ambiguous, confirm in writing before scaling.

**Never let an estimate earn a transparency badge.** `pay_is_estimated` marks
Adzuna's predicted salaries. `showsPay()` requires employer-stated pay and a
bound greater than zero, because Adzuna sends `0` for an unknown bound, which
would otherwise render a fictitious "£0" floor.

**`shift_pattern` and `experience_level` are native-only.** No aggregator feed
carries shift pattern. Experience is inferred from the **title only**, because
chain ads are boilerplate dominated: 39 of 40 sampled Greene King ads mention
"apprentice" in their perks blurb, so body matching produces confident nonsense.
Both stay null on aggregated rows and are excluded from those filters.

**Sources to avoid entirely:** Indeed (publisher API killed 2023), Monster
(Chapter 11, UK site dark since July 2025), Google Jobs via SERP APIs (Google is
actively suing SerpApi), and scraping Caterer.com / Totaljobs / CV-Library
(textbook *Innoweb v Wegener* database-right re-utilisation, reach that
inventory through Adzuna instead).

---

## 6. Work remaining, in priority order

### 6.1 Expired pages stay alive, not 404 ✅ DONE

`getListingForPage(slug)` in `lib/jobs/query.js` fetches by slug with no status
or age filter and returns the row plus `isExpired`, true when `status !== 'live'`
**or** `posted_at` is missing or past the 90 day cutoff. The detail page is its
only caller. `getListingBySlug` is unchanged and still live only, but it now has
no callers, kept for the venue pages in 6.5.

On a closed page: all three apply CTAs are gone (header badge, body block,
sidebar button becomes "Browse open jobs"), a "This role has closed" card sits
above the description with links to `/jobs?city=` and `/jobs?role=`, related
roles widen from 4 to 8 under a "Roles open now" heading, and the title gains
"(closed)". The page stays indexable, which is the point.

Verified against live data, not reasoned about. There were no expired rows in
the table, so three throwaway fixtures were inserted (expired by age, expired by
status, and a live control), asserted, then deleted. 22/22 checks passed: 200 not
404, closed card and badge present, no "Apply on site" and no `apply_url` in the
HTML, missing slugs still 404, live pages untouched, and expired rows absent from
search, the board and related lists. Table back at 180 rows, no runtime errors.
`npx next build` compiles.

`JobPosting` absence passes trivially today because no JSON-LD exists yet. Wire
the `closed` flag into the gate in 6.2 so it cannot regress.

### 6.2 JobPosting JSON-LD

The actual traffic engine. Google's job crawler needs it.

- Live listings only. Strip it the moment a listing expires, Google penalises
  live job markup on closed roles.
- **Only where we hold the full description.** Adzuna rows are capped snippets,
  and marking up truncated content risks a structured data penalty. Gate on
  `is_native || source === 'smartrecruiters'` (and Reed once wired).
- Populate `title`, `description`, `datePosted`, `validThrough`,
  `employmentType`, `hiringOrganization`, `jobLocation`, `directApply: false`.
- **Omit `baseSalary` unless pay is employer-stated and unambiguous.** A
  malformed `MonetaryAmount` is worse than none.
- Validate in Google's Rich Results Test before calling it done.

### 6.3 `metadataBase`

Not set, so Open Graph and Twitter images will not resolve to absolute URLs. Set
it in the root layout before anything is shared socially.

### 6.4 City landing pages, `/jobs/in/[city]`

The main reason UK-wide works. Hospitality search is intensely local ("bar staff
jobs Glasgow"). Each page is the board filtered to one city with its own
metadata, H1 and copy. Cities come from the `city` column, already normalised to
council grain (Glasgow, not Hillhead).

### 6.5 Venue pages, `/jobs/venues/[slug]`

Derived by grouping listings on employer, not stored. "[venue] jobs [city]" is
exactly what hospitality workers search, and every page is a warm Shiftly lead.
Show live roles plus past roles linking to the still-alive expired pages. Needs
an employer slug, currently only `employer_name` exists.

### 6.6 The posting funnel (the actual point of the board)

Decided: **posting requires a Shiftly account.** Free to post.

- `/jobs/post`, Clerk gated form.
- Writes a rich row to `Job Employers` **and** the email to the Clerk waitlist.
  `app/api/try-me/waitlist/route.js` is the template, it captures email only.
- **Pay and shift pattern are required fields** on native posts. This is where
  the fairness positioning is actually enforced, and it costs nothing.
- **Marketing consent must be a separate, unticked checkbox**, never bundled
  into terms acceptance. Bundled consent is invalid, and sole traders and
  partnerships (a large slice of independent hospitality) count as individuals
  under PECR.
- Store `marketing_consent` and `consent_at`.

### 6.7 Folk CRM sync

New non-agency employer posts a job, create the company and contact in Folk with
source attribution. **Skip rows where `is_agency` is true**, agencies do not run
a rota and would pollute the outreach list.

### 6.8 Reed connector

The owner is getting a key. Reed matters more than it first appeared: its detail
endpoint returns **full descriptions**, which converts a large slice of the board
from "extract" to real content and unlocks JobPosting schema for those rows.
Model it on `lib/jobs/sources/adzuna.js`. Read the registration agreement for
attribution and caching terms, they are not published publicly.

### 6.9 Smaller items

- **Empty state is a dead end** ("clear filters"). Make it a conversion surface:
  job alert capture, pre-filled with the active filters.
- **Sitemap** from live listings, cities and venues.
- **Weekly digest**: have the ingest emit a markdown list of what is new this
  week. Cheap, and it turns the pipeline into a recurring content engine.
- **Transparency ranking**: listings that show pay should rank above those that
  do not. Needs a stored boolean to sort on, so a small schema change
  (`shows_pay`) plus an ingest write. The filter works today, the ranking does
  not, and it has not been faked with a proxy sort.
- **Em dashes**: public pages are clean, roughly 109 remain in the authed app.
  Lab and sandbox files are excluded by the owner's instruction. Careful, that
  work touches instance B's territory, coordinate first.
- **Ingest is capped at 100 rows per run** and the table grows each run, because
  Adzuna returns different roles each time. Uncapping would let expiry key off
  "last seen in feed" rather than post date, which is more accurate, but only
  once the full corpus is ingested.

---

## 7. How to verify

Render it, do not reason about it. Playwright with `channel: 'chrome'` works.
Hide the dev overlay with:

```
nextjs-portal,[data-nextjs-dev-tools-button],#__next-dev-tools-indicator,
[data-next-badge-root],[data-next-badge]{display:none!important}
```

Check filter counts against `/api/jobs/search?...` and parse the JSON properly.
A greedy `.*` in sed will grab the wrong `"total"` from the response, which
produced a false result once already.

Run `npx next build` before committing. It catches client/server boundary
errors that dev mode does not.
