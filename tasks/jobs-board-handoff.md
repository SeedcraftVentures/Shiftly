# Handoff: Shiftly Jobs board (`/jobs`)

Pick this up in a fresh session on another machine. Everything below is verified
against live data unless marked otherwise.

**House style: no em dashes.** Not in copy, comments or commit messages. Use a
comma, colon, full stop or brackets. En dashes are fine in numeric ranges
(`£12–£14/hr`). Note `lib/jobs/taxonomy.js` has an em dash inside a regex
character class in `tidyExcerpt`, that one is functional code, leave it.

---

## 1. What this is

A public UK hospitality job board at `/jobs`, "powered by Shiftly". It is a
marketing funnel: aggregated listings give density and SEO, and free employer
posting (account gated) puts every posting venue into the Clerk waitlist as a
warm, consented lead, later syncing to Folk CRM for outreach.

It is deliberately independent of the main app: own tables, public reads, no
`getOrgScope`. It can ship while the app rebuild continues.

Full spec: `tasks/jobs-board-spec.md`. Read it first.

---

## 2. Current state, verified

**Built and working:**

- Ingestion from two sources, normalised through one classifier.
- `/jobs` board: HeatGlow hero, live stats strip, sticky filter bar with facet
  counts, cards, numbered pagination, Adzuna attribution.
- `/jobs/[slug]` detail pages: HeatGlow header, breadcrumb, three "Apply on
  site" CTAs, "At a glance" sidebar, excerpt notice, related roles in the same
  city.
- `GET /api/jobs/search`, public, filtered, paginated.
- `POST /api/jobs/ingest`, secret guarded, idempotent upsert, expiry sweep.
- 90 day expiry: nothing older is shown anywhere, and the sweep marks rows
  `expired` on every ingest run.

**Numbers from the last verified run:** 180 listings, 75 distinct employers,
117 with employer-stated pay, filters correct (`role=kitchen` 68,
`venue=hotel` 50, `city=Edinburgh` 86, `kitchen`+`Glasgow` 20), zero console
errors, `next build` compiles clean.

**Database:** tables live in Supabase project `mobdakvnkkgzndozrpnw`. DDL is in
`tasks/schema-jobs.sql` (already applied). RLS is on repo wide, see §5.

---

## 3. Environment

Already in `.env.local`:
- `ADZUNA_APP_ID`, `ADZUNA_API_KEY` (the code accepts `ADZUNA_API_KEY` as an
  alias for `ADZUNA_APP_KEY`).
- Supabase and Clerk keys.

**Missing, add before using the HTTP ingest route:**
```
JOBS_INGEST_SECRET=sk_jobs_7Qv3mR9xLpT2eWnK4hFdZs8Y
```
Without it, `POST /api/jobs/ingest` returns 401 by design. Ingest has so far
been run by calling the pipeline directly from a script, not over HTTP.

