# Apple-esque Redesign + Dark Mode — Migration

Branch: `apple-redesign`. Approach: **real app, foundation-first**, then convert in waves. The kit is the single source of truth; sandboxes under `app/(auth)/dashboard/lab/*` are the design references.

## Foundation (DONE)
- [x] `app/components/ui/kit.jsx` — theme-aware. `THEMES {light,dark}`, `ThemeProvider`, `useTheme()`; every shared component self-themes. `export const T = LIGHT` kept for backward-compat (unmigrated pages stay light, no crashes). Colour math (`accent+'18'`, `${hex}99`, `lift/ring`) preserved.
- [x] `app/(auth)/layout.js` — wrapped app in `<ThemeProvider>`.
- [x] `app/layout.jsx` — no-flash `<script>` sets `data-theme` pre-paint + `suppressHydrationWarning`.
- [x] `tailwind.config.js` — `darkMode: ['selector','[data-theme="dark"]']` (for the shell wave).
- [x] `app/(auth)/dashboard/layout.js` — outer frame + inner panel theme-aware (nav rail stays brand pink).
- [x] `app/(auth)/dashboard/settings/page.js` — Appearance section hosts the light/dark toggle; page themed.
- [x] `app/(auth)/dashboard/page.js` — dashboard root converted (end-to-end proof).

Verified: all files parse as valid ESM+JSX via @babel/parser. Runtime visual check pending (user's dev server).

## Wave 1 — Shell + quick wins (NEXT)
- [ ] Shell dark mode via Tailwind `dark:` — `Navigation.jsx`, `NotificationBell.js`, `DashboardTopBar.js` (hardcoded light popovers/text today).
- [ ] Quick-win kit pages: reports, payroll, archive, rules, requests — add `useTheme()` + audit hardcoded `#fff`/`#E5E7EB`/`#EEE`.
- [ ] Kill flash-of-light for dark users (consider moving shell/base to CSS `data-theme` vars).

## Wave 2 — Daily drivers (have approved sandbox designs)
- [ ] dashboard (refine), shifts (696 lines, bespoke), staff (675 lines, bespoke).

## Wave 3 — Big redesigns
- [ ] onboarding (`PreWizardOnboarding.jsx`) — sandbox-design first; PRESERVE `/api/onboarding` payload contract.
- [ ] generate (rota builder, 527 lines, drag), workspace shell + sections (~4,700 lines Tailwind).

## Wave 4 — Auth/billing + employee PWA
- [ ] sign-in/up, invite, checkout, employee app (`/employee` + `components/employee/*`).

## Notes / gotchas
- Two `PageHeader`s exist (kit vs legacy `components/PageHeader.jsx`) — unify during migration.
- Onboarding writes normalized schema (Organizations/Locations/Location Day Hours/Teams), NOT the flat Teams schema in CLAUDE.md §66 — that note is stale for this path.
- Team colours in onboarding are cosmetic (dropped server-side).
