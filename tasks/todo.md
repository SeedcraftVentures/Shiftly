# Shiftly Rebuild — Demo-Readiness Plan (branch: shiftly-rebuild)

> Status: **PLAN — awaiting approval before any code is written.**
> All work happens on `shiftly-rebuild`. `main` is left untouched for the business partner.
> Full diagnostic done 2026-06-12 via 7 parallel audits + manual verification of the load-bearing claims.

## Diagnostic summary (verified by reading source, not assumed)

**What works today (leave alone):** onboarding + `OnboardingTour` (9-step), Staff page, Shifts page
(inline rows, keyholder, anchoring, availability, micro-rules — all persist to Supabase), navigation,
reports/payroll API wiring (reads real data — but has nothing to read until Generate works).

**What's broken:** the Rota Builder "Generate" button. It is the heart of the app and it cannot
produce a rota today. Three independent bugs in one chain, each fatal on its own. NOTE: the prior R2
todo (Prompt 6, "No field name mismatches") was wrong — the pipeline was never tested end-to-end
against the live Render scheduler.

---

## Environment & Demo DB (decided 2026-06-12)

- **Demo DB:** clone the existing Supabase project (exact schema). Schema-only clone preferred
  (clean demo data, no prod data leakage). Owner/dev runs the clone — I have no DB access.
- **Hosting:** Vercel (live preview deploy of `shiftly-rebuild`), NOT local. `netlify.toml` in repo is
  stale and should be removed in cleanup.
- **Scheduler:** Python OR-Tools service is stateless/DB-agnostic — reuse the same Render URL, no clone.
- **Env vars the demo Vercel project needs** (point all Supabase ones at the CLONE):
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (all 3 used)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (reuse existing Clerk app or separate)
  - `NEXT_PUBLIC_APP_URL` = demo Vercel URL; `PYTHON_SCHEDULER_URL` optional (defaults to Render)
  - Optional/skippable for core demo: Stripe keys, `RESEND_API_KEY`
- **LOCAL DEV (decided 2026-06-12):** develop + verify on `npm run dev` FIRST; no deploy until perfect.
  - `.env.local` restructured: live `pk_live`/`sk_live` Clerk keys commented out (they cannot run on
    localhost), dev placeholders added. Owner must paste: Clerk **test** keys (Development instance) +
    Supabase keys pointing at the **demo clone** (the clone is now the dev DB too) + localhost APP_URL.
  - Dev test path: sign up (fresh dev user) → onboard → add staff → add shifts → Rota Builder → Generate.
  - Render scheduler is free-tier (cold start 30-60s on first call) — retry once if first Generate stalls.
- **Verification model:** dev server against the clone first; Vercel deploy only once it works locally.
- **Latent inconsistency (note, not blocking):** `api/staff/[id]` and `api/payroll/*` use the ANON key
  server-side instead of the service-role key — subject to RLS. Flag if those routes misbehave on the clone.

---

## Workstream 1 — Fix the Rota Builder chain  [CRITICAL, do first]

File: `app/api/generate-rota/route.js` (+ confirm against `python-scheduler/scheduler.py`)

- [ ] **Bug 1 — shifts never reach the scheduler.** Line 91 reads `shift.day_of_week` (singular);
      the DB column is `days_of_week` (plural, stores full names e.g. "Monday" — verified
      `app/api/shifts/route.js:9,64`). Fix: rename `shift.day_of_week` → `shift.days_of_week`.
      One-word change; the `.includes(dayName)` check then matches the generator's day loop (line 88).
- [ ] **Bug 2 — rules never applied.** Lines 59-67 read constraints from a separate `Rules` table
      (almost certainly empty) and reshape to a list. Source of truth is `Teams.solver_rules`
      (decided). `teamsData` already has it (`select('*')`, line 42) and `teamRecord` is already
      computed (line 113). Fix: drop the `Rules` Promise from the `Promise.all` (lines 59-67),
      delete `formattedRules` (lines 202-207), and set `rules: teamRecord.solver_rules || {}` in
      `schedulerInput` (line 212). Python's `_rule()` reads a plain dict (scheduler.py:61-62) and the
      keys already match EXACTLY (enforce_keyholder, min_rest_hours, max_consecutive_days,
      fair_distribution, prefer_consecutive_days_off, balance_keyholder_shifts) — verified. No reshape.
- [ ] **Bug 3 — response handling crashes (the actual 500).** Python returns a flat
      `{ assignments: [...] }` (scheduler.py:443-453), but lines 316-317 & 352-354 iterate
      `teamResult.schedule` → `weekData.shifts`, which don't exist. Fix: rewrite the merge loop to
      consume the flat `assignments` array. Each item already has `week, shift_name, day, start_time,
      end_time, staff_name` — map directly into `combinedSchedule` (drop the nested week/shift loop).
      Apply the same change to the hours-report loop (lines 349-364).
