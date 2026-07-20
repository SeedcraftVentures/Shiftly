-- ============================================================================
-- Shiftly — Row Level Security
--
-- WHY THIS IS URGENT: with RLS disabled, the anon key (which ships inside the
-- browser bundle and is readable by anyone) had full SELECT/INSERT/UPDATE/DELETE
-- on every table. Verified 2026-07-20: an anonymous caller could read
-- Staff.name, wage, annual_salary, invite_email and availability, and could
-- delete rows from "Job Listings".
--
-- MODEL: every API route uses the service-role key, which BYPASSES RLS. So
-- "enable RLS, write no policy" = fully closed to the public, fully open to the
-- app. Policies are then added back deliberately, only where public access is
-- actually wanted (the jobs board).
--
-- PREREQUISITE (already done in code): four routes previously used the anon
-- client server-side and would have broken. They now import supabaseAdmin:
--   app/api/teams/[team-id]/template/route.js
--   app/api/teams/[team-id]/template/coverage/route.js
--   app/api/teams/[team-id]/template/sync-shifts/route.js
--   app/api/user-settings/route.js
-- ============================================================================

-- ── 1. Close everything ─────────────────────────────────────────────────────
-- Loop rather than a hand-written list so nothing is missed, including tables
-- added later. Re-running this is harmless.
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ── 2. Reopen only what must be public ──────────────────────────────────────
-- The jobs board is a public, unauthenticated page: anonymous visitors must be
-- able to read live listings. Expired/removed rows stay hidden, and there is no
-- insert/update/delete policy, so writes remain service-role only.
drop policy if exists "public read of live job listings" on "Job Listings";
create policy "public read of live job listings"
  on "Job Listings"
  for select
  to anon, authenticated
  using (status = 'live');

-- "Job Employers" gets NO policy on purpose. It holds employer email addresses
-- and PECR marketing-consent records, so it must never be publicly readable.
-- The board renders employer NAME from "Job Listings".employer_name instead.

-- ── 3. Verify ───────────────────────────────────────────────────────────────
-- Every table should report rowsecurity = true.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by rowsecurity, tablename;

-- Should return exactly one row: the public read policy above.
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public';
