# Inspector redesign + richer manual-edit clip

## Goal
Softer, rounded, floating inspector panel (not floor-to-ceiling boxy) rolled out
across the app; and a bigger, more dynamic manual-edit clip (drag-drop first,
then add-to-empty, then edit) for the features page.

## Phase 1 — Design (Figma-first)
- [ ] Audit every inspector/drawer panel in the web app (subagent)
- [ ] Figma: mock the new softer rounded inspector IN CONTEXT over the rota grid
      (floating, margins top/right/bottom, 12px-family radius, soft shadow, lighter overlay)
- [ ] Andre reviews + approves the Figma

## Phase 2 — Implement + recapture
- [ ] Implement the new panel style on ShiftInspector (rota builder)
- [ ] Make the demo grid bigger / more zoomed so it reads large in the clip
- [ ] New clip choreography: (1) drag a shift to an empty slot, (2) click an empty
      slot to add a new shift, (3) click a shift to edit it
- [ ] Present clip bigger on the features page (layout: more width for this one)
- [ ] Recapture + swap in

## Phase 3 — Roll out the panel style
- [ ] Apply the rounded floating style to all other inspector panels
- [ ] Figma-mock each context to confirm no weird overlaps
- [ ] Verify each renders (no clipping / overlap / TypeErrors)

## Review
- Figma mock approved ("this works") — two variants built (full-height + content-hug); went with the floating full-height-minus-margins card (radius 20 / T.r.xl, soft T.shadow.lg, 16px inset, lighter 28% scrim + 2px blur).
- Audit finding: the ONLY boxy floor-to-ceiling drawer is ShiftInspector (rota builder, shared with demo/builder). Staff + Shift inspectors are already in-flow rounded Cards (radius 22, soft shadow) — no boxy drawer, no overlay, no overlap risk. So the "roll out everywhere" was really just this one drawer.
- Implemented the new panel style on ShiftInspector (generate/page.js). Verified on the demo.
- Demo enriched: 2nd team "Kitchen" in blue (#0EA5E9) + 2 staff (Tom Fisher, Mia Rossi). Vibrant.
- New clip (23s, 1600x820): Act 1 drag a shift onto an empty slot (visible lift + glide ghost), Act 2 click an empty slot to add a shift, Act 3 click a shift to change its hours. Badge-free.
- Features page: Manual Editing is now a full-width feature (clip ~974px wide, ~2x bigger); copy + bullets rewritten to match the three actions.

## Still open
- Commit (only my files, per shared-worktree rule) when Andre says.
- The other feature clips + trailer (future).
- Optional: polish staff/shift in-flow inspectors to exactly match if desired (they already follow the soft rounded convention).