- [ ] Also surface real scheduler failures: Python can return `{ success:false, error }` (200 OK).
      The route's failure filter (line 270) checks `!r.success` but the route never early-returns on a
      false `success` from a single team. Add a guard so a solver "infeasible" shows the diagnostic
      instead of a blank rota.

### DONE 2026-06-12 (code) — all three fixes applied to `app/api/generate-rota/route.js`
- [x] Bug 1: `shift.day_of_week` → `shift.days_of_week`
- [x] Bug 2: dropped empty `Rules` table query; `rules: teamRecord.solver_rules || {}` passed through (keys match Python, no reshape)
- [x] Bug 3: schedule-merge AND hours-report loops rewritten to consume flat `assignments` array
- [x] Compile clean (`✓ Compiled successfully`). Full `npm run build` can't finish locally — unrelated
      stripe/locales/employee routes throw at page-data collection due to no local Supabase/Stripe creds
      (pre-existing env gap; passes on Vercel). generate-rota is NOT among the failures.
- NOTE: scheduler returns no `rule_compliance` field, so the RulesCompliance panel stays empty — not a
  crash, just nothing to show. Revisit only if owner wants compliance reporting.

**Verify (per CLAUDE.md — prove it works) — PENDING Vercel preview + demo clone:**
- [ ] `npm run build` passes (on Vercel with env vars).
- [ ] With a real team that has staff + synced shifts, click Generate → confirm a populated rota
      renders in `RotaScheduleGrid` (no 500, no NaN/undefined).
- [ ] Toggle a rule (e.g. min_rest_hours) and confirm the generated rota changes accordingly.
- [ ] Approve the rota → confirm it saves to `Rotas` and appears on the dashboard.

---

## Workstream 2 — Stop demo clicks landing in stale UI  [HIGH]

The sidebar correctly points to the new `/dashboard/{staff,shifts,rules}` pages, but the dashboard
HOME quick-actions/stat-cards still deep-link to the OLD `/dashboard/workspace?tab=...` surface.

- [ ] `app/(auth)/dashboard/page.js`: repoint "Manage Staff" → `/dashboard/staff`,
      "Edit Templates" → `/dashboard/shifts` (or templates surface), coverage card → `/dashboard/staff`.
- [ ] Decide fate of `/dashboard/workspace` (old StaffShiftsSection/TemplatesSection/Rules/Settings):
      keep as hidden fallback, or remove route. Recommend: remove links now, delete route in WS4.

**Verify:** click every dashboard-home link → all land on the new pages.

---

## Workstream 3 — Confirm reports/payroll light up  [MEDIUM, mostly verification]

Already wired to real data (reads approved `Rotas.schedule_data` + staff rates). Expected to work
once WS1 produces a saved rota.

- [ ] After approving a generated rota, open Reports + Payroll → confirm hours show.
- [ ] Set a staff pay rate → confirm labour cost computes (cost is £0 only when no rate set, by design).
- [ ] Note (not blocking): reports match staff by NAME not ID — fine for demo, flag for later.

---

## Workstream 4 — Delete dead code  [LOW, do last, after green]

Confirmed orphaned (never imported anywhere reachable). Delete only after WS1-3 verified:
- [ ] `app/api/generate-rota-ortools/route.js` (unused duplicate of the working route)
- [ ] `app/components/workspace/{StaffSection,StaffTable,StaffModal,ShiftsSection,HoursComparison}.js`
- [ ] `app/components/template/{ShiftLengthPicker,TemplateTabs}.jsx`
- [ ] `app/components/employee/{CalendarRangePicker,EmployeeRotaView,RequestsList}.js`
- [ ] `app/components/{PillTabs,PricingSection,TeamSetupSuccess,logo}.js(x)`
- [ ] Re-run build after deletion to confirm nothing referenced them.

---

## Descoped (per owner decision, 2026-06-12)
- **Onboarding seeding** — leaving as-is. Staff/shifts will be added manually during the demo.
  (Onboarding currently creates only the Team row; no staff/shifts/templates are seeded.)

## Open risks
- The Render scheduler URL is a hardcoded fallback (`route.js:55`); no `PYTHON_SCHEDULER_URL` in
  `.env.local`. If that free Render instance is cold/down, Generate fails with no local fallback.
  Confirm the service is reachable before the demo.

---
---

# Shiftly V4 R2 — Task Tracker

## Execution Order: 6 → 3 → 2 → 4 → 5 → 1 → 7 → 8 → 9

