-- Shared-store rate limiting for the public job-board endpoints.
--
-- Vercel serverless functions do not share memory reliably (separate instances,
-- cold starts), so an in-memory limiter gives false confidence. This uses the
-- database everything already talks to. One atomic function does the whole
-- check-and-increment in a single statement, so concurrent requests cannot race
-- past the limit.
--
-- Status: NOT YET APPLIED.

create table if not exists "Rate Limits" (
  bucket        text        primary key,   -- e.g. "post:ip:1.2.3.4" or "login:email:x@y.com"
  count         integer     not null default 0,
  window_start  timestamptz not null default now()
);

-- Service role only, like the rest of the board's private tables. No policies.
alter table "Rate Limits" enable row level security;

-- Returns { allowed, count, limit, reset_at }. Fixed window: the first request
-- in a window stamps window_start, later ones increment, and once the window has
-- elapsed the counter resets on the next call. Atomic via a single upsert.
create or replace function jobs_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns jsonb
language plpgsql
as $$
declare
  v_count        int;
  v_window_start timestamptz;
  v_now          timestamptz := now();
  v_expired      boolean;
begin
  insert into "Rate Limits" (bucket, count, window_start)
  values (p_bucket, 1, v_now)
  on conflict (bucket) do update
    set count = case
          when "Rate Limits".window_start < v_now - make_interval(secs => p_window_seconds)
          then 1
          else "Rate Limits".count + 1
        end,
        window_start = case
          when "Rate Limits".window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
          else "Rate Limits".window_start
        end
  returning count, window_start into v_count, v_window_start;

  return jsonb_build_object(
    'allowed',  v_count <= p_limit,
    'count',    v_count,
    'limit',    p_limit,
    'reset_at', v_window_start + make_interval(secs => p_window_seconds)
  );
end;
$$;

-- Old rows are harmless (they just get reset in place), but a periodic cleanup
-- keeps the table small. Called from the ingest sweep.
create or replace function jobs_rate_limit_gc(p_older_than_seconds int default 86400)
returns int
language plpgsql
as $$
declare v_deleted int;
begin
  delete from "Rate Limits"
  where window_start < now() - make_interval(secs => p_older_than_seconds);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
