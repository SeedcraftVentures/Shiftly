# Task: PostHog analytics on the marketing site (consent-gated)

Goal: see how cold-outreach clickers actually use the site (funnels + session replay),
without recording customer staff PII and without breaking the published privacy policy.

Decisions (confirmed with Andre 2026-11-04):
- Scope: PUBLIC marketing pages only. Never the authenticated `/dashboard`.
- Host: EU cloud (eu.i.posthog.com) for UK/EU data residency.
- Consent: full cookies + a consent banner (UK PECR). Nothing captured, no cookie set, until Accept.
- Replay: mask all inputs.

## Plan
- [ ] Install `posthog-js`.
- [ ] `app/components/analytics/PostHogAnalytics.jsx` — client init, EU host, opted-out by
      default, pageview on route change, HARD-excludes `/dashboard` (stops replay on entering it).
- [ ] `app/components/analytics/ConsentBanner.jsx` — brand-styled, Accept/Decline, links to /privacy.
      Only appears when PostHog is configured AND no decision stored AND not on an excluded route.
- [ ] Mount both in `app/layout.jsx` (guarded: render nothing if no key, so the site is safe pre-key).
- [ ] `.env.example` + `.env.local` — add NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST placeholders.
- [ ] Privacy policy: add PostHog to the sub-processor list (Section 06) + rewrite the Cookies
      section (12) so it no longer says "no third-party analytics", and bump the "last updated" date.
- [ ] Verify: syntax-check new/changed files; confirm no capture path reaches /dashboard.

## Handoff (Andre)
- Create a PostHog project (EU cloud), turn ON Session Replay in project settings.
- Paste the `phc_...` project key into Vercel env (NEXT_PUBLIC_POSTHOG_KEY) + .env.local.
- Redeploy. Banner appears on marketing pages; Accept to start capturing.

## Review (2026-11-04)
Built and verified:
- `posthog-js@^1.445.3` installed; resolves (incl. /react subpath).
- New files: app/components/analytics/{consent.js, PostHogAnalytics.jsx, ConsentBanner.jsx}.
- Wired into app/layout.jsx (Suspense-wrapped, dormant without a key).
- Privacy policy: PostHog added to Section 06 sub-processors; Section 12 cookies rewritten
  (no longer claims "no third-party analytics"); date bumped to 4 Nov 2026.
- Env placeholders in .env.example + .env.local (key intentionally empty).
- All 5 touched files parse clean (Babel). Marketing routes compile clean on dev (/ /features
  /privacy = 200). Dormant state confirmed live: empty key => analytics off, no banner.

Caveat / not yet visually verified: the banner renders client-side only, so SSR/curl can't show
it. It gets its real visual test when a phc_ key is present (preview deploy, or a headless-browser
run with a temporary key). Logic is parse-verified.

Safety property: the authenticated /dashboard is excluded at both init and pageview/replay level,
so customer staff PII is never sent to PostHog.

Still Andre's to do (PostHog): create PostHog EU project, enable Session Replay, add
NEXT_PUBLIC_POSTHOG_KEY to Vercel + .env.local, redeploy.

## Update (2026-11-05): pivot to Vercel Web Analytics (PostHog free tier used on MakersForge)
PostHog can't be set up now (Andre's one free project is on MakersForge). Shipped the free,
no-new-account alternative instead:
- `@vercel/analytics@^2.0.1` installed.
- app/components/analytics/MarketingAnalytics.jsx: renders <Analytics/> ONLY off the dashboard
  (reuses isExcludedPath). Cookieless, no consent banner needed.
- Mounted in app/layout.jsx alongside the (still dormant) PostHog machinery.
- Privacy policy now reflects REALITY: PostHog card removed, Vercel card updated to
  "Hosting & analytics", Section 12 rewritten to the cookieless/no-consent truth, date = 5 Nov.
- Verified: resolves, parses, marketing routes compile clean (200). Vercel Analytics injects
  only on Vercel deploys (no-op locally, expected).
- PostHog code + env placeholders left in place, dormant, for when a key is affordable. If a key
  is ever added, the privacy policy must regain its PostHog/consent language (see lessons.md).
Andre to do: enable Web Analytics in the Vercel dashboard (Analytics tab), redeploy, add UTMs to
mailer links.