---

## Prompt 6: Rota Builder — Data Fix + Template Preview ✅

### Step 1: Audit (subagent) - DONE
- [x] OR-Tools expects: { staff, shifts, rules, weeks } with AM/PM availability
- [x] Frontend sends: { startDate, weekCount, team_id, showAllTeams } to generate-rota route
- [x] sync-shifts writes: shift_name, day_of_week, start_time (HH:MM), end_time (HH:MM), staff_required
- [x] No field name mismatches; availability_grid priority was the main fix

### Step 2: Fix data pipeline - DONE (prior session)
- [x] availability_grid now preferred over legacy availability field
- [x] No remaining field name mismatches

### Step 3: Add template preview - DONE
- [x] Visual WeekOverview (vertical, compact, readOnly) below team selector
- [x] Shows Mon-Sun shift bars using shared getBlockColor()
- [x] Shows "Needed: Xh / week" total + "Edit in Workspace →" link

### Step 4: Pre-generation validation - DONE
- [x] Checks: templates configured, active days exist, staff exist, coverage >= 80%
- [x] Each error has code prefix for actionable routing

### Step 5: Error diagnostics - DONE
- [x] Error codes parsed → action links (Go to Templates / Go to Staff & Shifts)
- [x] Scheduler diagnostics show suggestions + dual action links
- [x] Build passes

### Files modified:
- `app/api/generate-rota/route.js` — availability_grid priority (prior session)
- `app/components/rota/RotaConfigPanel.jsx` — visual template preview with WeekOverview
- `app/(auth)/dashboard/generate/page.js` — pre-generation validation with error codes
- `app/components/rota/RotaAlerts.jsx` — error code parsing, action links, scheduler diagnostics

---

## Prompt 3: Keyholder Coverage Warning

### Audit - DONE
- [x] Staff field: `keyholder` (boolean)
- [x] No per-shift keyholder flag — inferred from timing (open/close shifts)
- [x] Coverage calc already exists in StaffShiftsSection.jsx (lines 92-145)
- [x] CoverageGauge already renders keyholder warnings

### Implementation - DONE
- [x] CoverageGauge already shows "Coverage gaps" when keyholder warnings present
- [x] Added keyholder pre-gen check to handleGenerate
- [x] KEYHOLDER error code routes to "Go to Staff & Shifts" in RotaAlerts
- [x] Build compiles successfully

## Prompt 2: Staff Card Collapsed Layout ✅

### Implementation - DONE
- [x] Rewrote collapsed card with structured column layout
- [x] Columns: Avatar | Name+email | h/wk | max | £/hr | 🔑 | slots ▼ | → chevron
- [x] Column headers: `text-[10px] text-gray-400 font-medium` above values
- [x] Values: `text-sm font-semibold text-gray-900`
- [x] Keyholder moved to own column after Rate
- [x] Availability styled as clickable trigger with hover:bg + chevron
- [x] Expand chevron (→) on far right
- [x] Build compiles successfully

### Files modified:
- `app/components/workspace/StaffShiftsSection.jsx` — collapsed card rewrite (lines 509-578)

## Prompt 4: Template Cards — Shift Bar Visual Fix + Save & Sync Placement ✅

### Audit - DONE
- [x] ShiftMiniPreview uses `getShiftBlockColor(shift.length, shiftLengths)` — color by duration (correct)
- [x] WeekOverview uses `getBlockColor(i)` — color by array position (inconsistent)
- [x] Save & Sync visible on BOTH tabs — should be Weekly Schedule only

### Implementation - DONE
- [x] WeekOverview: replaced `getBlockColor(i)` with `getShiftBlockColor(s.length, shiftLengths)` in both vertical and horizontal layouts
- [x] TemplatesSection: moved top bar (business hours info + Save & Sync) behind `activeTab === 'week'` guard
- [x] Build compiles successfully (✓ Compiled successfully in 21.1s)

### Files modified:
- `app/components/template/WeekOverview.jsx` — import + color function fix (lines 3, 39, 80)
- `app/components/workspace/TemplatesSection.jsx` — top bar conditional on Weekly Schedule tab (lines 238-292)

## Prompt 5: Settings Page Fixes ✅

### Implementation - DONE
- [x] Pill colors: replaced hardcoded `#FF1F7D` with `c.fill` / `c.border` from `getColorForLength()` — now 4h=pink, 6h=purple, 8h=teal, etc.
- [x] Label: confirmed already "Team Name" (was fixed previously), updated comment to match
- [x] Build compiles successfully (✓ Compiled successfully in 10.2s)

### Files modified:
- `app/components/workspace/SettingsSection.jsx` — pill color fix (line 136), comment fix (line 107)

