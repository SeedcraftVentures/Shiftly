# Shiftly Jobs — UK hospitality job board  [PLAN — awaiting approval]

Public board at `/jobs`, "powered by Shiftly". Marketing funnel: aggregated listings give
density + SEO; **free employer posting is account-gated**, so every posting venue lands in the
Clerk waitlist as a warm, consented ICP lead, then syncs to Folk for manual outreach.

Ships independently of the app rebuild — own tables, public reads, no `getOrgScope`.

## Decisions (locked)

- Posting flow: **require Shiftly account** (Clerk) to post. Free to post.
- Geography: **UK-wide** from day one, with city landing pages for local density.
- Inventory: aggregator + ATS feeds, **not** scraping.
- Styling: **marketing system** (Tailwind, `font-cal`, Figtree, pink-500, `max-w-6xl`),
  matching `app/page.jsx` — NOT the dashboard `kit.jsx`.

## Sources — ranked

| # | Source | Auth | Status | Notes |
|---|---|---|---|---|
| 1 | **SmartRecruiters** | none | ✅ verified live, 3,053 Greene King jobs | Employer-published, cleanest legally. Build connector generic — new tenants = config. |
| 2 | **Adzuna** | free key | signup needed | Widest UK net; transitively covers Caterer.com, Totaljobs, CV-Library, DWP. **Free tier: 2,500 calls/month** → scheduled category sweeps, never per-user live search. Must label "Jobs by Adzuna" + link back. Caching position is ambiguous — confirm in writing. |
| 3 | **Reed** | free key | signup needed | Instant self-serve. Details endpoint returns full description. Public terms are thin — read the registration agreement. |
| 4 | Employer-direct crawl (Workday/Eploy/JSON-LD) | — | phase 2 | Nando's (Workday), Marston's (Eploy). Needs headless browser for SPA-rendered JSON-LD. Respect robots.txt. |

**Avoid:** Indeed (publisher API dead 2023), Monster (Chapter 11, UK dark July 2025), Google Jobs
via SERP APIs (Google actively suing SerpApi), scraping Caterer.com/Totaljobs/CV-Library
(*Innoweb v Wegener* re-utilisation), Wetherspoons (403s crawlers), Harri private API
(**pursue as a BD partnership instead — it powers Mitchells & Butlers**).

## Data model — `tasks/schema-additions.sql`, quoted PascalCase

**`"Job Listings"`**
`id, source, source_id, source_url, attribution, title, role_category, employer_name,
employer_id (fk, nullable), venue_type, brand, city, region, postcode, lat, lng,
contract_type, pay_min, pay_max, pay_period, pay_is_estimated, shift_pattern,
experience_level, description, apply_url, is_native, slug, posted_at, expires_at, status`

Unique on `(source, source_id)` for idempotent re-ingest.

**`"Job Employers"`** — native posters
`id, organization_id (fk nullable), clerk_user_id, name, email, venue_type, town, website,
logo_url, marketing_consent, consent_at, folk_company_id, folk_synced_at, created_at`

## Normalisation (the real work)

Sources give free-text titles. A keyword classifier maps → `role_category`
(bar · kitchen/chef · KP · waiting · barista · host · supervisor · management · housekeeping)
and → `venue_type` (pub · bar · restaurant · café · hotel · QSR · nightclub · catering · bakery).
Lives in `lib/jobs/classify.js`, unit-testable, shared by every connector.

**Honest limitation:** `shift_pattern` (days/evenings/weekends/split) is *not present in any source
feed*. It can only be set reliably on **native** listings where the employer picks it. For
aggregated rows it stays null and the filter excludes them. This is a feature, not a bug — it
makes native listings visibly better and gives employers a reason to post.

## Routes

| Route | Purpose |
|---|---|
| `/jobs` | Board: hero, stats bar, filter bar, paginated cards (25/pg) |
| `/jobs/[slug]` | Detail. Native = full ad + native apply. Aggregated = summary + attributed link-out. |
| `/jobs/in/[city]` | City landing pages — local SEO density |
| `/jobs/post` | Account-gated posting form |
| `POST /api/jobs/search` | Public, no auth |
| `POST /api/jobs/post` | Clerk-authed; writes listing + employer + waitlist entry |
| `POST /api/jobs/ingest` | Cron-triggered; secret-header guarded |

Add `'/jobs(.*)'` to `isPublicRoute` in `middleware.js` (lines 4–19). `/api/*` already bypasses
middleware, so API routes need no entry — but `/api/jobs/post` must call `auth()` itself.

## Filters

Role · Venue type · Town/city + radius · Contract (FT/PT/casual/seasonal/temp) ·
Pay band (hourly) · Experience (none/some/experienced) · **Shift pattern** (native only).
Horizontal filter bar, mobile-first — hospitality traffic is overwhelmingly mobile.

## Compliance

- `/jobs/post` form: separate **unticked** marketing consent box, not bundled into T&Cs
  (bundled consent is invalid; sole traders and partnerships need real consent under PECR).
- Store `marketing_consent` + `consent_at` per employer.
- Aggregated listings carry required attribution + link-back.
- Job-alert signups (jobseekers) are a **separate list** from the employer waitlist.
- Retrofit the same consent box on the Makers Forge capture form.
- Get a solicitor over the terms before sending at volume.

## Build slices

- [ ] **1 — Ingestion.** Schema, `lib/jobs/classify.js`, SmartRecruiters connector,
      `/api/jobs/ingest`. Verify: DB populated with classified Greene King rows, re-run is idempotent.
- [ ] **2 — Board.** `/jobs` page + `/api/jobs/search` + filters + pagination. Marketing styling,
      FloatingNav + Footer. Verify: renders, filters return correct counts, no console errors.
- [ ] **3 — Detail + city pages.** `/jobs/[slug]`, `/jobs/in/[city]`, JSON-LD JobPosting on native ads.
- [ ] **4 — Posting funnel.** `/jobs/post`, Clerk gate, consent capture, waitlist write.
- [ ] **5 — Folk sync.** New employer → Folk company + contact with source attribution.
- [ ] **6 — Adzuna + Reed connectors.** Once keys exist. Respect the 2,500/mo ceiling.

**Slices 1+2 = a demo-able board.**

## Open items (do not block the build)

- Confirm Adzuna caching position in writing before launch.
- Ask DWP whether Find a Job vacancies can be released under OGL — would be the cleanest source.
- Sweep more SmartRecruiters tenants; Greene King may not be the only UK hospitality chain.
- Add `/jobs` to `FloatingNav`; note the existing dead `/about` link while in there.
