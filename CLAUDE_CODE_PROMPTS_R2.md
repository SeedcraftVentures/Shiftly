



# Shiftly V4 — Claude Code Prompts (Round 2)

Feed these one at a time. Review output before moving to next.
Read CLAUDE.md first for project rules.

---

## PROMPT 1: Wizard Fixes

Fix the guided tour/wizard component. Use a subagent to find the wizard component file first.

**Fixes needed:**

1. **Remove all em dashes (—)** from wizard step text. Replace with regular dashes (-) or reword naturally.

2. **Pink highlight border is too large.** Currently it wraps entire sections. Rules for the highlight:
   - It should tightly wrap ONLY the specific UI element being described in that step
   - Use a thin 2px solid border with border-color #FF1F7D
   - Max 8px padding between the border and the target element
   - For Step 2 (Your Templates): highlight should wrap ONLY the "Day Templates" and "Weekly Schedule" tab pills — NOT the entire templates card area
   - For Step 4 (Generate a Rota): highlight should wrap ONLY the Generate button — NOT the full-width container

3. **Step 4 is broken** — the Next button click handler doesn't advance to step 5. Fix it. Also the wizard tooltip container is cut off at the bottom of the viewport — ensure the tooltip is fully visible (may need to position it above the target element instead of below if near bottom of page).

4. **General rule for all steps:** Use `getBoundingClientRect()` on the actual target element and position the highlight border exactly around those bounds + 8px padding. Don't manually guess dimensions.

Do not change step text content (beyond em dash removal), step count, or step order.

---

## PROMPT 2: Staff Card Collapsed Layout

Fix the collapsed state of staff cards in StaffSection.jsx. Only touch the collapsed row — do not modify the expanded card.

**Current problem:** h/wk, max hours, and rate are displayed as inline text with labels beside values. No visual structure.

**Required layout — each metric gets its own column with header ABOVE value:**

```
[Avatar] [Name      ] [Contracted] [Max  ] [Rate   ] [Keyholder] [Availability    ] [▼]
         Hattie       h/wk         max     £/hr       🔑          14/14 slots
                      40           48      12                     
```

Implementation:
- Use CSS grid or flex with defined column widths
- Column headers: `text-xs text-gray-400 font-medium` — small grey text ABOVE each value
- Values: `text-sm font-semibold text-gray-900` — bold below header
- "Contracted" header, "40" value below. "Max" header, "48" value below. "Rate" header, "£12" value below.
- **Keyholder toggle:** move to RIGHT side of the row, after Rate. Consistent with toggle positions elsewhere in the app.
- **Availability chevron (▼ or ▸):** place it directly next to "14/14 slots" text, not floating at the far right edge. The whole "14/14 slots ▼" area should feel like a clickable dropdown trigger — add `cursor-pointer`, subtle hover background (`hover:bg-gray-50`), and `rounded-md px-2 py-1`.

Do not change the expanded card layout, the coverage gauge, or the Template Week sidebar.

---

## PROMPT 3: Keyholder Coverage Warning

Use a subagent to first search the entire codebase for how "keyholder" is referenced — find the exact field name on shifts and staff records. It might be `keyholder`, `keyholder_required`, `requires_keyholder`, or `is_keyholder`. Report back what you find before making changes.

Then fix:

1. In the coverage calculation (StaffSection.jsx or wherever CoverageGauge logic lives):
   - For each shift in day_templates that has the keyholder flag set to true
   - Cross-reference with week_template to know which days use that template
   - Count how many staff members are: (a) marked as keyholder AND (b) have that shift slot toggled available in their availability
   - If ANY keyholder-required shift slot has zero qualified+available keyholders, flag it

2. Show warning below the coverage gauge donut:
   - Amber/orange text: "⚠️ X shifts need a keyholder — none assigned"
   - If keyholder requirements unmet, the gauge label should say "Coverage gaps" not "Fully covered", even if hours are sufficient

3. Also surface this on the Rota Builder page as a pre-generation warning: "Cannot generate — keyholder coverage missing for [specific shifts]. Go to Staff & Shifts to fix."

