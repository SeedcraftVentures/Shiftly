-- Employer records for the job board: promotes aggregated employers from a loose
-- employer_name string into real rows, so Folk sync, Apollo enrichment, venue
-- pages and the Companies House gate all hang off one entity.
--
-- Additive only. Every new column is nullable or defaulted, so this is safe to
-- run against the live table and safe to run twice.
--
-- Status: NOT YET APPLIED.

-- ── Make the table usable for employers we did not meet through a form ──────
-- It was built for native posters, who always supply an email. Aggregated
-- employers are discovered from a feed and have none until enrichment finds one.
-- Postgres allows many NULLs under a unique index, so idx_job_employers_email
-- keeps working unchanged.
alter table "Job Employers" alter column email drop not null;

alter table "Job Employers"
  -- How we came to know about them. 'aggregated' rows are derived from listings,
  -- 'native' rows come from someone filling in /jobs/post.
  add column if not exists origin            text        not null default 'aggregated',

  -- Venue page URL: /jobs/venues/[slug].
  add column if not exists slug              text,

  -- THE GRAIN DECISION, in one column. Each trading site stays its own row
  -- because each one runs its own rota and is its own lead. Sites that belong to
  -- a group point at the group's row: Apex Dunblane, Apex Grassmarket and Apex
  -- Waterloo are three employers with one parent. Chains roll up for reporting,
  -- properties stay separate for outreach.
  add column if not exists parent_employer_id uuid       references "Job Employers"(employer_id) on delete set null,

  -- Agencies are kept on the board for jobseekers but never synced to Folk:
  -- they do not run a rota, so they are not a lead.
  add column if not exists is_agency         boolean     not null default false,

  -- enterprise | independent | agency. Drives which outreach track they get:
  -- enterprise is solution-aware (displacement content), independent is
  -- problem-aware (education).
  add column if not exists segment           text,

  -- ── Companies House: the lawful-basis gate ────────────────────────────────
  -- ltd | llp | sole_trader | unknown.
  -- Under PECR a corporate subscriber (ltd, llp) may receive cold B2B email on
  -- legitimate interest with an opt-out. Sole traders and unincorporated
  -- partnerships count as INDIVIDUALS and need consent first.
  add column if not exists entity_type       text        not null default 'unknown',
  add column if not exists companies_house_number text,
  add column if not exists companies_house_name   text,
  add column if not exists companies_house_checked_at timestamptz,

  -- Defaults FALSE so the pipeline fails closed. Nothing is emailable until a
  -- check has actively said so. Mirrored to the "Safe to Email" field in Folk.
  add column if not exists safe_to_email     boolean     not null default false,

  -- ── Enrichment ────────────────────────────────────────────────────────────
  -- Apollo's organization enrichment takes a DOMAIN, not a company name, so this
  -- has to be resolved (Companies House, careers page, search) before Apollo runs.
  add column if not exists domain            text,
  add column if not exists apollo_organization_id text,
  add column if not exists enriched_at       timestamptz,

  -- ── The self-check ────────────────────────────────────────────────────────
  -- unreviewed | ok | mismatch. Set by comparing what enrichment says about the
  -- company against what the board itself shows (city, name, size). A mismatch
  -- usually means we matched the WRONG company, which is an outreach error
  -- waiting to happen, so those are held back rather than deleted.
  add column if not exists match_status      text        not null default 'unreviewed',
  add column if not exists match_notes       text,
  add column if not exists match_checked_at  timestamptz,

  add column if not exists listing_count     integer     not null default 0,
  add column if not exists first_seen_at     timestamptz not null default now(),
  add column if not exists last_seen_at      timestamptz,
  add column if not exists updated_at        timestamptz not null default now();

-- Venue pages need a stable unique slug. Partial, because native rows created
-- before this migration may not have one yet.
create unique index if not exists idx_job_employers_slug
  on "Job Employers" (slug) where slug is not null;

create index if not exists idx_job_employers_parent   on "Job Employers" (parent_employer_id);
create index if not exists idx_job_employers_segment  on "Job Employers" (segment);
create index if not exists idx_job_employers_sync     on "Job Employers" (safe_to_email, match_status);
create index if not exists idx_job_employers_folk     on "Job Employers" (folk_company_id);

-- Listings are looked up by employer constantly once venue pages exist.
create index if not exists idx_job_listings_employer  on "Job Listings" (employer_id);

-- ── Transparency ranking and featured placement ─────────────────────────────
alter table "Job Listings"
  -- Denormalised copy of showsPay(): employer-stated pay with a bound above zero.
  -- The transparency FILTER works today by combining pay_is_estimated and the pay
  -- bounds, but you cannot ORDER BY that combination cheaply, so ranking honest
  -- listings above the rest needs it stored. Written at ingest and on post.
  add column if not exists shows_pay      boolean not null default false,

  -- Earned, not sold. A native post that states pay AND shift pattern gets a
  -- short spell at the top of the board. Deliberately a timestamp rather than a
  -- boolean so it lapses on its own with no sweep job to forget about.
  --
  -- Call this "Featured" in the UI, never "Sponsored": nobody paid for it, and
  -- labelling earned placement as paid is both misleading and wastes the word if
  -- real sponsorship is ever sold.
  add column if not exists featured_until timestamptz;

-- Partial index: only the handful of currently-featured rows are ever scanned.
create index if not exists idx_job_listings_featured
  on "Job Listings" (featured_until) where featured_until is not null;

create index if not exists idx_job_listings_transparency
  on "Job Listings" (shows_pay, posted_at desc);

-- The badge itself stays DERIVED (shows_pay and shift_pattern is not null)
-- rather than stored, so it can never drift from the data it describes.

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- "Job Employers" deliberately has NO policies and none should be added. It
-- holds employer emails, PECR consent records and lawful-basis flags. All access
-- is service role only, through API routes. Venue pages read employer fields
-- server-side, so they never need a public policy either.
alter table "Job Employers" enable row level security;
