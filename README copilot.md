# Shiftly

Shiftly is a workforce scheduling platform for hospitality and retail teams. Managers can define staffing rules, generate fair rotas, publish schedules, handle employee requests, and export payroll/reporting data from a single workspace.

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Available Scripts](#available-scripts)
9. [Running the Python Scheduler Locally](#running-the-python-scheduler-locally)
10. [API Overview](#api-overview)
11. [Scheduling Engine Details](#scheduling-engine-details)
12. [Authentication and Authorization](#authentication-and-authorization)
13. [Billing and Subscription](#billing-and-subscription)
14. [Notifications and Communication](#notifications-and-communication)
15. [Reports and Payroll](#reports-and-payroll)
16. [Deployment](#deployment)
17. [Troubleshooting](#troubleshooting)
18. [Security Notes](#security-notes)
19. [Known Limitations](#known-limitations)
20. [Contributing](#contributing)

## Overview

Shiftly supports two primary user experiences:

- Manager experience: Build and manage teams, staff, shifts, rules, generated rotas, requests, notifications, and reporting.
- Employee experience: View assigned shifts, update availability, browse open shifts, and submit time-off or swap requests.

The app is built with Next.js App Router and uses Supabase as the data layer. Authentication is handled by Clerk. Schedule generation can call an external Python OR-Tools scheduler service for constraint-based rota generation.

## Core Features

- Multi-team workspace management
- Staff roster and contract hour tracking
- Shift templates and rota generation (single or multi-week)
- Rule-aware scheduling (availability, hours, fairness constraints)
- Employee request workflows (time off, swaps, open shifts)
- Notifications, announcements, and escalation flows
- Payroll cost calculation and export
- Labour trend and CSV reporting
- Stripe checkout, portal, and webhook integration
- PWA support for installable app behavior

## Tech Stack

### Frontend and App Runtime

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 3
- TanStack React Query
- Clerk (auth and session management)

### Backend and Data

- Next.js Route Handlers under `app/api`
- Supabase (`@supabase/supabase-js`) as the primary database/API client

### Scheduling Service

- Python (Flask + Flask-CORS)
- Google OR-Tools CP-SAT solver

### Integrations

- Stripe (checkout, customer portal, webhook)
- Resend (staff invite email)
- Next PWA plugin (`@ducanh2912/next-pwa`)

### Deployment and Build

- Netlify configuration present (`netlify.toml`)
- Node.js engine pinned to `22.x`

## Architecture

High-level request flow:

1. User interacts with pages in `app`.
2. Pages call internal API routes in `app/api/*`.
3. API routes read/write Supabase tables.
4. Rota generation routes transform app data and call the Python scheduler (`/schedule`).
5. Scheduler returns allocations and diagnostics to Next.js APIs.
6. APIs return structured results to UI for rendering and manager actions.

Auth and access model:

- Clerk middleware protects non-public routes.
- Public routes include landing, sign-in/sign-up, invites, employee routes, and webhook endpoints.
- API routes are intentionally allowed by middleware and enforce auth checks inside handlers where needed.

## Project Structure

```text
app/
	(auth)/                    # Authenticated and role-aware pages
		dashboard/               # Manager dashboard and operations
		employee/                # Employee-facing app
		sign-in/ sign-up/
	api/                       # Route handlers for domain features
		generate-rota/
		generate-rota-ortools/
		shifts/ staff/ requests/ rules/
		payroll/ reports/ notifications/
		stripe/ onboarding/ teams/
components/                  # Shared UI components
lib/                         # Shared services/utilities
python-scheduler/            # Flask + OR-Tools scheduling service
public/                      # Static assets (icons/screenshots/fonts)
```

## Getting Started

### Prerequisites

- Node.js 22.x
- npm 10+
- Python 3.10+ (recommended for OR-Tools compatibility)
- A Supabase project
- A Clerk project
- Optional: Stripe and Resend accounts for billing/email flows

### 1. Install JavaScript dependencies

```bash
npm install
```

### 2. Create local environment file

Copy `.env.example` to `.env.local` and fill all required values.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### 3. Start the Next.js app

```bash
npm run dev
```

### 4. Start the Python scheduler (optional but recommended)

If you want local scheduler generation instead of remote service, run the Python service and set `PYTHON_SCHEDULER_URL=http://localhost:10000`.

See [Running the Python Scheduler Locally](#running-the-python-scheduler-locally).

## Environment Variables

Variables currently referenced in code:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key for client-safe reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server routes) | Supabase service key for privileged server operations |
| `NEXT_PUBLIC_APP_URL` | Recommended | Base app URL for redirects and links |
| `PYTHON_SCHEDULER_URL` | Recommended | URL of Python scheduling API (`/schedule`) |
| `STRIPE_SECRET_KEY` | Required for billing routes | Server-side Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Required for Stripe webhook | Signature verification |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` | Required for checkout UI | Monthly plan price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` | Required for checkout UI | Annual plan price ID |
| `RESEND_API_KEY` | Required for invite email sending | Resend API key |
| `ANALYZE` | Optional | Enables Next bundle analyzer when `true` |
| `NODE_ENV` | Runtime-provided | Environment mode behavior |

Suggested `.env.local` template:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
PYTHON_SCHEDULER_URL=http://localhost:10000

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_ANNUAL=

RESEND_API_KEY=
ANALYZE=false
```

Note: Clerk keys are required by the auth provider runtime even if they are not directly read through `process.env` in application code.

## Available Scripts

From `package.json`:

- `npm run dev` - Start local development server (Turbopack)
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run Next/ESLint checks

## Running the Python Scheduler Locally

From `python-scheduler`:

1. Create and activate a Python virtual environment.
2. Install dependencies.
3. Start Flask app.

```bash
cd python-scheduler
python -m venv .venv
source .venv/Scripts/activate   # Git Bash on Windows
pip install -r requirements.txt
python app.py
```

Service defaults:

- Base URL: `http://localhost:10000`
- Health endpoint: `GET /health`
- Schedule endpoint: `POST /schedule`

Set in `.env.local`:

```env
PYTHON_SCHEDULER_URL=http://localhost:10000
```

## API Overview

Domain groups under `app/api`:

- Authentication and user type: `auth/user-type`
- Onboarding and workspace setup: `onboarding`, `teams`, `locales`
- Staff and shifts: `staff`, `shifts`, `rules`, `rotas`
- Employee app endpoints: `employee/availability`, `employee/shifts`, `employee/open-shifts`, `employee/requests`, `employee/swap-options`, `employee/profile`
- Rota generation: `generate-rota`, `generate-rota-ortools`
- Requests and notifications: `requests`, `notifications`, `notifications/announce`, `notifications/escalations`
- Payroll and reporting: `payroll`, `payroll/costs`, `payroll/export`, `reports/labour`, `reports/trend`, `reports/export-csv`
- Billing: `stripe/checkout`, `stripe/portal`, `stripe/webhook`, `subscription`
- Utilities/import: `import/parse`, `verify-password`, `waitlist`

## Scheduling Engine Details

The Python scheduler (`python-scheduler/scheduler.py`) uses OR-Tools CP-SAT and enforces core constraints:

- Required staffing coverage per shift
- Contracted/minimum hours and maximum hours bounds
- Availability constraints (supports multiple formats)
- Max one shift per person per day
- Optional rule toggles (for example no-clopening)
- Multi-week variation constraints to avoid repeated identical schedules

When no feasible schedule exists, the solver returns diagnostics with likely causes and suggested corrective actions (for example staffing shortage, incompatible contracted hours, or availability conflicts).

## Authentication and Authorization

- Clerk is used for sign-in/sign-up and user session context.
- `middleware.js` defines public routes and protects manager routes.
- Employee users are redirected to the employee surface.
- API handlers perform route-level auth checks where required.

## Billing and Subscription

Stripe integration includes:

- Checkout session creation (`app/api/stripe/checkout`)
- Customer portal session (`app/api/stripe/portal`)
- Webhook processing (`app/api/stripe/webhook`)

Pricing IDs are selected from env vars for monthly/annual plans.

## Notifications and Communication

- In-app notifications APIs for read/unread and list retrieval
- Announcement route for team-wide messaging
- Escalation route for request follow-up flows
- Staff invitation route can send email via Resend

## Reports and Payroll

Current reporting/payroll API surface includes:

- Labour reporting endpoints
- Trend reporting endpoint
- CSV export endpoint
- Payroll cost and export endpoints

The app also includes helper utilities for payroll document generation under `lib`.

## Deployment

### Netlify

`netlify.toml` config:

- Build command: `npm run build`
- Publish directory: `.next`
- Uses `@netlify/plugin-nextjs`

### Scheduler Hosting

The app can use a hosted scheduler service via `PYTHON_SCHEDULER_URL`.

Recommended deployment model:

- Deploy Next.js app on Netlify
- Deploy Python scheduler as separate service (for example Render/Fly/Container host)
- Configure CORS and set secure environment variables in both environments

## Troubleshooting

### Missing Supabase variables

Symptom: API routes return server configuration errors.

Fix:

- Ensure `.env.local` exists (exact filename)
- Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart dev server after env changes

### Scheduler call failures

Symptom: rota generation errors with scheduler HTTP failures.

Fix:

- Verify `PYTHON_SCHEDULER_URL`
- Check scheduler `/health`
- Confirm scheduler dependencies installed and service running

### Stripe webhook errors

Symptom: webhook returns signature verification failures.

Fix:

- Confirm `STRIPE_WEBHOOK_SECRET`
- Ensure raw request body handling remains unchanged in webhook route

### Invite emails not sending

Symptom: staff invite API succeeds partially or fails on send.

Fix:

- Set valid `RESEND_API_KEY`
- Check sender/domain verification in Resend

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Keep all production env vars in your hosting secret manager.
- Keep webhook secrets and Stripe secret keys server-only.
- Review API routes periodically for auth checks before data mutations.

## Known Limitations

- TypeScript build errors are currently ignored in `next.config.js` (`ignoreBuildErrors: true`).
- Repository currently relies heavily on runtime/manual validation; no full automated test suite is present.
- There are parallel rota generation routes (`generate-rota` and `generate-rota-ortools`) that should be kept behaviorally aligned.

## Contributing

Recommended workflow:

1. Create a feature branch.
2. Keep changes scoped by domain (UI/API/scheduler).
3. Run lint checks before opening a PR.
4. Validate critical flows manually:
	 - Manager sign-in and dashboard load
	 - Staff/shifts CRUD
	 - Rota generation
	 - Request submission/approval
	 - Payroll/report export
	 - Stripe checkout/portal (if modified)

If you maintain this repository over time, add:

- API request/response examples per route
- Database schema documentation
- Automated tests (unit + integration)
- Release and migration notes
