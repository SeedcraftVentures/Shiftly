# Scheduler review — function + holes

Covers `python-scheduler/scheduler.py` (the CP-SAT solver on Render) and the
orchestration in `app/api/generate-rota/route.js` that feeds it. Written 2026-08-31.

## What it does (function)

**Pipeline.** `/api/generate-rota` reads Teams, Staff, Shifts, Rules and approved
time off from Supabase, then for each team:
1. Expands each shift *pattern* into one concrete shift per day it runs (`route.js:201`).
2. Builds a per-staff payload: contracted/max hours, keyholder flag, `prefers_consistent`,
   and a **day-level** availability grid (`route.js:179`, `availabilityGrid` `:27`).
3. Sends `{staff, shifts, rules, weeks}` to the Python solver over HTTP, through a
   3-rung **relaxation ladder** (`solveLadder` `:229`): full constraints → relax
   (min_rest 0, max_consec 7) → zero out contracted hours. First rung that solves wins;
   if a rung relaxed anything the team is tagged `relaxed_teams`.
4. Multi-week runs solve all weeks in one call; if that fails it falls back to
   independent per-week solves (`:257`).
5. After every team builds: strips any assignment that lands on approved time off
   (`:285`), runs a **location-wide keyholder compliance check** across all teams
   (`:300`), and reports `relaxed_teams` / `skipped` / `time_off_conflicts`.

**The model (`solve_single_week`, `scheduler.py:163`).** Boolean var per (shift, staff).
- **Hard:** coverage `required ≤ assigned ≤ required+max_extra` (`:187`); availability
  (`:198`); keyholder-only on `keyholder_required` shifts *if* `enforce_keyholder`
  (`:210`, but the route sends it **off**, so inert); one shift per day per person
  (`:217`); no overlapping shifts (`:227`); no clopening / min-rest between adjacent
  days (`:237`); max consecutive days (`:260`); max weekly hours cap (`:299`).
- **Soft objective (`:460`):** contracted-hours shortfall ×30/min + overage ×3;
  overstaff ×60; **consistency ×30** (pin "same each week" staff); **keyholder-on-
  open/close ×25** (new); weekend rotation ×6; week-to-week variety ×8; plus fair
  distribution, keyholder-shift balance, grouped days off (weight 1).
- **Multi-week (`solve` `:489`):** solved **sequentially**, week by week. Each week gets
  the earlier weeks as fixed references for variety/consistency, and a running
  `weekend_counts` so weekend duty rotates.
- **Output:** assignments, `contract_issues`, stats. On no-solution, `_diagnose_failure`
  (`:570`) returns a human reason.

---

## Holes (ranked)

### HIGH

**H1 — Availability time-windows are dropped; only day-level is used.**
`availabilityGrid` (`route.js:29`) collapses `avail[d]` to `'available'`/`'unavailable'`
whether the value is `true` or a `[start,end]` window. A person available **Mon 09:00–13:00**
is marked available for **every** Monday shift, so the solver can assign them a Mon 17:00–22:00
close they can't work. The solver's `_is_staff_available` (`:78`) also only reads day-level.
→ *People scheduled outside the hours they said they can work.*

**H2 — Min-rest is not enforced across the week boundary, and multi-week weeks are independent.**
The clopening loop only pairs `day_order` Mon→Sun (`:242`); Sunday→Monday is never checked,
and multi-week solves each week separately, so a Sun-night close in week 1 and a Mon-morning
open in week 2 can violate rest. → *Clopening across the week seam.*

**H3 — Min-rest relies on heuristic open/close thresholds, so it's dead for daytime businesses.**
Rest is only checked between a shift `_is_closing_shift` (`end ≥ 22:00`, `:50`) and a next-day
`_is_opening_shift` (`start ≤ 08:00`, `:56`). A shop that closes 18:00 and opens 08:00 next day
(14h, fine) is never checked — but neither is close 21:00 → open 07:00 (10h < 11h), because 21:00
isn't "closing." → *`min_rest_hours` silently does nothing for most non-late-night venues.*

**H6 — Multi-week time off creates uncovered gaps the solver never tried to fill.**
For multi-week, time off is stripped **after** solving (`route.js:285`) because one availability
grid can't say "off week 2 only." The solver counted those shifts toward coverage and the
person's hours, so after removal the day is short-staffed and the person may be under contract —
with no attempt to reassign. → *Silent coverage holes on weeks with approved leave.*

### MEDIUM

**H17 — Breaks are ignored in all hours math.** Shift duration is gross `end − start`
(`:29`); the solver payload carries no break data (`route.js:207`). Contracted-hours targets
and the max-hours legal cap both use gross hours, so paid hours are overcounted and the 48h
cap is looser than reality. → *Payroll/WTD inaccuracy.*

**H8 — Salaried/annualised staff (contracted_hours = 0) get no hours target.** They're skipped
from the shortfall objective (`:301`) and from `contract_issues` (`:535`); only fair-distribution
gives them shifts. → *Salaried staff can be badly under- or over-scheduled with no signal.*

**H14 — Total solve time is unbounded and the passed timeout is dead.** `solve(timeout_seconds=60)`
never uses the arg; each week is hardcoded to 25s (`:472`) and runs sequentially, so a 4-week
build can take ~100s of solve on top of Render's cold start — risking an HTTP timeout on the
larger builds the ladder needs most.

**H5 — Keyholder optimisation is per-team but the concern is location-wide.** Even with the new
soft term, each team only sees its own keyholders; the honest cross-site placement only happens
in the post-hoc check (`route.js:300`). A team without its own keyholder always books a
keyholder-miss internally. → *Sub-optimal keyholder placement across teams; occasional
warnings that a human reads as "the solver failed."*

**H7 — Extra-body top-up is coarse.** `max_extra_per_shift` defaults to 1, so a day needing two
extra bodies to hit contract can't get them; and because a whole extra body (penalty 60) clears
up to 480 min×30 of shortfall, the solver will add a full 8h body to erase even ~30 min of
shortfall. → *Either can't reach contract, or over-staffs to chase a tiny shortfall.*

**H18 — No role/skill matching.** Any available person can fill any shift; role is ignored.
Fine if every team member is interchangeable, wrong the moment a shift needs a specific skill
(bar vs kitchen vs till). → *Wrong-skill assignments where roles matter.*

**H16 — Contract "overage" is reported as an issue.** Any staff >1h over contract is flagged
"Max hours cap exceeded contracted hours" (`:552`) — including when the solver deliberately
added coverage. → *Noisy warnings that look like errors.*

### LOW / by-design

- **H4** Sequential (greedy) multi-week solve — tractable but not globally optimal across weeks.
- **H9** No split shifts (one-shift-per-day forbids them).
- **H11** Weekend fairness is cross-week only, none within a single week.
- **H12** Variety pushes difference even when repeating would be fairer (watch the new ×8).
- **H13** No "at least one day off", no max-shifts-per-week beyond consecutive-days.

---

## Suggested priority

1. **H1** (availability windows) and **H3/H2** (real rest) — these two make the rota
   *wrong* rather than merely suboptimal; both need the payload to carry time windows /
   real gaps and the solver to compare actual times.
2. **H6** (multi-week time-off gaps) — reassign or at least flag the coverage hole.
3. **H17** (breaks) and **H8** (salaried targets) — accuracy of the numbers the product sells.
4. **H14** (time budget) — reliability of big builds.
5. The rest as tuning/UX polish.
