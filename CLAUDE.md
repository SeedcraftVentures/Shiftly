# CLAUDE.md — Shiftly Project Rules

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- **Shiftly-specific:** When touching data that flows between components (e.g. shift format, availability format), use a subagent to FIRST audit the current data format across all consumers before making changes

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- **Shiftly-specific:** After UI changes, verify the component renders without errors by checking for TypeErrors, NaN, undefined in the console output

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.
- **Data Type Safety:** NEVER wrap numbers in String(). NEVER pass strings where numbers are expected. This has caused critical bugs before.
- **Consistent Visual Language:** When rendering shift-related UI (colors, bars, pills), ALWAYS use the shared functions from `shift-constants.js`. Never hardcode colors or create separate color mappings.

## Shiftly-Specific Rules

### Data Flow — DO NOT BREAK
```
Onboarding → Teams table → Workspace (Templates/Staff) → Shifts table → OR-Tools API → Rota
```
- Teams table stores: open_time, close_time (NUMERIC decimals), shift_lengths (array), day_templates (JSON), week_template (JSON)
- Shifts table stores: individual shift rows synced from templates via /api/teams/[id]/template/sync-shifts
- Staff table stores: availability as shift-slot keys { 'Mon-s1': true, 'Tue-s2': false }
- OR-Tools Python API receives: shifts + staff in a specific format — ALWAYS audit the Flask endpoint before changing what the frontend sends

### Visual Consistency Rules
- Colors per shift length come from `shift-constants.js` → `getBlockColor(length)` or `SHIFT_COLORS`
- The SAME color function must be used in: TimelineBuilder, template cards, weekly schedule previews, staff section Template Week sidebar, settings page pills, rota builder preview
- If you're about to hardcode a color for a shift-related element, STOP and use the shared constant instead
- Design system: 95% monochrome, 5% neon pink (#FF1F7D). Plus Jakarta Sans. 12px border radius on cards. Soft subtle shadows.

### Files You Must Not Modify Without Explicit Instruction
- `app/components/template/TimelineBuilder.jsx` — drag-and-drop editor, works correctly
- Python OR-Tools scheduler (Railway deployment) — frontend-only changes unless told otherwise
- Supabase migration files — schema changes need separate discussion

### Files That Are Safe to Modify
- `app/components/workspace/TemplatesSection.jsx`
- `app/components/workspace/StaffSection.jsx`  
- `app/components/workspace/SettingsSection.jsx`
- `app/components/workspace/RotaSection.jsx`
- `app/components/PreWizardOnboarding.jsx`
- Any API route in `app/api/`
- Any component in `app/components/` that isn't TimelineBuilder

### Before Changing Any Data Format
1. Use a subagent to search the codebase for ALL consumers of that data
2. List every file that reads or writes the field you're changing
3. Update ALL consumers in the same commit
4. Verify no component receives undefined/NaN after your change
