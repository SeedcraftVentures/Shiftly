# Spec: staff shift-consistency preference (#2)

**Goal.** Each staff member can say whether they want **the same shifts each week**
(consistency) or are happy for them to **vary**. The manager sets it in the staff
page; the staff member sets it in their app. The rota builder honours it across a
multi-week build: consistent people keep their pattern, everyone else rotates as now.

**Why.** Real teams split on this. Parents/second-jobbers want predictable, identical
weeks; others want variety and fair rotation. One global "fair rotation" rule can't
serve both, which is why a multi-week build currently comes out 3 identical + 1 odd
(no per-person intent driving it).

Status: SPEC. Not started. Needs a migration (approve first), Vercel work, a Render
solver change (auto-deploys from `main`), and the mobile app (separate repo).

---

## 1. Data model

Add ONE column to `Staff`:

- `prefers_consistent_shifts BOOLEAN NOT NULL DEFAULT false`
  - `false` (default) = happy to vary → current behaviour (rotation + fairness).
  - `true` = wants the same shifts/days each week → solver locks their pattern.

Additive and low-risk. Migration SQL (run in the Supabase SQL editor, prod
`mobdakvnkkgzndozrpnw`):

```sql
ALTER TABLE public."Staff"
  ADD COLUMN IF NOT EXISTS prefers_consistent_shifts boolean NOT NULL DEFAULT false;
```

(Chose a boolean over an enum: the product decision is binary — "same each week" on/off.
"Varies" and "no preference" both mean the solver's default rotation, so one flag is enough.)

---

## 2. API (`app/api/staff/route.js`)

- **Read** (`toClient`, ~line 18): add `prefers_consistent: row.prefers_consistent_shifts || false`.
- **Write** (`toUpdate`, ~line 62) and **create** (`toDB`, ~line 53): map the client
  field, e.g. `if (body.prefers_consistent !== undefined) u.prefers_consistent_shifts = !!body.prefers_consistent`.
- No new endpoint. The staff app already updates the person via `/api/staff` (or its
  employee-scoped equivalent — confirm the mobile write path); it just adds the field.

---

## 3. Manager UI (`app/components/workspace/StaffSection.jsx` inspector)

- Add a `Switch` in the staff Inspector: **"Same shifts each week"** with a one-line
  hint ("Keep this person on the same days and shifts week to week").
- Wire it to the client field `prefers_consistent` through the existing staff save
  path (the Inspector already PUTs partial changes to `/api/staff`).

---

## 4. Staff app (mobile repo — mobile session owns this)

- A matching toggle in the staff profile / preferences: **"Same shifts each week"**.
- Writes `prefers_consistent` via the app's authenticated staff-update call.
- Coordinate the field name so web + mobile agree (`prefers_consistent` on the wire).

---

## 5. Solver (`python-scheduler/scheduler.py`) — the core change

The solver already builds all requested weeks in one model (vars are suffixed
`_w{week_num}`) and has `week_variety_terms` that push week-to-week variety. Two changes:

1. **Pass the flag through.** `/api/generate-rota` builds the staff payload for the
   solver — add `prefers_consistent` per staff (from `prefers_consistent_shifts`).
2. **Per-person objective, split by the flag:**
   - **Consistent staff (`prefers_consistent = true`):** for each shift `si` and each
     week `w > 1`, add a penalty for changing their assignment vs the previous week:
     `diff = |schedule[w][si][st] - schedule[w-1][si][st]|` (model it with a bool/abs
     helper), and **minimise** the sum with a strong weight. This pins their pattern.
     Skip the penalty on a week where the person has approved time off (so consistency
     never fights a real absence).
   - **Everyone else:** keep the existing `week_variety_terms` (rotation), but exclude
     consistent staff from those terms so we don't reward moving someone we just pinned.
   - Keep it **soft**: a hard "identical every week" constraint goes infeasible the
     moment coverage or time off shifts. Soft + strong weight means "same unless it
     genuinely can't be".

   Weight guidance: put the consistency penalty in the same band as contracted-hours
   shortfall (currently ×30) so it's respected but never overrides coverage/rest/max-hours
   (the hard constraints) or leaves someone short of contract.

3. `test_contract.py`-style check: extend the local test with a 2-week scenario, one
   staff `prefers_consistent`, and assert their (day, shift) set is identical across
   weeks while a varied colleague's rotates.

---

## 6. Sequencing

1. **Approve + run the migration** (§1). ← you
2. **Web:** API mapping (§2) + manager toggle (§3) + solver flag pass-through and
   objective (§5). Ships via `main` → Vercel (web) and Render (solver, auto). ← me
3. **Verify** on live: set one person "same each week", build 2-4 weeks, confirm their
   rows are identical week to week and others rotate. ← you (I can't run the solver)
4. **Mobile:** the staff-app toggle (§4). ← mobile session, once the field is live

Steps 2 and 4 are independent once the column exists, so they can run in parallel.

---

## 7. Open questions

- **Default for existing staff:** `false` (vary) keeps today's behaviour. Agree?
- **Manager override vs staff-set:** both write the same field. If a manager sets it,
  does the staff member see/keep it? (Simplest: last-write-wins, both can edit. Fine?)
- **Strength:** should "same each week" ever yield to fair-distribution, or always win
  among the soft objectives? (Proposed: consistency ranks above general variety/fairness
  but below contracted-hours and all hard rules.)
