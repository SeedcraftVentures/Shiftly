-- ============================================================================
-- Shiftly Jobs — UK hospitality job board (/jobs)
--
-- Deliberately a SEPARATE file from schema-additions.sql: the jobs board is
-- independent of the data-layer migration (own tables, public reads, no org
-- scoping), so it can be applied to prod on its own schedule.
-- ============================================================================

-- Employers who post natively (the funnel). Aggregated listings have no row here.
create table if not exists "Job Employers" (
  employer_id      uuid        not null default gen_random_uuid() primary key,
  organization_id  text,                 -- → "Organizations".organization_id once they convert
  clerk_user_id    text,                 -- who created it (posting is account-gated)
  name             text        not null,
  email            text        not null,
  venue_type       text,
  town             text,
  website          text,
  logo_url         text,
  -- PECR: marketing consent must be a separate, unticked opt-in, never bundled
  -- into T&Cs acceptance. Sole traders/partnerships are treated as individuals.
  marketing_consent boolean    not null default false,
  consent_at       timestamptz,
  folk_company_id  text,                 -- set once synced to Folk CRM
  folk_synced_at   timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists idx_job_employers_email on "Job Employers" (lower(email));

-- Every listing, aggregated or native.
create table if not exists "Job Listings" (
  listing_id       uuid        not null default gen_random_uuid() primary key,

  -- Provenance. `source` = 'smartrecruiters' | 'adzuna' | 'reed' | 'native'.
  -- `attribution` holds any required display credit (e.g. "Jobs by Adzuna").
  source           text        not null,
  source_id        text        not null,
  source_url       text,
  attribution      text,

  title            text        not null,
  role_category    text,                 -- classified: bar|kitchen|kp|waiting|barista|host|supervisor|management|housekeeping|other
  employer_name    text        not null,
  employer_id      uuid        references "Job Employers"(employer_id) on delete cascade,
  brand            text,                 -- e.g. "Hungry Horse" — sub-brand within a group
  venue_type       text,                 -- pub|bar|restaurant|cafe|hotel|qsr|nightclub|catering|bakery|other

  city             text,                 -- council/city grain: "Glasgow", not "Hillhead"
  locality          text,                -- finer place for display only, never filtered on
  region           text,
  postcode         text,
  lat              numeric,
  lng              numeric,

  -- Recruitment agencies advertise heavily in hospitality. Their listings are fine
  -- for jobseekers but they don't run a rota, so they're excluded from the Folk
  -- sync and from employer outreach.
  is_agency        boolean     not null default false,

  contract_type    text,                 -- full_time|part_time|casual|seasonal|temp
  pay_min          numeric,
  pay_max          numeric,
  pay_period       text,                 -- hourly|annual
  pay_is_estimated boolean     not null default false,

  -- NOT present in any aggregator/ATS feed — only native posters can set it.
  -- Stays null on aggregated rows, which the shift-pattern filter excludes.
  shift_pattern    text[],               -- days|evenings|weekends|split
  experience_level text,                 -- none|some|experienced

  description      text,
  apply_url        text,
  is_native        boolean     not null default false,
  slug             text        not null,

  posted_at        timestamptz,
  expires_at       timestamptz,
  status           text        not null default 'live',  -- live|expired|removed

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Idempotent re-ingest: a source's own id is the natural key.
create unique index if not exists idx_job_listings_source  on "Job Listings" (source, source_id);
create unique index if not exists idx_job_listings_slug    on "Job Listings" (slug);
create index        if not exists idx_job_listings_status  on "Job Listings" (status);
create index        if not exists idx_job_listings_city    on "Job Listings" (lower(city));
create index        if not exists idx_job_listings_role    on "Job Listings" (role_category);
create index        if not exists idx_job_listings_posted  on "Job Listings" (posted_at desc);