**`.env.local` is BOM sensitive.** Write UTF-8 without BOM or the Supabase CLI
env parser breaks.

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
lib/jobs/sources/adzuna.js       primary source, reaches the ICP
lib/jobs/sources/smartrecruiters.js  secondary, employer direct, no auth
app/jobs/page.jsx            the board
app/jobs/JobFilters.jsx      client filter bar (URL driven)
app/jobs/[slug]/page.jsx     detail page
app/api/jobs/search/route.js public search
app/api/jobs/ingest/route.js ingest + expiry sweep
tasks/jobs-board-spec.md     the spec
tasks/schema-jobs.sql        DDL (applied)
tasks/schema-rls.sql         RLS (applied)
```

---

## 5. Constraints you must not break

**RLS is on with no policies, except one.** `Job Listings` has a single public
SELECT policy for live rows. `Job Employers` has none, on purpose, because it
holds employer emails and PECR consent records. Never add a public read policy
to it. All writes are service role only, via API routes.

**Adzuna terms.** Listings must be labelled "Jobs by Adzuna" with a link back to
adzuna.co.uk (already rendered on the board footer and detail sidebar). The
`description` field is a **snippet capped at 500 characters**, not the full ad.
Never present it as complete. Free tier is 25/min, 250/day, 1,000/week,
**2,500/month**, so use scheduled sweeps, never per-user live search. Their
caching position is ambiguous, worth confirming in writing before scaling.

**Never let an estimate earn a transparency badge.** `pay_is_estimated` marks
Adzuna's predicted salaries. `showsPay()` requires employer-stated pay and a
bound greater than zero (Adzuna sends `0` for an unknown bound, which would
otherwise render a fictitious "£0" floor).

**`shift_pattern` and `experience_level` are native-only.** No aggregator feed
carries shift pattern. Experience is inferred from the **title only**, because
chain ads are boilerplate dominated (39 of 40 sampled Greene King ads mention
"apprentice" in their perks blurb, so body matching produces confident
nonsense). Both stay null on aggregated rows and are excluded from those
filters.

**Sources to avoid entirely:** Indeed (publisher API killed 2023), Monster
(Chapter 11, UK site dark since July 2025), Google Jobs via SERP APIs (Google is
actively suing SerpApi), and scraping Caterer.com / Totaljobs / CV-Library
(textbook *Innoweb v Wegener* database-right re-utilisation, reach that
inventory through Adzuna instead).

---

## 6. Work remaining, in priority order

### 6.1 Expired pages should stay alive, not 404 (do this first)

Currently `getListingBySlug` filters on age, so an expired listing 404s. That is
wrong. The Makers Forge pattern, which is correct: keep the page at **200** in a
"this role has been filled or closed" state, because the URL accumulates SEO
equity and long-tail traffic that a 404 throws away.

Requirements:
- Detail page renders for expired rows, with the apply button **removed** and a
  clear closed notice.
- The page becomes an internal link hub: show live roles in the same city and
  the same role category.
- Expired rows stay out of the board, search, facets and related-roles lists.
- `JobPosting` schema must be **absent** on expired pages (see 6.2).

Implement as a separate accessor, for example `getListingForPage(slug)` that
returns the row plus an `isExpired` flag, leaving `getListingBySlug` (live only)
for everything else.

### 6.2 JobPosting JSON-LD

This is the actual traffic engine. Google's job crawler needs it.

- Emit on live listings only, strip it the moment a listing expires. Google
  penalises live job markup on closed roles.
- **Only emit where we hold the full description.** Aggregated Adzuna rows are
  capped snippets, and marking up truncated content risks a structured data
  penalty. Gate on `is_native || source === 'smartrecruiters'` (and Reed once
  wired, it returns full text).
- Populate: `title`, `description`, `datePosted`, `validThrough`,
  `employmentType`, `hiringOrganization`, `jobLocation`, `directApply: false`.
- **Omit `baseSalary` unless pay is employer-stated and unambiguous.** A
  malformed `MonetaryAmount` is worse than none.
- Validate in Google's Rich Results Test before considering it done.

### 6.3 `metadataBase`

Not set, so Open Graph and Twitter images will not resolve to absolute URLs.
Set it in the root layout before anything gets shared socially.

### 6.4 City landing pages, `/jobs/in/[city]`

The main reason UK-wide works. Hospitality search is intensely local
("bar staff jobs Glasgow"). Each page is the board filtered to one city, with
its own metadata, H1 and copy. Cities come from the `city` column, which is
already normalised to council grain (Glasgow, not Hillhead).

### 6.5 Venue / employer pages, `/jobs/venues/[slug]`

Derived by grouping listings on employer, not stored. Makers Forge calls these
gold for hospitality, and "[venue] jobs [city]" is exactly what people search.
Show live roles plus past roles (linking to the still-alive expired pages).
Needs an employer slug, currently only `employer_name` exists.

### 6.6 The posting funnel (the actual point of the board)

Decided: **posting requires a Shiftly account.** Free to post.

- `/jobs/post`, Clerk gated form.
- Writes a rich row to `Job Employers` **and** the email to the Clerk waitlist
  (`app/api/try-me/waitlist/route.js` is the template, it captures email only).
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
endpoint returns **full descriptions**, which converts a large slice of the
board from "extract" to real content, and unlocks JobPosting schema for those
rows. Model it on `lib/jobs/sources/adzuna.js`. Read the registration agreement
for attribution and caching terms, they are not published publicly.

### 6.9 Smaller items

- **Empty state is currently a dead end** ("clear filters"). Make it a
  conversion surface: job alert capture, pre-filled with the active filters.
- **Sitemap** generated from live listings, cities and venues.
- **Weekly digest**: have the ingest emit a markdown list of what is new this
  week. Cheap, and it turns the pipeline into a recurring content engine.
- **Transparency ranking**: listings that show pay should rank above those that
  do not. Needs a stored boolean to sort on, so it is a small schema change
  (`shows_pay`) plus an ingest write. The filter works today, the ranking does
  not, and it has not been faked with a proxy sort.
- **Ingest is capped at 100 rows per run** and the table grows each run (Adzuna
  returns different roles each time). Uncapping it would let expiry key off
  "last seen in feed" rather than post date, which is more accurate, but only
  once the full corpus is ingested.

---

## 7. Running it locally

```
npm run dev            # Shiftly, check the port it reports
```

Ingest has been run by importing the pipeline directly in a script rather than
over HTTP, because `JOBS_INGEST_SECRET` was never added. Either add the secret
and POST to `/api/jobs/ingest`, or call `fetchRegion` / `fetchAll` and upsert
with `supabaseAdmin` from a scratch script.

Verify any UI change by actually rendering it, not by reasoning about it.
Playwright with `channel: 'chrome'` works, see `.shots/` for existing scripts
(the directory is gitignored).
