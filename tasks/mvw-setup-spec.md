# Shiftly, Setup, Onboarding & the Minimum Viable Week

Canonical product spec for how a business gets set up and how flexibility is
handled. Written 2026-07 during QA of the first release. This is the spine we hold
to as we adapt and build; change it deliberately, not by drift.

---

## 1. The core idea, the Minimum Viable Week (MVW)

Setup captures the **Minimum Viable Week**: the smallest crew that still opens the
doors and covers every operating hour. Not the busy week. Not peak. The **floor**.

- A 100-cover restaurant's MVW might be 2 front of house, 2 kitchen, 1 keyholder.
- A coffee shop's MVW might be 2 baristas: one opens, one closes, a little overlap,
  all hours covered but nobody in "covered covered".

Everything above the floor is **flex**, and flex lives downstream (the rota grid
now, AI-assisted weekly suggestions later). Setup is not where you handle a busy
Friday or a Christmas rush.

**Why MVW is the whole unlock:** it is a scope-cutting device as much as a feature.
Naming setup as "just the minimum" removes the pressure to be complete or perfect,
which is what makes input fast and kills analysis paralysis. It draws the line:
baseline ships now, flexibility and seasonality are explicitly downstream.

**Naming:** use "Minimum Viable Week" / MVW as the internal term. Surface it to
managers in plain language ("let's set up your usual week"). Avoid "Minimum Working
Week" in UK-facing copy, it clashes with the employment meaning of contracted
minimum hours. Test the actual on-screen word with a real manager before committing.

## 2. Principles (the tie-breakers)

1. **Easiest possible input is the north star.** Every setup decision optimises for
   the manager typing as little as possible.
2. **Automation-first; manual is the escape hatch, not the product.** Other tools
   make you rebuild every week by hand. Shiftly rebuilds the MVW instantly every
   week; you only ever touch the deltas. That is the wedge.
3. **Staff serve their own data; the manager inputs the minimum.** Availability, in
   particular, should come from staff, not be typed by the manager.
4. **The companion guides where it is hard and disappears where it is not.**
5. **The deterministic scheduler is the source of truth.** Any AI only ever
   *suggests*; `scheduler.py` enforces rules, contracts and live compliance. The AI
   can never produce a non-compliant rota.

## 3. The end-to-end workflow

1. Manager signs up, completes onboarding (business, locations, teams).
2. Manager adds staff at the **minimum** for a first rota: first name + usual weekly
   hours + email (see §4). Fast path, no dependency on anyone else.
3. Manager invites those staff (the email carries the app link / join code).
4. Staff self-onboard in the Team app: name, contracted + max hours, availability,
   confirm pay. This syncs back; the manager sees who has done it.
5. Manager sets up the **MVW** on the Shifts page, the skeleton crew per team ,
   guided by the companion.
6. Generate the rota: `scheduler.py` fills the MVW for the week, deterministically.
7. Flex for this week: drag-and-drop on the grid now; AI-assisted suggestions later.
8. Publish. Staff see it in the app.

## 4. Staff onboarding + the activation guardrail (the critical decision)

**The trap:** gating the first rota on staff self-onboarding is an adoption wall. A
manager evaluating Shiftly on a Sunday night cannot wait until Monday for their team
to install an app. If the first experience depends on other people acting, most
trials die there.

**The resolution is two speeds:**

**Fast path (first rota, no dependency).** The manager manually adds each person
with the bare minimum:
- First name
- Usual weekly hours
- Email, **mandatory**, because it is how the person is invited to self-serve the rest.

That is enough to generate a usable rota in ~2 minutes. Availability defaults to
open until the staff member sets it.

**Steady state (self-service).** Staff download the **Shiftly Team** app, join by
**code/link**, and enter their own:
- Full name
- Contracted hours and max hours (max capped at 48/week unless a Working Time
  Directive opt-out is recorded, UK-first)
- Availability
- Confirm their pay

This syncs to the manager, who sees a status like "3 of 5 have logged availability".

**What the manager is ever *required* to do:** name + hours + email per person, and
confirm pay. Everything heavy (availability) is self-served. A manual override lets
the manager fill anything in themselves if a staff member drags their heels.

**Join mechanism:** move from the email-matching approach currently prototyped to a
**code/link** join. Hospitality staff often lack a usable work email, and "download
the app, enter this code" is simpler and more robust. Open question: one business-
level code (with manager visibility + ability to remove who joined) vs per-staff
codes.

## 5. The companion

A single, **toggleable, collapsible** assistant (Airtable-panel model, docked, not
an overlay that hides the work). On/off per the user's choice; remembers its state.
It replaces the linear onboarding wizard/tour entirely.