## Prompt 1: Wizard Fixes ✅

### Implementation - DONE
- [x] Removed 4 em dashes: steps 2, 4, 5, 10 (rewording or replaced with -)
- [x] Highlight border: replaced `ring-[3px] ring-pink-400 ring-offset-4` with `border: 2px solid #FF1F7D` + 8px padding
- [x] Step 2 target: changed from `tour-templates-section` (entire section) to `tour-templates-tabs` (tab pills only)
- [x] Step 4 target: changed from `tour-rota-actions` (full button bar) to `tour-generate-btn` (Generate button only)
- [x] Added `id` prop support to Button component for tour targeting
- [x] Tooltip overflow fix: bottom-positioned tooltips flip above target when near viewport bottom
- [x] Build compiles successfully (✓ Compiled successfully in 22.7s)

### Files modified:
- `components/OnboardingTour.jsx` — em dashes, targets, highlight border, tooltip overflow
- `app/components/workspace/TemplatesSection.jsx` — added `id="tour-templates-tabs"` to tab pills
- `app/components/rota/RotaActions.jsx` — added `id="tour-generate-btn"` to Generate button
- `app/components/Button.js` — added `id` prop passthrough

## Prompt 7: Reports — Staff Rates ✅

### Audit - DONE
- [x] Staff.hourly_rate exists directly on Staff table (set via workspace)
- [x] payroll_info table has separate hourly_rate/annual_salary (set via payroll page)
- [x] Labour API fetched from payroll_info only — missed Staff.hourly_rate fallback
- [x] Export CSV API queried legacy Staff.hourly_rate only — missed payroll_info entirely

### Implementation - DONE
- [x] Labour API: added Staff.hourly_rate to SELECT, falls back when payroll_info empty
- [x] Export CSV API: added payroll_info relationship + same fallback logic
- [x] Overtime: both APIs now use 1.5x rate for overtime hours
- [x] Reports page display already correct (renders rate from API response)
- [x] Build compiles successfully (✓ Compiled successfully in 35.4s)

### Files modified:
- `app/api/reports/labour/route.js` — added hourly_rate fallback + 1.5x OT rate
- `app/api/reports/export-csv/route.js` — added payroll_info query + fallback + 1.5x OT rate

## Prompt 8: Dashboard Redesign ✅

### Implementation - DONE
- [x] Removed "Time Saved" (hardcoded 2.5h per rota) and "Weeks Approved" vanity metrics
- [x] New stat card 1: "This Week's Rota" - status badge (Published/Draft/Not Created), date range, click → rota
- [x] New stat card 2: "Coverage Status" - percentage gauge, green/amber, click → Staff & Shifts
- [x] New stat card 3: "Pending Requests" - count with amber highlight, click → Inbox
- [x] Enhanced Upcoming Rotas: each row shows date range, week count, Published/Draft badge, delete button
- [x] Enhanced empty state: "No rotas yet. Create your first rota →"
- [x] New Quick Actions row: "Generate Next Week" (pre-fills next Monday), "Edit Templates", "Manage Staff"
- [x] Kept "Welcome back, [Name]" greeting and PastRotasSection
- [x] Coverage calculated from team template data + staff max hours
- [x] Build compiles successfully (✓ Compiled successfully in 23.4s)

### Files modified:
- `app/(auth)/dashboard/page.js` — full rewrite (removed SectionHeader, AnnouncementComposer imports, added team/staff queries)

## Prompt 9: Help Centre FAQ Update ✅

### Implementation - DONE
- [x] Q1 "How do I set up my first rota?" - updated flow: Settings → Day Templates → Weekly Schedule → Save & Sync → Staff & Shifts → Generate
- [x] Q2 "What are shift patterns?" - updated: template cards with Edit/Rename/Delete, timeline editor, Weekly Schedule + Save & Sync
- [x] Q3 "How do I invite staff?" - updated: "Staff & Shifts tab" instead of "Staff tab"
- [x] Q4 "Set once, use forever" - removed vanity "2-3 hours per week" claim with em dash
- [x] Q5 "What if scheduler can't find a rota?" - updated: pre-generation checks, coverage/keyholder validation, error codes with action links
- [x] Q6 "How do staff submit availability?" - updated: shift-based matrix with actual shift time slots, coverage gauge, keyholder warnings
- [x] Q7 "How are weekly costs calculated?" - updated: 1.5x overtime rate, per-staff breakdowns, Labour Cost stat card
- [x] Build compiles successfully (✓ Compiled successfully in 13.1s)

### Files modified:
- `app/(auth)/dashboard/help/page.js` - 7 FAQ answers updated
