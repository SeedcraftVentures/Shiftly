-- ============================================================================
-- Shiftly — faithful replica of the LIVE production schema (pulled 2026-06-12)
-- Run this in a NEW Supabase project's SQL Editor to create the demo/dev clone.
-- Structure only (no data). Foreign keys are intentionally omitted so demo data
-- can be seeded in any order; the app does manual joins, so FKs aren't required.
--
-- NOTE on pre-existing inconsistencies in the live schema (replicated as-is,
-- NOT "fixed" here so the clone matches prod exactly):
--   * Notifications.team_id / Requests.team_id / Requests.staff_id are BIGINT,
--     but Teams.team_id and Staff.staff_id are UUID. Flagged for the migration.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Enums ───────────────────────────────────────────────────────────────────
create type "Days" as enum ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday');
create type "Industry" as enum ('Hospitality','Retail','Other');
create type "Invite Status" as enum ('Not Invited','Pending','Accepted');
create type "Rota Status" as enum ('Draft','Published','Archived');
create type "Shift Type" as enum ('Open','Close','Fixed');
create type "Staff Availability Preference Rule" as enum ('Always','Prefers','Never');
create type "Staff Availability Shift Type Rule" as enum ('Open','Close','Any');
create type "Staff Shift Availability" as enum ('Yes','No','Preferred');

-- ── Organizations (keyed by Clerk Organization ID) ──────────────────────────
create table "Organizations" (
  organization_id      text    not null primary key,
  industry             text    not null,
  organization_name    text    not null,
  onboarding_completed boolean,
  currency             text    not null default 'GBP'
);

-- ── Locations (the BILLABLE unit) ───────────────────────────────────────────
create table "Locations" (
  location_id           uuid              not null default gen_random_uuid() primary key,
  name                  text              not null,
  organization_id       text              not null,
  shift_lengths         double precision[] not null,
  min_wage              numeric,
  address               text              not null,
  max_consecutive_hours smallint          not null default 12,
  currency              text              default 'GBP',
  holiday_year_basis        text     not null default 'calendar', -- 'calendar' | 'financial' | 'custom'
  holiday_year_start_month  smallint not null default 1,          -- 1-12 (calendar=1, financial=4)
  holiday_entitlement_weeks numeric  not null default 5.6,        -- UK statutory default
  sick_paid_days            numeric                               -- null = track only
);

create table "Location Day Hours" (
  location_id  uuid   not null,
  start_time   timetz not null,
  end_time     timetz not null,
  opening_time timetz not null,
  closing_time timetz not null,
  day          "Days" not null,
  row_id       uuid   not null default gen_random_uuid() primary key
);

create table "Location Rules" (
  location_id                  uuid     not null primary key,
  no_clopening                 boolean  not null default true,
  no_double_shifts             boolean  not null default true,
  fair_weekend_distribution    boolean  not null default true,
  enforce_max_consecutive_days boolean  not null default true,
  max_consecutive_days         smallint not null default 6,
  enforce_min_days_off         boolean  not null default true,
  min_days_off                 smallint not null default 1,
  enforce_rest_between_shifts  boolean  not null default true,
  min_rest_hours               smallint not null default 11
);

-- ── Teams (belong to a Location; unlimited per location) ─────────────────────
create table "Teams" (
  team_id     uuid        not null default gen_random_uuid() primary key,
  name        text        not null,
  location_id uuid        not null,
  created_at  timestamptz not null default now()
);

create table "Team Day Hours" (
  row_id              uuid   not null default gen_random_uuid() primary key,
  team_id             uuid   not null,
  start_time_override timetz,
  end_time_override   timetz,
  day                 "Days" not null
);

-- ── Staff (belong to a Team) ────────────────────────────────────────────────
create table "Staff" (
  staff_id               uuid              not null default gen_random_uuid() primary key,
  user_id                text,
  role                   text,
  team_id                uuid              not null,
  max_hours              integer           not null,
  contracted_hours       integer           not null,
  wage                   numeric           not null,
  invite_status          "Invite Status"   not null default 'Not Invited',
  preferred_shift_lengths double precision[] not null,
  is_keyholder           boolean           not null default false,
  name                   text              not null,
  invite_email           text,
  holiday_entitlement_weeks_override numeric  -- null = inherit the location default
  -- NOTE: live Staff also has availability(jsonb), pay_basis, annual_salary, annualised_hours (not reflected above)
);

create table "Staff Availability" (
  id         uuid        not null default gen_random_uuid() primary key,
  staff_id   uuid        not null,
  shift_id   uuid        not null,
  day        integer     not null,
  status     text        not null,
  created_at timestamptz not null default now()
);

create table "Staff Availability Rules" (
  id         uuid                                  not null default gen_random_uuid() primary key,
  staff_id   uuid                                  not null,
  preference "Staff Availability Preference Rule"  not null,
  shift_type "Staff Availability Shift Type Rule"  not null,
  day_scope  text                                  not null,
  shift_id   uuid,
  created_at timestamptz                           not null default now()
);

-- ── Shift Patterns (belong to a Team via shift_team) ────────────────────────
create table "Shift Patterns" (
  shift_id        uuid         not null default gen_random_uuid() primary key,
  shift_name      text         not null,
  shift_team      uuid         not null,
  shift_type      "Shift Type" not null,
  start_time      timetz       not null,
  end_time        timetz       not null,
  days            "Days"[]     not null,
  break_duration  double precision not null,
  break_is_paid   boolean      not null,
  is_keyholder    boolean      not null,
  num_staff_needed integer     not null
);

-- ── Rotas (per Location, per week) ──────────────────────────────────────────
create table "Rotas" (
  rota_id      uuid          not null default gen_random_uuid() primary key,
  location_id  uuid          not null,
  week_start   date          not null,
  status       "Rota Status" not null default 'Draft',
  generated_at timestamptz,
  published_at timestamptz,
  published_by text,
  notes        text
);

-- ── Notifications / Requests / Pending Onboardings ──────────────────────────
create table "Notifications" (
  id                 bigint generated by default as identity primary key,
  recipient_user_id  text    not null,
  recipient_staff_id bigint,
  team_id            bigint,
  sender_staff_id    bigint,
  type               text    not null,
  title              text    not null,
  message            text,
  related_id         bigint,
  related_type       text,
  read               boolean default false,
  created_at         timestamptz default now(),
  sender_user_id     text
);

create table "Requests" (
  id                 bigint generated by default as identity primary key,
  user_id            text    not null,
  team_id            bigint,
  staff_id           bigint,
  type               text    not null,
  status             text    not null default 'pending',
  start_date         date,
  end_date           date,
  shift_date         date,
  shift_id           bigint,
  swap_with_staff_id bigint,
  reason             text,
  manager_notes      text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  resolved_at        timestamptz,
  resolved_by        text,
  direction          text    not null default 'incoming'
);

create table "Pending Onboardings" (
  clerk_user_id text        not null primary key,
  payload       jsonb       not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
