-- Industry partition for the two-industry board (hospitality + retail).
--
-- Every listing is tagged hospitality | retail | other. 'other' rows are kept in
-- the table (aggregated rows are cheap to re-ingest, and a native draft could be
-- mid-edit) but are never shown: the query layer only surfaces hospitality and
-- retail. This is the column the /jobs/hospitality and /jobs/retail boards, the
-- industry toggle, and the town pages all filter on.
--
-- Additive and defaulted. Status: NOT YET APPLIED.

alter table "Job Listings"
  add column if not exists industry text not null default 'other';

-- The board reads by industry constantly once the two boards exist.
create index if not exists idx_job_listings_industry
  on "Job Listings" (industry, status, posted_at desc);

-- Native posters declare their own industry on the post form, so Job Employers
-- can carry a default to pre-fill and to segment outreach by sector.
alter table "Job Employers"
  add column if not exists industry text;
