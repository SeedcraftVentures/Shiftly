# Shiftly Data-Layer Migration — Master Plan (branch: shiftly-rebuild)

> Context: the LIVE production DB was rebuilt into a normalized Organization → Location → Team
> schema (see tasks/schema.sql). The application code still targets an OLD flat, user_id-scoped
> schema (Teams.solver_rules, Shifts, Rules, payroll_info, Rotas.schedule_data, lowercase
> notifications/requests). Nearly every data-touching route is broken against the live DB.
> Decision (owner, 2026-06-12): FULL data-layer migration to the new schema. Prod IS this DB.

---

## A. Cross-cutting changes (touch almost every route)

1. **Scoping flip.** Old: `.eq('user_id', userId)` (manager's Clerk id). New: scope by
   Organization (Clerk) → Locations → Teams → Staff. Need a shared helper, e.g.
   `getOrgScope(auth)` → { organizationId, locationIds, teamIds } used by every manager route.
2. **Table-name casing.** Code uses `.from('notifications')` / `.from('requests')`; real tables are
   `"Notifications"` / `"Requests"`. Fix every occurrence.
3. **Column renames (Staff):** id→staff_id, keyholder→is_keyholder, hourly_rate→wage,
   email→invite_email, clerk_user_id→user_id, preferred_shift_length→preferred_shift_lengths(array).
4. **Column renames (Shifts → "Shift Patterns"):** table rename; team_id→shift_team,
   anchor_type→shift_type(enum Open/Close/Fixed), staff_required→num_staff_needed,
   keyholder_required→is_keyholder, days_of_week(names)→days("Days"[]), break_duration_mins→
   break_duration, break_type('paid'/'unpaid')→break_is_paid(bool).
5. **Rotas:** approved(bool)→status(enum Draft/Published/Archived); team_id→location_id;
   start_date/end_date/week_count→week_start(+computed); schedule_data(JSON)→see decision B.
6. **Rules:** Teams.solver_rules(JSON) → "Location Rules" (per location). Reconcile keys (below).
7. **Wages:** payroll_info table is GONE → read/write `Staff.wage`. Drop pay_type/annual_salary.

## B. Schema GAPS — things the new schema has no home for (need additions/decisions)

| Gap | Impact | Plan |
|---|---|---|
| **Rota assignments storage** (who works which shift/day) | Blocks generate→save→reports→payroll→employee-shifts | **DECISION B** below |
| **Billing/Subscriptions table** (code refs `Subscriptions`, absent) | Blocks per-location billing, billing page, sidebar | **DECISION C** below |
| **Availability** JSON → normalized "Staff Availability" + "Staff Availability Rules" | Staff dropdown availability + micro-rules | Rewrite grid/rules read-write to the two tables; enum casing (Always/Prefers/Never, Open/Close/Any) |
| **day_templates / week_template / sync-shifts** (old template pipeline) | Old workspace Templates flow | **DECISION D** — retire; author shifts directly as "Shift Patterns" |
| **Rule key reconciliation** | Rules page ↔ Location Rules | UI keys enforce_keyholder/min_rest_hours/max_consecutive_days map cleanly; fair_distribution→fair_weekend_distribution; UI's prefer_consecutive_days_off/balance_keyholder_shifts/max_weekly_hours have NO column; Location Rules' no_clopening/no_double_shifts/enforce_*/min_days_off have NO UI. Reconcile both directions. |
| **Missing tables** user_settings, locales | Low-criticality routes | Stub user_settings; hardcode locales as constants |
| **Notifications/Requests use BIGINT team_id/staff_id** but Teams/Staff are UUID | Can't relate them | Schema inconsistency — recommend altering those cols to uuid in the clone (DECISION, default: fix to uuid) |
| **Misc old Teams cols** (color, open/close_buffer, locale_id) | Minor UI | color = client-only; buffers/locale = defer or add columns |

## C. DECISIONS (locked 2026-06-12 by owner)

- **A. Tenancy — DECIDED: manager-as-org (one login = one business).** `Organizations.organization_id`
  holds the Clerk USER id for now. Coded so it can upgrade to real Clerk Organizations later.
  Onboarding creates Organizations(org_id=userId) + Locations + Teams. auth/user-type: manager if an
  Organizations row exists for the user; employee if a Staff row has user_id=userId; else new.
- **B. Rota assignment storage — DECIDED: normalized `"Rota Assignments"` table** (see schema-additions.sql).
- **C. Billing — DECIDED: mocked for demo.** Build billing page + sidebar entry + "add a location"
  upgrade prompts; treat every org as active; no real Stripe charges. Real Stripe = later workstream.
- **D. Shift authoring — DECIDED: yes.** Shifts authored directly as `"Shift Patterns"` via the Shifts
  page; retire old Templates/sync-shifts pipeline.
- **E. Wage model — DECIDED: hourly-only via `Staff.wage`** (drop pay_type/annual_salary/payroll_info).

## D. Execution waves (each wave leaves a working slice; verify on dev server before next)

- **Wave 0 — foundations:** clone DB up; add decided schema additions (Rota Assignments, Subscriptions
  if real, availability already tabled, fix bigint→uuid); write `getOrgScope` helper; enums/casing.
- **Wave 1 — hierarchy + onboarding:** onboarding → Organizations + Locations + Teams + Location Day
  Hours + Location Rules; auth/user-type; teams routes; OnboardingCheck. (Manager can sign up & land.)
- **Wave 2 — enrich:** staff (+normalized availability + rules), shifts ("Shift Patterns"), rules
  ("Location Rules"). (Staff/Shifts/Rules pages fully wired.)
- **Wave 3 — generate + view:** generate-rota (Staff/Shift Patterns/Location Rules → scheduler →
  Rota Assignments), rotas save/read, rota grid render. (Core demo works end-to-end.)
- **Wave 4 — reports/payroll:** labour/trend/export + payroll read from Rota Assignments + Staff.wage.
- **Wave 5 — requests/notifications:** capitalized tables, scoping, id-type fixes.
- **Wave 6 — billing UI + sidebar:** per-decision-C; billing page, sidebar entry, "add a location" upgrade prompts.
- **Wave 7 — employee app:** profile/shifts/availability/requests/open-shifts/swaps.
- **Wave 8 — cleanup:** delete dead/old-schema code, generate-rota-ortools, legacy template/workspace.

## E. Notes
- WS1 rota fixes from earlier are SUPERSEDED (they targeted old columns); rota route is rewritten in Wave 3.
- Python scheduler input/output contract is UNCHANGED — only how the Next.js route assembles input + persists output changes.

## F. Deferred UI work (after backend is solid — visual layer)
- **Retire "templates" UI everywhere** (decision D): the old Workspace Templates tab, "Edit Templates"
  dashboard quick-action, the rota-builder template preview/gate, OnboardingTour template step, help FAQ.
  Shifts are authored directly as Shift Patterns now — no template/sync step. Remove the generation gate
  that insists templates exist (Wave 3 removes the gate; Wave 8 deletes the dead UI).
- **Nav: show Organization name + active Location, with a location switcher.** Needed once multi-location
  + per-location billing lands; staff/shifts/rules/rotas are all location-scoped. UI-layer; build after
  the data layer is wired. [[shiftly-billing-model]]
