-- ============================================================================
-- Shiftly — schema ADDITIONS for the data-layer migration (NOT in live prod yet)
-- Run this AFTER tasks/schema.sql on the demo/dev clone.
-- These are the gaps the new schema is missing; each must also be applied to
-- PROD before the migrated app can run there (separate, tracked step).
-- ============================================================================

-- Wave 3 — store the actual generated rota assignments (who works which shift/day).
-- The live "Rotas" table holds metadata only; this is where the schedule lives.
create table if not exists "Rota Assignments" (
  assignment_id uuid        not null default gen_random_uuid() primary key,
  rota_id       uuid        not null references "Rotas"(rota_id) on delete cascade,
  shift_id      uuid        not null,   -- → "Shift Patterns".shift_id
  staff_id      uuid        not null,   -- → "Staff".staff_id
  work_date     date        not null,   -- absolute date of this shift instance
  week          integer     not null default 1,  -- 1-based week index within the rota
  created_at    timestamptz not null default now()
);
create index if not exists idx_rota_assignments_rota  on "Rota Assignments" (rota_id);
create index if not exists idx_rota_assignments_staff on "Rota Assignments" (staff_id);

-- Wave 2 — the Rules page manages more solver settings than "Location Rules" has typed
-- columns for (enforce_keyholder, balance_keyholder_shifts, prefer_consecutive_days_off,
-- fair_distribution...). Store the full rule object as JSON here; the typed columns are
-- kept in sync where they overlap, and the scheduler reads this object directly.
alter table "Location Rules" add column if not exists solver_rules jsonb;

-- Wave 2d — manager-entered staff availability as per-day windows, stored as JSON keyed by
-- day index (0=Mon): { "0": true (all day) | [start,end] (decimal hours) | absent (not available) }.
-- (The normalized "Staff Availability"/"Staff Availability Rules" tables stay for the future
-- employee-app per-shift flow; this column is the manager-entered source the rota reads.)
alter table "Staff" add column if not exists availability jsonb default '{}'::jsonb;

-- Wave 3 follow-up — a human name for a rota (the Rota Builder lets you name it).
alter table "Rotas" add column if not exists name text;

-- Wave 3 follow-up — custom one-off shifts added directly on the rota grid.
-- shift_id becomes nullable (a custom shift has no Shift Pattern); custom_* hold its
-- name/times. Save/reload, payroll and reporting all read custom_* when shift_id is null.
alter table "Rota Assignments" alter column shift_id drop not null;
alter table "Rota Assignments" add column if not exists custom_start timetz;
alter table "Rota Assignments" add column if not exists custom_end   timetz;
alter table "Rota Assignments" add column if not exists custom_name  text;

-- Wave 4 — pay model. `wage` stays the HOURLY rate; these add the other bases.
-- pay_basis: 'hourly' (uses wage), 'salary' (annual_salary, fixed regardless of hours),
-- 'annualised' (annual_salary spread over annualised_hours contracted per year).
alter table "Staff" add column if not exists pay_basis text not null default 'hourly';
alter table "Staff" add column if not exists annual_salary numeric;
alter table "Staff" add column if not exists annualised_hours numeric;

-- Wave 6 (mocked billing) and Wave 5 (notifications/requests id-type fixes) additions
-- will be appended here in their respective waves.