Do not change the coverage gauge visual design (donut, colors, layout). Only add the keyholder warning logic and text.

---

## PROMPT 4: Template Cards — Shift Bar Visual Fix + Save & Sync Placement

Two fixes in TemplatesSection.jsx:

**Fix 1: Shift bar colors on template cards**

The mini shift bar previews on the Day Templates cards are NOT using the same colors as the Template Week sidebar in the Staff & Shifts section. 

Use a subagent to compare:
- How the template card shift bars are rendered (in TemplatesSection.jsx)
- How the Template Week sidebar shift bars are rendered (in StaffSection.jsx)
- What `getBlockColor` / `SHIFT_COLORS` returns from `shift-constants.js`

Make them identical. Both must call `getBlockColor(shift.length)` from shift-constants.js. No separate color arrays or hardcoded colors. The bar segments should be proportional to shift length relative to the total day hours.

**Fix 2: Save & Sync button placement**

- REMOVE the Save & Sync button from the Day Templates tab entirely
- It should ONLY appear in the Weekly Schedule tab
- Reason: Individual templates are saved inside the Edit Template screen (which has its own Save button). Save & Sync specifically syncs the weekly schedule to the Shifts table — it's meaningless in the Day Templates context.
- In the Weekly Schedule tab, keep Save & Sync positioned prominently at the top-right

Also remove or simplify the business hours info bar (Weekend: 7AM-6:30PM / Prep: 30min / Close-down: 30min / Weekly: 140h) from the Day Templates view — it's only relevant context when looking at the weekly schedule. On Day Templates, it's clutter.

---

## PROMPT 5: Settings Page Fixes

Two fixes in SettingsSection.jsx:

**Fix 1: Shift length pill colors**

