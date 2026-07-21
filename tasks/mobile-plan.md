# Shiftly — mobile plan and build sequence

Decided by the owner 2026-07-21. Supersedes the mobile sections of
`tasks/game-plan.md` and refines `shiftly-mobile-brief.html`.

---

## 1. Decisions locked

| Decision | Choice |
|---|---|
| Repo layout | **Monorepo**: `apps/web`, `apps/mobile`, `packages/tokens` |
| App structure | **One Expo app, role-branched** after login via `/api/auth/user-type` |
| Push notifications | **Deferred to v2.** v1 uses the polling already in place |
| Job board | Ships separately, stays on `jobs-board` |

## 2. Hard prerequisites (nothing mobile starts before these)

1. **Merge instance A's header-based location resolution.** `getOrgScope` on
   `apple-redesign` resolves the active location from the `shiftly_loc` **cookie
   only**. Native clients cannot set that cookie, so every mobile API call would
   silently resolve to the wrong location. Instance A already solved this on
   `jobs-board` (`6a0e9c9`, `ACTIVE_LOCATION_HEADER = 'x-shiftly-location'`).
   This is a blocker, not a nicety.
2. **Phase B.** All six `/api/employee/*` routes are stubbed, and
   `app/api/staff/invite/route.js` still queries `.eq('id')`, `clerk_user_id`,
   `email`, `invite_token`, none of which exist in the current schema. **Staff
   cannot obtain a login at all.** The staff app has no backend until this is done.
3. **Verify Clerk token auth from a native client.** The routes use `auth()` from
   `@clerk/nextjs/server`, which reads the request context. `@clerk/clerk-expo`
   sends a bearer token. This is expected to work but has never been exercised;
   prove it with one endpoint before building screens on the assumption.

## 3. Sequence

**Phase B — make the loop two-sided.** Un-stub the six employee endpoints behind a
`getStaffScope(userId)` resolver keyed on `Staff.user_id`; fix the invite/claim
flow. Result: staff log in on the web employee page, file real requests, and the
Inbox stops being manager-only. This is also the cheapest way to test the whole
staff data model before any native code exists.

**Full software QA.** The click-through, now including the two-sided loop.

**Token extraction.** Before the app, not during (see §5).

**Monorepo restructure.** See §6 for why the timing is delicate.

**Mobile build.** Expo + TypeScript, role-branched.

## 4. What stays on desktop

Mobile is a companion for managers and the whole experience for staff.

| Desktop only | Manager mobile | Staff mobile |
|---|---|---|
| Shift pattern authoring (TimelineBuilder is drag and drop) | Glance / readiness | Home, next shift + week |
| Staff CRUD and the availability grid | Generate -> gap list -> publish | My shifts, shift detail |
| Rules configuration | **Inbox approvals** | Open shifts, pick up |
| Opening hours, settings, onboarding | Reports summary | Swaps |
| Full rota grid editing | Payroll CSV via share sheet | Availability |
| Archive browsing | | Time off requests |
| Billing | | Notifications, profile |

**The Inbox is the strongest case for the manager app.** Approving time off with
the coverage cost shown, swipe to approve, away from a desk, is genuinely better
on a phone than on a laptop. Everything else on the manager side is a convenience;
this is a real improvement.

Rota **editing** stays desktop. Tap-to-reassign a single cell on mobile is
acceptable; dragging across a 7-column grid on a phone is not.

## 5. Design consistency: what can and cannot be shared

**`app/components/ui/kit.jsx` cannot be imported into React Native.** It is React
DOM: `<div>`, inline CSS objects, `backdrop-filter`, `box-shadow` strings, CSS
transitions. None of that exists in RN. Any plan that assumes "just import the
kit" is wrong.

What is genuinely shareable is the **token layer**, and our tokens are currently
mixed. `THEMES.light/dark` holds both platform-agnostic values (colours, radii,
type scale, font names, spacing) and web-only ones (`blur: 'blur(24px)
saturate(180%)'`, `shadow` as CSS strings, `ring()`/`lift()` helpers returning CSS).

**`packages/tokens` therefore exports primitives only:**
- colour palette (both themes), spacing scale, radii, type scale, font families,
  easing curves, elevation *levels* as abstract steps (not CSS strings)

**Each platform derives from those:**
- web keeps `kit.jsx`, importing primitives and composing CSS `box-shadow`/`blur`
- mobile builds native components from the same primitives, expressing elevation
  through `shadowColor`/`shadowOffset`/`shadowRadius` and Android `elevation`

Components are **reimplemented, not shared**. The guarantee is that a Card is the
same pink, the same radius and the same type scale on both, because both read one
file. Anything stronger than that is not achievable across DOM and RN.

## 6. Monorepo restructure: timing is the risk

The move (`app/` -> `apps/web/app/`) touches **every path in the repo**.

Instance A currently has 8 commits of in-flight job board work on `jobs-board`.
Restructuring while that is open moves every file underneath them and produces a
merge far worse than the 63-vs-57 file conflict already resolved once.

**Therefore: do the restructure only when `jobs-board` is either merged or
deliberately paused, and agree the moment with instance A first.** It also changes
Vercel's root directory setting, so the deploy config moves at the same time.

## 7. Not yet planned anywhere

- **Push notifications backend.** Deferred to v2 by decision, but note what it
  needs when it comes: device token storage per user, Expo push credentials, and
  a send step inside `lib/createNotification`'s fan-out. None exists today.
- **Offline behaviour.** The brief asks for "viewing shifts with no signal". That
  needs a caching layer on the staff app; no design yet.
- **App store presence.** Accounts, listings, screenshots, review cycles. Lead
  time on this is usually underestimated.
