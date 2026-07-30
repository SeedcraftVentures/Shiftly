-- Shiftly, staff join-by-code: add a business join code to Organizations.
-- Staff join their business by entering this short code in the Team app instead
-- of by email. One code per business; the manager can rotate it and sees who has
-- joined. Both statements are idempotent, so re-running is safe.

alter table "Organizations" add column if not exists join_code text;

create unique index if not exists organizations_join_code_key
  on "Organizations" (join_code)
  where join_code is not null;