Currently all pills are solid pink (#FF1F7D) when selected. They should use the SAME per-length color from `shift-constants.js`:

```javascript
import { getBlockColor } from '../template/shift-constants';

// Selected pill: background = getBlockColor(length), text = white
// Deselected pill: background = white, border = gray-300, text = gray-600
```

This means 4h might be green, 6h blue, 8h pink, etc. — matching every other shift-length display in the app.

**Fix 2: "Workspace Name" → "Team Name"**

- Change the label from "Workspace Name" to "Team Name"
- This edits `Teams.name` for the selected team
- If there was a separate workspace-level name edit added elsewhere (e.g. in the main nav Settings page), check if that's a different field. If it's the same field, remove the duplicate. If it's a genuine workspace-level setting (for the workspace header "My Workspace"), keep both but label them distinctly: "Workspace Name" for the workspace, "Team Name" for the team.

---

## PROMPT 6: Rota Builder — Data Fix + Template Preview

This is the most complex task. Use plan mode. Use subagents for the audit steps.

**Step 1: Audit (use subagent)**
- Read the Python OR-Tools Flask endpoint (likely on Railway, but there should be a local copy or the API call format documented somewhere)
- Read RotaSection.jsx — find the generate function and log exactly what payload it sends
- Read the sync-shifts endpoint — what format does it write to the Shifts table?
- Document: what format does OR-Tools expect? What format does the frontend send? What's the mismatch?

**Step 2: Fix data pipeline**
Based on audit findings, fix the translation layer so the frontend sends exactly what OR-Tools expects. Common mismatches:
- `start` (decimal hours) vs `start_time` (time string)
- `length` (hours) vs `end_time` (time string) 
- Availability as shift-slot keys vs day-level booleans
- `keyholder` vs `is_keyholder` vs `keyholder_required` field names
- Staff `shift_lengths` (preferences) not being passed at all

**Step 3: Add template preview**
Below the team selector on the Rota Builder page, add a read-only Template Week preview:
- Show Mon–Sun with mini shift bars (reuse the SAME component from StaffSection's Template Week sidebar)
- Show the template name assigned to each day (from week_template)
- Show "Needed: 140h" total at the bottom
- Add an "Edit in Workspace →" link that navigates to the Workspace Templates section

**Step 4: Pre-generation validation**
Before calling the OR-Tools API, run client-side checks:
- Are there any shifts defined? (week_template + day_templates not empty)
- Are there any staff members? 
- Do keyholder-required shifts have keyholder-available staff?
- Does total staff availability cover total shift hours?
If any check fails, show the specific issue and a link to the relevant workspace section. Do NOT call the API.

**Step 5: Error diagnostics**
If the API returns an error/infeasible result, parse the error and show:
- Which constraint failed (hours, availability, keyholder)
- Which specific day/shift is problematic
- "Go to Staff & Shifts →" or "Go to Templates →" action link

Do not modify the Python OR-Tools scheduler. Only fix frontend data formatting.

---

## PROMPT 7: Reports — Staff Rates

Fix the Reports section showing "No rate set" / £0.00 for all staff.

Use a subagent to:
1. Find the exact column name for pay rate in the Staff/Employees table (search for `rate`, `pay_rate`, `hourly_rate`)
2. Find where Reports fetches staff data — check the query/API call
3. Check if the rate field is included in the SELECT or if it's being read from a different table

Then fix:
- Include the rate field in the staff data fetch for Reports
- Calculate per-staff: Regular Hours × Rate for regular, Overtime Hours × Rate × 1.5 for OT
- Sum into the top-level "Labour Cost" stat card
- Show rate next to each staff member in the breakdown: "Hattie — £12/hr — 32h reg — 8h OT — £480"

Do not change the Reports layout. Only fix data fetching and calculations.

---

## PROMPT 8: Dashboard Redesign

The current dashboard is a placeholder with vanity metrics ("2.5h Time Saved"). Replace with actionable content.

**New dashboard layout:**

**Top row — 3 stat cards:**
- "This Week's Rota" — status badge: Generated ✓ / Draft / Not Created. If generated, show date range. Click navigates to rota.
- "Coverage Status" — mini gauge from workspace. Green "100% Covered" or amber "85% — 2 shifts need cover". Click navigates to Staff & Shifts.
- "Pending Requests" — count of shift swap requests / availability change requests. "0 requests" or "3 pending". Click navigates to Inbox.

**Main section — "Upcoming Rotas" (keep existing but enhance):**
- Each rota row shows: date range, staff count, total hours, status (Published / Draft / Needs Review)
- "+ New Rota" button navigates to Rota Builder
- If no rotas exist, show empty state: "No rotas yet. Create your first rota →"

**Bottom section — "Quick Actions" row:**
- "Generate Next Week" button (pre-fills Rota Builder with next Monday)
- "Edit Templates" → Workspace Templates
- "Manage Staff" → Workspace Staff & Shifts

Remove "Time Saved" metric entirely. Remove "Weeks Approved" unless there's actual approval workflow.

Keep "Welcome back, [Name]" greeting. Use the same card styling (12px radius, subtle shadow) as the rest of the app.

---

## PROMPT 9: Help Centre FAQ Update

Update all FAQ content to match the rebuilt workspace. Use a subagent to read the current Help Centre component and catalogue all existing questions.

Update answers to reference:
- Day Templates → Weekly Schedule → Save & Sync → Staff & Shifts → Generate Rota (new flow)
- Template cards with Edit/Rename/Delete (not template pills)
- Shift-based availability matrix with shift time slots (not day toggles)
- Coverage gauge with keyholder warnings
- Settings page for shift lengths and business hours
- Rota Builder with template preview and pre-generation checks

Keep the same FAQ categories and question structure. Just update the answer content to be accurate. If any questions reference features that no longer exist, update the question too.

Do not add new FAQ categories or create a knowledge base system. Just update text content.

---

## Execution Order

1. **Prompt 6** (Rota Builder data fix) — FIRST, this is blocking the core loop
2. **Prompt 3** (Keyholder warnings) — validation that feeds into Prompt 6
3. **Prompt 2** (Staff card layout) — quick UI fix
4. **Prompt 4** (Template bar visuals) — visual consistency
5. **Prompt 5** (Settings fixes) — visual consistency  
6. **Prompt 1** (Wizard) — non-blocking polish
7. **Prompt 7** (Reports rates) — data fix
8. **Prompt 8** (Dashboard) — enhancement
9. **Prompt 9** (Help Centre) — content update, do last
