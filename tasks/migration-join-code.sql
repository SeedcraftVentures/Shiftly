-- ============================================================================
-- Shiftly, staff join-by-code: add a business join code to Organizations.
--
-- WHY: staff join their business by entering a short code in the Team app,
-- rather than by email matching. Hospitality staff often have no usable work
-- email, and "download the app, enter this code" is simpler and more robust.
-- One code per business (Organization); the manager can rotate it and sees who
-- has joined.
--
-- The code is generated lazily by the app the first time a manager opens the
-- invite panel, so this migration only needs to add the column (nullable) and a
-- uniqueness guarantee for when it is set.
-- ============================================================================

alter table "Organizations" add column if not exists join_code text;

-- Unique only among rows that actually have a code (nulls are fine and many).
create unique index if not exists organizations_join_code_key
  on "Organizations" (join_code)
  where join_code is not null;

-- Verify (optional):
--   select organization_id, organization_name, join_code from "Organizations";
