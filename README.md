# Shiftly

Fair shift scheduling SaaS for hospitality and retail.

## Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 16.2 (Turbopack, App Router) | All routes under `app/` |
| Auth | Clerk 6.35 (Organizations enabled) | Owns users, orgs, memberships, permissions |
| Database | Supabase (Postgres + RLS) | App data only — no user/membership tables |
| Styling | Tailwind 3 + CSS custom properties | Design tokens in `globals.css` |
| State | React Query 5 (server) + React Context (client) | No Redux |

### Design tokens

Primary accent: `--shiftly-pink: #FF1F7D` (5% of UI). Light: `--shiftly-pink-light: #FFE4F0`. Dark: `--shiftly-pink-dark: #C71460`. Tailwind: `bg-shiftly-pink`, `text-shiftly-pink-light`, `border-shiftly-pink-dark`. Font: Plus Jakarta Sans. Card radius: 12px.

### Env vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY    # replaces legacy anon key
SUPABASE_SECRET_KEY                      # replaces legacy service_role key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SIGNING_SECRET
```

---

## Folder structure

```
app/
├── (auth)/                         # Auth route group (no dashboard layout)
│   ├── sign-in/page.jsx
│   ├── sign-up/page.jsx
│   └── onboarding/
│       ├── page.jsx                # Server component — guards if already onboarded
│       ├── components/
│       │   └── OnboardingWizard.jsx
│       ├── hooks/
│       │   └── useOnboardingState.js
│       └── payment/
│           └── page.jsx            # "Skip payment (dev)" placeholder
│
├── (app)/                          # App route group (dashboard layout wraps these)
│   ├── dashboard/
│   │   ├── layout.jsx              # Server component — role enforcement
│   │   ├── page.jsx                # Server redirect → /dashboard/[locationId]
│   │   ├── [locationId]/
│   │   │   ├── page.jsx            # Dashboard home (rotas, stats)
│   │   │   └── location-settings/
│   │   │       ├── page.jsx
│   │   │       ├── hooks/useLocationSettings.js
│   │   │       └── sections/       # Details, Hours, Rules, Teams tabs
│   │   ├── organization/
│   │   │   ├── page.jsx            # Org settings (tabs: Details, Locations, Members)
│   │   │   ├── add-location/page.jsx
│   │   │   ├── components/AddLocationWizard.jsx
│   │   │   └── tabs/
│   │   └── shifts/                 # TODO: move under [locationId]
│   │       ├── page.jsx
│   │       ├── hooks/useShifts.js
│   │       └── components/
│   └── my/                         # Staff app (placeholder)
│       ├── layout.jsx              # Staff-only role enforcement
│       └── page.jsx
│
├── api/
│   ├── organization/route.js       # GET org + locations, PATCH org
│   ├── locations/
│   │   ├── route.js                # GET list locations in active org
│   │   ├── full/route.js           # POST create location + children
│   │   └── [locationId]/
│   │       ├── route.js            # PATCH/DELETE location
│   │       ├── profile/route.js    # GET full location profile
│   │       ├── hours/route.js      # PATCH day hours
│   │       ├── rules/route.js      # PATCH scheduling rules
│   │       └── teams/route.js      # POST create team
│   ├── teams/[teamId]/
│   │   ├── route.js                # PATCH/DELETE team
│   │   └── hours/route.js          # PATCH team hour overrides
│   ├── shifts/route.js             # GET/POST shift patterns
│   ├── onboarding/route.js         # POST: creates Clerk org + Supabase data
│   ├── pending-onboarding/route.js # GET/POST/DELETE wizard state
│   ├── me/last-location/route.js   # GET/PATCH via Clerk metadata
│   ├── webhooks/clerk/route.js     # Svix-verified Clerk webhooks
│   ├── notifications/route.js      # GET/PUT
│   └── rotas/                      # TODO: refactor to new schema
│       ├── route.js
│       └── [id]/route.js
│
├── components/
│   ├── ui/                         # Primitives (Button, TextField, Tabs, etc.)
│   │   └── index.js                # Barrel export
│   ├── layout/                     # Layout chrome
│   │   ├── DesktopTopBar.jsx
│   │   ├── PageHeader.jsx
│   │   └── ReactQueryProvider.jsx
│   ├── navigation/                 # Sidebar + mobile nav
│   │   ├── NavigationSideBar.jsx   # Thin shell (~60 lines)
│   │   ├── config/navItems.js      # Nav links as data
│   │   └── components/             # Desktop/Mobile/LocationSwitcher/NavItem
│   └── wizard/                     # Shared wizard infrastructure
│       ├── WizardShell.jsx         # variant="fullscreen" | "inline"
│       └── steps/                  # Reusable across onboarding + add-location
│           ├── OrganizationStep.jsx
│           ├── LocationBasicsStep.jsx
│           ├── LocationHoursStep.jsx
│           ├── TeamsStep.jsx
│           └── StaffStep.jsx
│
├── lib/
│   ├── constants/                  # All app constants
│   │   ├── db.js                   # DB_TABLES, STORAGE_KEYS, QUERY_KEYS
│   │   ├── days.js                 # DAYS_FULL, DAYS_SHORT
│   │   ├── currencies.js
│   │   ├── defaults.js             # DEFAULT_SHIFT_LENGTHS, DEFAULT_LOCATION_RULES, etc.
│   │   ├── palette.js              # Team color assignment
│   │   ├── industries.js
│   │   ├── teamPresets.js          # Industry-specific team suggestions
│   │   └── index.js                # Barrel
│   ├── contexts/
│   │   └── LocationContext.jsx     # Client-side location list + switching
│   ├── hooks/
│   │   ├── useLocationWizardState.js
│   │   ├── useNotifications.js
│   │   ├── useEscapeKey.js
│   │   └── useOutsideClick.js
│   ├── server/                     # Server-only utilities (never imported client-side)
│   │   ├── getUserRoles.js         # { isManager, isStaff, hasOnboarded }
│   │   ├── getCurrentOrg.js        # { userId, orgId, has }
│   │   ├── lastLocation.js         # Clerk publicMetadata read/write
│   │   └── createLocationWithChildren.js
│   ├── supabase/
│   │   ├── server.js               # createSupabaseServerClient (RLS) + Admin client
│   │   └── client.js               # useSupabaseClient hook (client-side, for realtime)
│   ├── utils/
│   │   ├── timeUtils.js            # Decimal ↔ timetz ↔ label conversions
│   │   ├── shiftUtils.js           # resolveHoursForDay, getCoverageGaps
│   │   └── currencyUtils.js
│   └── icons.js                    # SVG icon components
│
└── globals.css                     # CSS custom properties, typography classes

