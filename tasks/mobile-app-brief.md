# Brief: Shiftly Manager mobile app (Expo SDK 54)

Hand this to Claude Code in the new mobile repo. It is written to be read cold,
with no access to the Shiftly web repo.

House style: **no em dashes** anywhere, in copy, comments or commit messages.
Use a comma, colon, full stop or brackets instead.

---

## 1. What Shiftly is

Shiftly is rota (shift schedule) software for UK hospitality and retail: pubs,
restaurants, cafes, hotels, small retail groups. A manager sets up their venue,
defines shifts and staff, and an OR-Tools constraint solver generates a fair,
compliant weekly rota. The pitch is fairness: contracted hours honoured, no
close-then-open shifts, even weekend rotation, minimum rest, keyholder cover.

The web app is Next.js 16 (App Router) with Clerk auth and Supabase Postgres,
deployed on Vercel. It is going into a managers-only pilot for roughly 20
businesses.

**This project is the manager's phone companion, not a port of the web app.**

There is a separate future employee app. Do not build it. Some `/api/employee/*`
routes exist but are gated off and return empty. Ignore them.

---

## 2. The split: what belongs on desktop, what belongs on mobile

The principle: **desktop is for setup and authoring, mobile is for running the
day.** Anything that involves a wide grid, drag and drop, or careful
configuration stays on desktop. Anything a manager needs while standing behind a
bar belongs on the phone.

### Desktop only (do NOT build these on mobile)

| Area | Why it stays on desktop |
|---|---|
| Onboarding and workspace setup | Multi-step, org then location then teams. Done once, at a desk. |
| Shift pattern authoring | Drag and drop timeline builder. Hostile on a small screen. |
| Adding staff, contracts, pay basis | Data entry heavy, needs a keyboard. |
| Rules configuration | Many interacting toggles that need explanation. |
| Rota generation and the rota grid | A 7 day by N staff grid. Fundamentally a wide surface. |
| Reports and payroll export | Tables and CSV export. |
| Billing | Stripe, and it is per location. |

### Mobile (this app)

| Feature | Why it earns a place on the phone |
|---|---|
| **Who is on now / today** | The single most valuable mobile screen. Live view of who is working, when they finish, who has keys. |
| **This week's rota, read optimised** | Day by day, swipe between days. Not the desktop grid. |
| **Inbox: swap and time off requests** | Approve or decline in two taps. This is the main reason to open the app. |
| **Push notifications** | New request, rota published, someone has not turned up. The hook that makes the app habitual. |
| **Quick cover** | Someone calls in sick. See who is available and off shift, assign cover, notify them. |
| **Publish a drafted rota** | Manager reviews on desktop, publishes from anywhere. |
| **Staff directory** | Tap to call or message. Contracted hours, keyholder status at a glance. |
| **Labour cost so far this week** | One number, glanceable. No charts. |

### Deliberately deferred

Editing shift patterns, editing rules, generating a rota from scratch, payroll
runs. If a manager tries to reach these, show a short explainer: "Set this up on
the desktop app at shiftly.app."

> Confirm this split with the product owner before building. It is a considered
> proposal, not a settled decision.

---

## 3. Connectivity: read this section carefully

### 3.1 Never talk to Supabase directly

Row Level Security was enabled across every table on 2026-07-20 with **no
policies**, deliberately. The public anon key now returns zero rows on every
table. This was a fix for a real exposure: staff names, wages, salaries and
emails were readable by anyone holding the anon key.

Therefore:

- **Do not install `@supabase/supabase-js` in the mobile app.**
- **Do not put the Supabase anon key or service role key in the app.** A mobile
  bundle is not a secret store. Shipping the service role key would hand every
  user full database access.
- All data access goes through the Next.js API routes over HTTPS. Those routes
  run server side, authenticate the caller with Clerk, and use the service role
  key which bypasses RLS.

The only exception worth considering later is Supabase Realtime for live
updates, which would need its own scoped RLS policies designed first. Do not
attempt it in v1. Poll or refetch on focus.

### 3.2 Auth: Clerk with `@clerk/clerk-expo`

The web app uses Clerk. Use the same Clerk instance so accounts carry across.

- Install `@clerk/clerk-expo`.
- Token cache must be `expo-secure-store`, never AsyncStorage. Session tokens
  are credentials.
- Sign in method is **email code (OTP)**, not password. The web flow lands on
  Clerk's `factor-one` step and emails a numeric code. Build for that.
- Get the publishable key from the product owner. It is `pk_test_...` for
  development. Production keys are switched at go live.
- Attach the session token as `Authorization: Bearer <token>` on every API call.
  Clerk's `auth()` on the server accepts a bearer token, so the existing routes
  work unchanged in that respect.

### 3.3 The location scoping problem, which needs a backend change first

**This is the one thing that will silently produce wrong data if ignored.**

Shiftly is one location at a time. Billing is per location, and a manager with
several venues switches between them. The server resolves scope in
`lib/db.js` via `getOrgScope(userId)`, which reads the **active location from a
cookie** called `shiftly_loc`, set by the web app's location switcher. If the
cookie is absent it **silently falls back to the first location**.

A mobile app does not set that cookie. So without a change, every mobile request
for a multi location business returns data for an arbitrary location, with no
error. A manager could approve a shift swap against the wrong venue.

