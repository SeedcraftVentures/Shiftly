# Lessons

## "Converting a page" to the redesign = porting the sandbox UI, not just theming it
**Mistake:** For the Apple redesign I made the real dashboard theme-aware (added `useTheme()`, colours flipped) but left its OLD layout/components. The user expected it to look like the lab sandbox (donut rings, 4-bar Living Hours meter, big 40px header, frosted cards, spring buttons) — none of that was there.
**Rule:** Migrating a page means (1) the shared kit must actually contain the new visual design (frosted `Card`, `Ring`, `Pill`, spring `Button`, bigger headers, radii, drop shadows), and (2) the page must be rewritten to mirror the approved sandbox layout, wired to real data. Theming (colour tokens) is necessary but NOT sufficient. Before calling a page "done", diff it visually against its `lab/*` reference — same components, same type sizes, same corners/shadows.