Its jobs, in order of how hard the underlying task is:

1. **Heavy lifting on Shifts, building the MVW.** Coverage-first, one skeleton
   question per team ("what is the fewest people who can open and cover the day?"),
   a live view of the cover building, and a **guardrail**: you cannot finish a team
   while the shifts you built fall short of the floor you stated (warn, with an
   explicit override).
2. **Contextual empty-state guidance.** Example, on an empty Payroll page: "Nothing
   here yet, because wages aren't set. You can do that on the Staff tab, come back
   and I'll have this populated." Conversational, helpful, never blocking.
3. **First-visit page intros (replaces the tour).** The first time a page is opened:
   "New to the Archive? This is where your published rotas live. Any questions? If
   not, minimise me and call me back whenever." Explorative and self-paced, because
   nobody reads a linear wizard.
4. **The activation nudge on the Staff tab.** "Let's get your first rota set up
   quickly: add each person's name and usual hours, and their email so they can set
   their own availability."

Copy principle: warm, brief, genuinely helpful, never wordy. No dashes (house rule).

## 6. Rota builder & flexibility (downstream of MVW)

**Now:** pure `scheduler.py`, deterministic. The MVW is the baseline it fills every
week. The grid is drag-and-drop, so the manager makes any manual change before
publishing. This alone handles one-off flex (a busy Saturday, an event).

**Later (v2):** the companion returns *on the rota builder*: "What's your week
looking like? Any events? Expecting a busy Saturday?" The AI proposes a staffing
shape for that week (e.g. "leaner Monday, extra two on Friday night, cap spend"),
and `scheduler.py` enforces the MVW floor + rest rules + contracts + live compliance
as the deterministic backstop. AI proposes, the scheduler disposes. This is the only
safe way to use AI here.

**Seasonality, split honestly:**
- **One-off** (event, quiet week): handled on the grid now, or by the v2 weekly AI.
- **Recurring** ("Fridays are always busier"): the one thing MVW-plus-drag does not
  fully catch, because dragging every Friday forever is tedious and it is really a
  setup-level truth. This bumps into the schema limit that a shift pattern carries
  one `num_staff_needed` for all its days. Open decision: add per-day staffing to a
  pattern, or leave recurring variation to the weekly flex. Do not solve it now;
  do not let it get silently buried under "just drag it".

## 7. Build sequence (value-first, so it doesn't swallow the mobile work whole)

1. **First-rota fast path.** Minimal manager staff input (name + hours + email) that
   generates a rota with no dependency on staff. Unblocks activation. Highest
   priority, because nothing else matters if trials die at the wall.
2. **Staff self-service.** Code/link join + self-onboard screens (name, contracted +
   max hours with the WTD cap, availability, pay confirm) in the Team app, plus the
   manager's "N of M logged" status and the gate-with-override. This is the
   highest-leverage input reduction.
3. **MVW companion on Shifts.** The skeleton question, the live coverage, the
   below-floor guardrail. Wired to real `/api/shifts`.
4. **Toggleable per-page companion + empty-state prompts.** Retire the onboarding
   tour. This is a framework (first-visit detection, persisted collapse, per-page
   content), bigger than it looks.
5. **(v2) AI weekly-flex suggestions** with scheduler enforcement.

## 8. What exists today vs what this needs (honest gap)

**Exists:** `/api/employee/*` endpoints (shifts, availability, requests, swaps,
profile); **email-based** account claiming (to be replaced by code); an Expo app
foundation (My Shifts, Profile, auth); the setup sandboxes at
`/dashboard/lab/setup-chat` and `/dashboard/lab/setup-companion` as concept proofs
(coverage-first + docked companion feel test).

**Needed:** code/link join; staff self-onboard screens; the WTD 48h cap; manager
staff-status gate + pay confirm; the minimal first-rota input path; the MVW
companion wired to real shift patterns; the per-page companion framework; (v2) the
AI weekly-flex layer.

**Divergence to reconcile:** the prototyped email-matching claim is superseded by
the code/link join described in §4.

## 9. Open decisions (name them, don't drift on them)

- **Surface wording** for MVW, test on a real manager; avoid "minimum working week".
- **Join code shape**, one business code (with manager visibility/removal) vs
  per-staff codes.
- **Recurring day-variation**, per-day staffing on a pattern (schema change) vs
  weekly flex only.
- **First-rota fast path**, is name + hours enough, or does it also want a
  demo/skeleton auto-fill to feel instant?
- **Companion vs tour**, confirm the tour is fully retired in favour of the
  per-page companion, and plan its removal so we don't maintain both.
