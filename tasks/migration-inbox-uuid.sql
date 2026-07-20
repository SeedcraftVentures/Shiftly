-- ============================================================================
-- Shiftly — Inbox (Wave 5) migration: fix BIGINT foreign-key columns to UUID
--
-- WHY: "Notifications" and "Requests" carry team_id / staff_id / shift_id
-- columns typed as BIGINT, but the entities they reference — "Teams".team_id,
-- "Staff".staff_id, "Shift Patterns".shift_id — are UUID. As-is these tables
-- cannot be joined to the rest of the schema, so the Inbox cannot resolve who a
-- request is from or which team/shift it concerns. This aligns the types.
--
-- SAFETY: All affected columns are NULLABLE and these tables are expected to be
-- EMPTY (the requests/notifications feature was stubbed out in commit 2ffa921
-- and nothing has written to them since). BIGINT values do not cast to UUID and,
-- being ids from the OLD flat schema, would be meaningless against the new UUID
-- entities anyway — so the type change nulls them, which is the correct outcome.
--
-- `related_id` (Notifications) is deliberately LEFT as BIGINT: it points at
-- "Requests".id, which is a BIGINT identity PK, so it already matches.
--
-- ── STEP 1: Pre-flight — run this SELECT first. ──────────────────────────────
-- If either count is > 0, you have existing rows whose FK columns will be set to
-- NULL by this migration. Given the feature was inactive that is expected, but
-- eyeball them before proceeding if you want to be certain.
--
--   select 'Notifications' as tbl, count(*) from "Notifications"
--   union all
--   select 'Requests', count(*) from "Requests";
--
-- ── STEP 2: Apply the type changes (transactional — all or nothing). ─────────
begin;

alter table "Notifications"
  alter column team_id            type uuid using null::uuid,
  alter column recipient_staff_id type uuid using null::uuid,
  alter column sender_staff_id    type uuid using null::uuid;

alter table "Requests"
  alter column team_id            type uuid using null::uuid,
  alter column staff_id           type uuid using null::uuid,
  alter column shift_id           type uuid using null::uuid,
  alter column swap_with_staff_id type uuid using null::uuid;

commit;

-- ── STEP 3: Verify (optional). Expect data_type = 'uuid' for every row. ──────
--
--   select table_name, column_name, data_type
--   from information_schema.columns
--   where table_name in ('Notifications','Requests')
--     and column_name in ('team_id','staff_id','shift_id','swap_with_staff_id',
--                         'recipient_staff_id','sender_staff_id')
--   order by table_name, column_name;
--
-- ── STEP 4: Enable Realtime for the notification bell (run once). ────────────
-- The NotificationBell subscribes to INSERTs on "Notifications". Supabase only
-- streams tables that are in the supabase_realtime publication. Without this the
-- bell still works via fetch, but new notifications won't appear live.
--
--   alter publication supabase_realtime add table "Notifications";
--
-- (If it errors with "already member of publication", it's already enabled.)
-- ============================================================================
