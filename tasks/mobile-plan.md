# Shiftly — mobile plan and build sequence

Decided by the owner 2026-07-21. Supersedes the mobile sections of
`tasks/game-plan.md` and refines `shiftly-mobile-brief.html`.

> **Revised after review.** An earlier draft of this file recommended finishing the
> PWA instead of building native apps, on the grounds that it was the least
> break-prone route. That optimised for engineering risk and ignored two real
> product requirements: store credibility, and the fact that a phone needs its own
> UI rather than a squeezed desktop one. The native decision below is the correct
> one; this note is kept so nobody re-opens a settled question.

---

## 1. The three surfaces

| Surface | Who | What |
|---|---|---|
| **Web app** | Managers | The full product. All setup, configuration and dense data work |
| **Desktop PWA** | Managers | The same web app, installable to the desktop. Already built and wired |
| **Native mobile** | Staff (primary), managers (companion) | Purpose-built on-the-go screens. iOS + Android, via the stores |

The PWA **stays**, positioned as the desktop install. It is not the mobile answer.

## 2. Why native, not responsive web

This is the category standard, not a preference. 7shifts, Homebase and Sona all
ship web dashboards for building the schedule and native apps where staff live
day to day. Outside this category the same split holds: Shopify's app is not the
full store admin, Xero's is not the reconciliation grid.

Two reasons it matters here:

- **Credibility.** Staff expect a work tool to arrive from the App Store or Play
  Store. Our customer has to persuade their team to adopt this; "add this website
  to your home screen" is a harder sell than "download our app".
- **A phone needs different screens, not smaller ones.** The installed PWA today
  shows the manager's Shifts and Staff tabs on a phone and they are unusable.
  That is not a formatting bug to fix. A native app would never show those screens
  at all. Mobile answers "when am I working", "can I swap this", "approve this".
  The dense authoring surfaces belong on a desktop and should stay there.

So the broken mobile layout is not an argument for a responsive pass. It is
evidence that mobile needs its own UI.

## 3. Prerequisites, in order

1. **Phase B.** All six `/api/employee/*` routes are stubbed, and
   `app/api/staff/invite/route.js` still queries `.eq('id')`, `clerk_user_id`,
   `email`, `invite_token`, none of which exist in the current schema. **Staff
   cannot obtain a login at all.** Nothing staff-facing can be built or even
   tested until this is done, on any platform.
2. ~~**Prove Clerk auth from Expo on ONE endpoint.**~~ **DONE, 2026-07-21. It works.**
   Minted a real session JWT via Clerk's Backend API and called the API with only
   an `Authorization: Bearer` header and no cookie, which is exactly what
   `@clerk/clerk-expo` sends. `/api/auth/user-type` returned 200 `{"type":"manager"}`,
   `/api/teams` returned 200 with real data, and `/api/employee/profile` returned
   404 "Staff profile not found", the correct answer for a manager and, importantly,
   404 rather than 401, so the token authenticated and the route logic ran.
   **No middleware change, no auth rework and no token-exchange layer is needed.**
   Clerk 6.34.5 with `clerkMiddleware` already handles bearer tokens on `/api/*`.
3. **Merge instance A's header-based location resolution.** `getOrgScope` here
   resolves the active location from the `shiftly_loc` **cookie only**. Native
   clients cannot set that cookie, so every mobile call would silently resolve to
   the wrong location. Solved already on `jobs-board` (`6a0e9c9`,
   `ACTIVE_LOCATION_HEADER = 'x-shiftly-location'`).

## 4. Build sequence

**Phase B** -> **Clerk Expo spike** -> **staff app** -> **manager companion**.

**Staff app first, deliberately.** It is the higher-value surface, the simpler
one, and the one a customer's whole team will judge the product on. The manager
companion is a convenience on top of a desktop product; the staff app *is* the
product for most of its users.

## 5. Scope per surface

| Desktop web only | Manager mobile | Staff mobile |
|---|---|---|
| Shift pattern authoring (drag and drop) | Glance / readiness | Home: next shift + week |
| Staff CRUD and the availability grid | Generate -> gap list -> publish | My shifts, shift detail |
| Rules configuration | **Inbox approvals** | Open shifts, pick up |
| Opening hours, settings, onboarding | Reports summary | Swaps |
| Full rota grid editing | Payroll CSV via share sheet | Availability |
| Archive browsing, billing | | Time off requests |

**The Inbox is the strongest case for the manager app.** Approving time off with
the coverage cost shown, away from a desk, is genuinely better on a phone than on
a laptop. Everything else manager-side is convenience.

Rota **editing** stays desktop. Tap-to-reassign one cell is fine on a phone;
dragging across a seven column grid is not.

## 6. Design consistency

**`app/components/ui/kit.jsx` cannot be imported into React Native.** It is React
DOM: `<div>`, inline CSS, `backdrop-filter`, `box-shadow` strings, CSS
transitions. Any plan that assumes "just import the kit" fails at the first
component.

What is shareable is the **token layer**: colours, radii, spacing, type scale,
font families, easing. Our `THEMES` object currently mixes these with web-only
values (`blur: 'blur(24px) saturate(180%)'`, shadows as CSS strings,
`ring()`/`lift()` returning CSS), so the agnostic primitives get separated out.

**Start by copying a tokens file into the mobile project.** Not a monorepo.

The earlier plan called for restructuring to `apps/web` + `apps/mobile` +
`packages/tokens`. That is dropped: it moves every path in the repo, collides
badly with instance A's in-flight job board work, moves Vercel's root directory,
and buys convenience rather than capability. If the copies drift enough to hurt,
revisit it then, from a calmer position.

Components are **reimplemented, not shared**. The guarantee is that a Card is the
same pink, the same radius and the same type scale on both, because both read
from one set of primitives. Nothing stronger is achievable across DOM and RN.

## 7. Marketing copy has to change

The site currently promises the opposite of this plan:
- `app/page.jsx` FAQ: *"No app store download needed... Works on any device as a web app."*
- `app/features/page.jsx`: *"No app store download. Works on any device as a web app."*

Once store apps ship, that is wrong. Reframe as: full web app, installable on
desktop, with native apps for iOS and Android. Do this **before** launch, not after.

## 8. Deferred, with eyes open

- **Push notifications: v2.** Needs device token storage per user, Expo push
  credentials, and a send step inside `lib/createNotification`'s fan-out. None of
  it exists. v1 ships on the polling already in place.
- **Offline.** The brief asks for viewing shifts with no signal. Needs a caching
  layer on the staff app; no design yet.
- **App store presence.** Developer accounts, listings, screenshots, privacy
  declarations, review cycles. Lead time here is routinely underestimated and it
  is not engineering work, so start it early rather than at the end.
