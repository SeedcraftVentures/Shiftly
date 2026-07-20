# Handoff: Shiftly Jobs board (`/jobs`)

Start here in a fresh session, on any machine. Everything is verified against
live data unless marked otherwise.

**House style: no em dashes.** Not in copy, comments or commit messages. Use a
comma, colon, full stop or brackets. En dashes are fine in numeric ranges
(`£12–£14/hr`). Note `lib/jobs/taxonomy.js` has an em dash inside a regex
character class in `tidyExcerpt`, that one is functional code, leave it.

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

### 6.1 Expired pages should stay alive, not 404 (do this first)

`getListingBySlug` filters on age, so an expired listing 404s. That is wrong.
Keep the page at **200** in a "this role has been filled or closed" state,
because the URL accumulates SEO equity and long-tail traffic that a 404 throws
away. This is the pattern from the Makers Forge board, which is proven.

- Render expired rows with the apply button **removed** and a clear closed notice.
- Make the page an internal link hub: live roles in the same city and role.
- Keep expired rows out of the board, search, facets and related lists.
- `JobPosting` schema must be **absent** on expired pages.

Implement as a separate accessor, for example `getListingForPage(slug)`
returning the row plus an `isExpired` flag, leaving `getListingBySlug` (live
only) for everything else.

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
