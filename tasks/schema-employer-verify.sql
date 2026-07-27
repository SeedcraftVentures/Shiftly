-- Records when an employer proved control of their email by clicking a magic
-- link (to publish or to sign in). Feeds the lawful-basis story: a verified
-- email is a stronger basis for later contact than an unverified one, and it is
-- the anti-spam control that replaced the account gate on native posting.
--
-- Additive and nullable. Status: NOT YET APPLIED.

alter table "Job Employers"
  add column if not exists email_verified_at timestamptz;