proxy.js                            # Clerk middleware (public routes, auth redirect)
```

---

## Authentication & authorization

### How it works

Clerk owns all identity. There are **no `Users` or `Organization Members` tables** in Supabase.

```
Clerk session cookie
  → proxy.js (Clerk middleware) validates every request
  → Server components / API routes call auth() → { userId, orgId, has }
  → createSupabaseServerClient() passes Clerk JWT via getToken()
  → Supabase RLS reads org_id from JWT claim: auth.jwt() -> 'o' ->> 'id'
```

**Important:** Clerk v2 JWT uses `o: { id, rol, slg }` — not a flat `org_id` claim. The RLS helper `current_org_id()` reads `auth.jwt() -> 'o' ->> 'id'`.

### Roles

| Role | How determined | Experience |
|------|---------------|------------|
| Manager | `auth().orgId` is not null (user is in a Clerk org) | `/dashboard/*` |
| Staff | Row in `Staff` table with `user_id = clerkId` | `/my/*` (placeholder) |
| Both | Both conditions true | Can switch views (not yet built) |
| Neither | Fresh signup | → `/onboarding` |

### Permissions

Configured in Clerk dashboard under Organization features. Checked via `has({ permission: 'org:X:manage' })`.

| Permission | Admin | Member | Gates |
|------------|-------|--------|-------|
| `org:locations:manage` | ✓ | | Create/edit/delete locations |
| `org:locations:read` | ✓ | ✓ | View locations |
| `org:staff:manage` | ✓ | ✓ | Add/edit/remove staff, teams |
| `org:shifts:manage` | ✓ | ✓ | Create/edit shift patterns |
| `org:rotas:manage` | ✓ | ✓ | Generate/edit/publish rotas |
| `org:settings:manage` | ✓ | | Edit org name, industry, currency |
| `org:payroll:read/manage` | ✓ | | Payroll (future) |
| `org:reports:read/manage` | ✓ | | Reports (future) |

### RLS helper functions

```sql
current_user_id()                      -- auth.jwt() ->> 'sub'
current_org_id()                       -- auth.jwt() -> 'o' ->> 'id'
user_has_org_access(org_id text)       -- org_id = current_org_id()
user_has_location_access(loc_id uuid)  -- location's org matches current_org_id()
```

Chain: `Organizations ← Locations ← Teams ← Staff / Shift Patterns / Team Day Hours`.

### Server helpers

| File | Purpose |
|------|---------|
| `getUserRoles.js` | `{ isManager, isStaff, hasOnboarded, orgId }`. Falls back to Clerk API if session cookie hasn't propagated. Uses admin client. |
| `getCurrentOrg.js` | Thin wrapper: `{ userId, orgId, has }` from `auth()`. |
| `lastLocation.js` | Per-org last-location via Clerk `publicMetadata.lastLocationByOrg`. |
| `createLocationWithChildren.js` | Atomic: Location + Day Hours + Rules + Teams + Staff. |

---

## API route patterns

Every route follows:

```js
const { userId, orgId, has } = await auth()
if (!userId) → 401
if (!orgId) → 404 "No active organization"
if (!has({ permission: 'org:X:manage' })) → 403
// RLS automatically scopes queries to orgId
```

**Supabase clients:**
- `createSupabaseServerClient()` — RLS-aware via Clerk JWT. Default for all reads/writes.
- `createSupabaseAdminClient()` — Bypasses RLS. Only used in: webhooks, onboarding (before session has org_id), `getUserRoles`.

---

## User flows

### Signup → Dashboard

```
/sign-up → Clerk creates user
  → /onboarding → 5-step wizard
  → POST /api/pending-onboarding (saves wizard state as JSON)
  → /onboarding/payment → "Skip payment (dev)"
  → POST /api/onboarding:
      1. clerkClient.organizations.createOrganization({ createdBy: userId })
      2. Insert Supabase Organizations row (PK = Clerk org_xxx id)
      3. createLocationWithChildren()
      4. Delete pending_onboardings row
  → setActive({ organization: org_id })
  → window.location.href = '/dashboard'  (full page nav for cookie propagation)
  → Dashboard layout → getUserRoles() → redirect to /dashboard/[locationId]
```

### Adding a location

```
Sidebar "Add location" → /dashboard/organization/add-location
  → 4-step inline wizard (variant="inline")
  → POST /api/locations/full → createLocationWithChildren()
  → Redirect to new location's settings
```

### Webhooks

| Event | Action |
|-------|--------|
| `organization.updated` | Sync name to Supabase |
| `organization.deleted` | Delete Supabase org row (FK cascade) |
| `user.*`, `organizationMembership.*` | No-op |
| `subscription.*` | Stubbed for billing (Phase 6) |

---

## Database schema

All PKs are `uuid` unless noted. `organization_id` is `text` (Clerk `org_xxx`). All FKs cascade on delete.

### Organizations
| Column | Type | Notes |
|--------|------|-------|
| organization_id | text PK | Clerk org id |
| organization_name | text | |
| industry | text | Hospitality / Retail / Other |
| currency | text | ISO code |
| onboarding_completed | boolean | |

### Locations
| Column | Type | Notes |
|--------|------|-------|
| location_id | uuid PK | |
| organization_id | text FK | |
| name | text | |
| address | text | |
| currency | text NULL | NULL = inherit from org |
| min_wage | numeric NULL | |
| max_consecutive_hours | numeric | |
| shift_lengths | integer[] | Default `[4, 6, 8]` |

### Location Day Hours
One row per open day. No row = closed that day.

| Column | Type | Notes |
|--------|------|-------|
| location_id | uuid FK | |
| day | text | Monday–Sunday |
| opening_time / closing_time | timetz | Business hours (display) |
| start_time / end_time | timetz | Shift scheduling window |

### Location Rules
One rule set per location (`UNIQUE(location_id)`).

| Column | Type |
|--------|------|
| no_clopening | boolean |
| no_double_shifts | boolean |
| fair_weekend_distribution | boolean |
| enforce_max_consecutive_days + max_consecutive_days | boolean + integer |
| enforce_min_days_off + min_days_off | boolean + integer |
| enforce_rest_between_shifts + min_rest_hours | boolean + numeric |

### Teams
| Column | Type | Notes |
|--------|------|-------|
| team_id | uuid PK | |
| location_id | uuid FK | |
| name | text | e.g. "Front of House" |
| color / color_light | text NULL | Hex, assigned at creation |

### Team Day Hours
Overrides location hours for a specific team. No row = inherit.

| Column | Type |
|--------|------|
| team_id | uuid FK |
| day | text |
| start_time_override / end_time_override | timetz NULL |

### Staff
| Column | Type | Notes |
|--------|------|-------|
| staff_id | uuid PK | |
| team_id | uuid FK | |
| name | text | |
| role | text | e.g. "Barista" |
| user_id | text NULL | Clerk id (set on invite accept) |
| contracted_hours / max_hours | numeric NULL | |
| availability | jsonb | |

**Staff are NOT Clerk org members** — protects against the 20-member free tier limit.

### Shift Patterns
| Column | Type | Notes |
|--------|------|-------|
| shift_id | uuid PK | |
| shift_team | uuid FK → Teams | |
| shift_name | text | |
| shift_type | text | `open` / `close` / `fixed` |
| start_time / end_time | numeric NULL | Decimal hours (9.5 = 09:30) |
| days | integer[] | `[0,1,2,3,4]` = Mon–Fri |
| break_duration | numeric | Hours |
| break_is_paid / is_keyholder | boolean | |
| num_staff_needed | integer | |

**Shift type resolution:** `open` anchors start to location/team open; `close` anchors end to close; `fixed` uses stored times directly. Resolution chain: Team Day Hours override → Location Day Hours fallback. See `shiftUtils.js`.

### Rotas
| Column | Type | Notes |
|--------|------|-------|
| rota_id | uuid PK | |
| location_id | uuid FK | |
| week_start | date | `UNIQUE(location_id, week_start)` |
| status | enum | Draft / Generated / Published |
| published_by | text NULL | Clerk user id |

API routes for rotas (`/api/rotas/*`) still use old schema and need refactoring.

### Pending Onboardings
| Column | Type |
|--------|------|
| clerk_user_id | text PK |
| payload | jsonb |

Ephemeral. Deleted after onboarding completes.

### Notifications, Requests
Exist but not yet refactored. RLS enabled, no active read policies.

---

## Key conventions

- **DB_TABLES**: Always reference tables via `DB_TABLES.xxx`, never hardcode table names
- **API routes**: Always `auth()` first, check userId/orgId/permission, then work
- **Server vs client**: `app/lib/server/` = server-only. Never import in client components.
- **Wizard pattern**: `WizardShell` + shared step components. `variant="fullscreen"` for onboarding, `variant="inline"` for add-location.
- **Team colors**: Always use `assignTeamColor(index)` from `palette.js`
- **Time formats**: Postgres stores `timetz`. UI uses decimal hours. Convert via `timeUtils.js`.

---

## Development queue

### Immediate (shifts-refactor branch)
1. Move shifts page under `/dashboard/[locationId]/shifts`
2. Update `useShifts` to accept `locationId`
3. Update `/api/shifts` to require `?location_id=`

### Near-term
4. Staff page — pull from main, integrate with new schema
5. Rotas API — refactor to match `Rotas` table schema
6. Members tab — Clerk `<OrganizationProfile />` or custom invite UI
7. Org switcher — `<OrganizationSwitcher />` in topbar
8. Staff app (`/my`) — shifts view, swap requests, availability
9. Role switcher — "Switch to staff view" in avatar menu

### Later
10. Billing — wire Clerk billing, `subscription.created` webhook
11. Notifications/Requests — refactor, add RLS policies
12. OR-Tools scheduler — refactor to use Shift Patterns schema