**Required backend change (web repo, small):** teach `getOrgScope` to accept an
explicit location, preferring a request header such as `X-Shiftly-Location` over
the cookie, and validating it against the caller's own locations. Then the
mobile app sends the active location on every request.

Do not work around this on the client. Do not guess. Raise it, get the backend
change made, then build against it.

### 3.4 API base URL

Configure per environment via `app.config.ts` and `EXPO_PUBLIC_API_URL`. Local
development against a machine on the same network needs the LAN IP, not
`localhost`.

---

## 4. API surface that exists today

Authenticated manager routes, all under `/api`:

| Route | Use |
|---|---|
| `GET /rotas`, `GET /rotas/[id]` | Rotas and their assignments. The core read. |
| `GET /staff`, `GET /staff/[id]` | Staff, contracted hours, keyholder, pay basis. |
| `GET /shifts` | Shift patterns. |
| `GET /locations`, `GET /location` | The manager's venues. Drives the location switcher. |
| `GET /teams`, `GET /teams/[team-id]` | Teams within a location. |
| `GET /rules` | Solver rules for the location. |
| `GET /reports`, `GET /payroll` | Cost data. Use sparingly on mobile. |
| `POST /generate-rota` | Calls the Python OR-Tools solver. Slow. Desktop only. |
| `/requests`, `/notifications` | Swap and time off requests, notifications. |
| `GET /auth/user-type` | Distinguishes manager from employee. |

**Warnings, confirm before relying on any of these:**

- The codebase is mid migration from an old schema to a normalised
  Organizations / Locations / Teams model. `tasks/migration-plan.md` in the web
  repo tracks it. **Some routes are still on the old schema and are broken.**
- `/api/notifications*` and `/api/requests` are currently **gated**: GET returns
  `[]` and writes return 403. The Inbox is a "coming soon" page on web. If the
  mobile Inbox is a v1 feature, these routes need rebuilding first. **Check
  their status before planning around them.**
- `/api/staff/invite` is old schema and fails closed.

Ask the product owner which routes are known good before building against them.

---

## 5. Data model, in brief

Table names are quoted PascalCase with spaces, for example `"Rota Assignments"`.

- **`Organizations`**, `organization_id` is the manager's Clerk user id. One
  login is one business.
- **`Locations`**, the billable unit, belongs to an organization.
- **`Teams`**, belong to a location, for example kitchen, bar, front of house.
- **`Staff`**, belong to a team. Carries `name`, `wage`, `pay_basis`
  (`hourly` | `salary` | `annualised`), `contracted_hours`, `max_hours`,
  `is_keyholder`, `availability` (JSON keyed by day index, 0 is Monday).
- **`Shift Patterns`**, the recurring shifts. `shift_type` is Open, Close or
  Fixed. Has `days` and `num_staff_needed`.
- **`Rotas`**, metadata only: `location_id`, `week_start`, `status`
  (draft or published).
- **`Rota Assignments`**, who works which shift on which date. This is the
  actual schedule and what the mobile app mostly renders.
- **`Location Rules`**, solver constraints per location.

Two conventions worth knowing:

- **Never wrap numbers in `String()`** and never pass a string where a number is
  expected. This has caused real bugs in the web app.
- Week start is a Monday. Some stored dates are a day off, so the web app snaps
  to the nearest Monday when matching a rota to a week. Match that behaviour.

---

## 6. Design system

95 percent monochrome, 5 percent accent. One accent colour only.

- **Accent pink `#FF1F7D`.** Used sparingly: primary actions, active states,
  the one number that matters.
- **Typeface: Cal Sans Text** for headings and body. Falls back to Plus Jakarta
  Sans. Bundle the woff2 or its mobile equivalent, do not fetch at runtime.
- **12px corner radius** on cards. Pills are fully rounded.
- Soft, subtle shadows. No hard borders where a shadow will do.
- Tonal ink rather than pure black. Hierarchy comes from opacity of one ink
  colour, not from many greys.
- **Never use a key emoji for keyholder.** Use a clean line key icon.

Ask for the web repo's `app/components/ui/kit.jsx` as a token reference. Do not
try to share the code itself, it is inline styled React DOM and will not
transfer, but the token values should match exactly.

---

## 7. Suggested build order

1. **Shell and auth.** Expo SDK 54, Clerk Expo with secure store, sign in by
   email code, an authenticated fetch wrapper that attaches the bearer token and
   the location header, and a location switcher.
2. **Today.** Who is on now, who is next, who holds keys. Read only. This alone
   is worth shipping.
3. **Week.** Day by day rota, swipe between days.
4. **Staff directory.** Tap to call or message.
5. **Inbox.** Only once the requests API is confirmed working.
6. **Push notifications.** Expo push, needs a backend token registry.
7. **Quick cover.** The first write heavy feature. Do it last.

Ship 1 to 3 before adding writes. A read only app that is correct beats a
feature rich one that shows the wrong venue's data.

---

## 8. Ground rules

- Verify against the real API before claiming a screen works. Do not mock data
  and call it done.
- If the backend is wrong or missing something, say so and ask. Do not paper
  over it on the client.
- Keep the API contract in one typed module so drift is visible.
- No em dashes.
