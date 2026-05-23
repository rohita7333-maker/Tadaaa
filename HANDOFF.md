# TaDaaaa — Session Handoff (2026-05-23)

## Status: LOCAL-READY · DEPLOY-PENDING (Phase A + B1 + B2 on feat/sophistication)

All P0 + P1 + P2 closed. Phase A + B1 + B2 shipped. All SQL migrations applied via Supabase MCP. Code pushed to GitHub. Local dev fully wired.

**Tests:** 47/47 pass · **tsc:** 0 errors · **lint:** 0 errors

**Completed since last handoff:**
- ✅ All 8 SQL migrations applied directly via Supabase MCP (no manual copy-paste)
- ✅ GitHub repo: https://github.com/rohita7333-maker/Tadaaa (both branches pushed)
- ✅ `ANTHROPIC_API_KEY` added to `.env.local` — AI drafter (B1) works locally
- ✅ graphify updated — 535 nodes, 1012 edges, 51 communities

**Next actions:**
1. Get Stripe test keys → add to `.env.local` (payments broken until then)
2. Get Resend API key → add to `.env.local` (emails silent-fail until then)
3. Connect GitHub repo to Vercel → set prod env vars → deploy
4. Merge `feat/sophistication` → `main` before Vercel deploy

---

## Quick Status Table

| Layer | State | Notes |
|---|---|---|
| TypeScript | exit 0 | `npx tsc --noEmit` |
| Tests | 47/47 pass | `npm test` (vitest) |
| Lint | 0 errors | 10 warnings (intentional) |
| Browser QA | 0 console errors | Playwright probed `/`, `/auth/signin`, `/auth/signup`, `/auth/verify-email`, `/pricing`, `/settings` |
| Google OAuth | Verified live | Provider enabled in Supabase; client ID + secret configured in Google Cloud |
| Dev server | http://localhost:3000 | Restart cleanly via `npm run dev` from `surprise-invite/` |
| Branch | feat/sophistication | 15 commits ahead of main — merge when ready to deploy |
| GitHub | pushed | https://github.com/rohita7333-maker/Tadaaa |
| SQL migrations | all applied | via Supabase MCP 2026-05-23 |
| ANTHROPIC_API_KEY | .env.local ✅ | AI drafter works locally |
| Stripe | .env.local placeholder | need real test keys |
| Resend | .env.local empty | emails silent-fail |

---

## Total fixes shipped

- **14 P0** ship-blockers (Stripe webhook hardening, rate limiter, atomic claims, view-count race, etc.)
- **25 P1** (RSVP, paywall, retries, unsubscribe, tests, error boundaries, PWA, onboarding, etc.)
- **8 P2** (lint baseline cleared, CSP tightened, aria-labels, VideoPlayer fallback, etc.)
- **3 SSR/CSR hydration** mismatches (LandingShell, OnboardingModal, create/page.tsx)
- **1 dev-server reframe** (Google "provider not enabled" → friendly toast)

Full per-item breakdown lives in `memory/diary.md`.

---

## P0 — DONE

| # | Area | Fix |
|---|---|---|
| 1 | Stripe webhook tier-mint | `claim_stripe_event` dedupe + `verify_stripe_customer` binding |
| 2 | Stripe Plus invite mapping | `stripe_session_id` preferred lookup, UNPAID-of-theme fallback |
| 3 | Video DoS | Per-user 5/hr + atomic `.neq("processing").select()` claim |
| 4 | Auth IP rate limits | signUp 5/min, signIn 10/min, magicLink 3/min, reset 3/min |
| 5 | DB-backed rate limiter | `consume_rate_limit` RPC; fails OPEN |
| 6 | View-count race | `increment_view_count RETURNS INTEGER`; gate on `newCount === 1` |
| 7 | `getInviteBySlug` active filter | is_active + status + expires_at |
| 8 | Cron split-brain | Sets both `status='expired'` AND `is_active=false` |
| 9 | Google OAuth try/catch | AuthForm `handleGoogle` w/ finally |
| 10 | Magic-link DOM antipattern | `getValues("email")` via react-hook-form |
| 11 | Answer route HTTP 410 | Rejects inactive / expired |
| 12 | Schema tighten | datetime() check, 10-question cap, 64-char theme |
| 13 | Premium theme paywall | `createInvite` rejects premium when not Unlimited |
| 14 | Report API hardening | `inviteId` existence check |

## P1 — DONE (25 items)

| # | Area | Fix |
|---|---|---|
| 15 | RSVP black-hole | `invite_rsvps` table + `/api/invite/rsvp` + button wired + dashboard count |
| 16 | Answer-drop retry | QuestionScreen 3× retry w/ backoff |
| 17 | Required-question gate | Client blocks advance on retry exhaustion |
| 18 | Tier expiry honoured | `/create` downgrades stale Unlimited to free |
| 19 | Pricing CTAs wired | `PricingCTA` client component; Unlimited → checkout |
| 20 | Premium theme button | `handlePremiumClick` → Stripe; sessionStorage unlock on return |
| 21 | deleteInvite storage purge | Video + photos cleaned |
| 22 | deleteAccount session ordering | signOut BEFORE deleteUser; full storage purge |
| 23 | (covered by 21) | — |
| 24 | Avatar upload rate limit | 5/hr per user |
| 25 | CountdownReveal | `useMemo` target Date |
| 26 | Unsubscribe link + handler | HMAC tokens, `/api/unsubscribe` GET+POST |
| 27 | Welcome email dedup | `profiles.welcomed_at` gate; fires once from `/auth/callback` |
| 28 | Verify-email holding screen | `/auth/verify-email` brand-styled |
| 29 | Magic-link Terms gate | `shouldCreateUser: false` |
| 30 | Notify default-on + auto-upsert | view + answer routes use `maybeSingle()` |
| 31 | updatePassword | Requires currentPassword + reverify + rate-limit |
| 32 | Auth callback allowlist | `safeNext()` blocks open-redirect |
| 33 | Settings change-password | ChangePasswordForm wired |
| 34 | Monthly cron batching | `BATCH_SIZE=25` + `Promise.allSettled` |
| 35 | Test suite | Vitest + 29 tests |
| 36 | Per-route error boundaries | dashboard, create, surprise |
| 37 | `vercel.json` | Cron schedule registered |
| 38 | PWA | `app/manifest.ts` + dynamic `icon1`/`icon2` |
| 39 | Onboarding modal | Hallmark-designed, sessionStorage-persisted |
| 40 | View-fetch URL hop | `logInviteViewBySlug` shared lib |

## P2 — DONE

- Lint baseline cleared (6 errors → 0); 10 warnings intentional
- VideoPlayer onError + skip
- PhotoCarousel dot aria-label + aria-current
- Navbar avatar aria-label
- `releaseSounds(names?)` helper
- LottieAnimation orphan deleted
- CSP: `'unsafe-eval'` dev-only via NODE_ENV; `frame-ancestors 'none'`, `form-action 'self'`, `upgrade-insecure-requests`
- `.nvmrc` pins Node 22

## Hydration fixes (caught via Playwright)

- `LandingShell` — `useState(false)` + `useEffect` sync from sessionStorage
- `OnboardingModal` — same pattern
- `create/page.tsx` — `useState([])` / `useState("warm-embrace")` + `useEffect` hydrate from sessionStorage + URL
- Pattern: SSR-safe defaults; never read `window`/`storage`/`matchMedia` in `useState(() => …)` initializer. Lint rule `react-hooks/set-state-in-effect` disabled per-line with rationale.

## Provider-error reframe (latest)

- `signInWithGoogle` intercepts `"Unsupported provider: provider is not enabled"` and re-frames to: "Google sign-in isn't configured yet. Use email + password or the magic link."
- User has since enabled the provider in Supabase and added Google Cloud OAuth client. Live test via Playwright: signin → `accounts.google.com` reached with correct `client_id` + `redirect_uri`.

---

## SQL Migrations Required (run in Supabase SQL Editor in this order)

```
sql/increment_view_count.sql       # UPDATED — RETURNS INTEGER
sql/stripe_events.sql              # NEW — events dedupe + claim_stripe_event()
sql/rate_limits.sql                # NEW — rate-limit table + consume_rate_limit()
sql/stripe_customers.sql           # NEW — profiles.stripe_customer_id + verify_stripe_customer()
sql/invite_rsvps.sql               # NEW — RSVP table + rsvp_count()
sql/profiles_welcomed_at.sql       # NEW — profiles.welcomed_at flag
sql/account_audit.sql              # NEW (Phase A) — audit log table + RLS
sql/ai_drafts.sql                  # NEW (Phase B1) — AI draft log + RLS  ✓ ALREADY RUN
sql/invite_contributions.sql       # NEW (Phase B2) — contributions table + RLS + invites.accept_contributions
```

All idempotent (`CREATE OR REPLACE` / `IF NOT EXISTS`).

## Env Vars

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App (MUST match dev port — mismatch = OAuth callback 500)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Cron + Unsubscribe HMAC (same secret powers both)
CRON_SECRET=

# Phase A — Sentry, PostHog, Sightengine (fail-open when unset)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
POSTHOG_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=

# Phase B1 — AI invite drafter (TODO: add to Vercel before deploy)
ANTHROPIC_API_KEY=
```

## Supabase Dashboard — required config

1. **Authentication → Providers → Google → Enabled** ✓ (done)
2. **Authentication → URL Configuration**:
   - **Site URL** = `http://localhost:3000` (dev) — update before prod deploy
   - **Redirect URLs** allowlist: `http://localhost:3000/auth/callback`, `http://localhost:3000/**`, plus prod URLs

## Google Cloud Console — required config

1. **APIs & Services → Credentials → OAuth 2.0 Client**:
   - **Authorized JavaScript origins**: `http://localhost:3000`, `https://xrlmnlknymgakswsbawk.supabase.co`
   - **Authorized redirect URIs**: `https://xrlmnlknymgakswsbawk.supabase.co/auth/v1/callback`

---

## Dev Server Runbook

1. From `tadaaaa/surprise-invite/`: `npm run dev`
2. If Tailwind / Turbopack errors after a workspace change: `rm -rf .next node_modules/.cache && npm run dev`
3. Never `npm install` at `/ClaudeCodeProject/` or `/tadaaaa/` (parent dirs). Always cd into `surprise-invite/` first.
4. `NEXT_PUBLIC_APP_URL` MUST match the actual dev port (default 3000). Port mismatch = OAuth callback 500.

## Deploy Checklist

1. Run the 6 SQL files in Supabase SQL Editor in order
2. Confirm all env vars in Vercel project settings
3. Update Supabase **Site URL** to prod URL
4. Add prod URL to Supabase **Redirect URLs** allowlist
5. Add prod URL to Google Cloud Console **Authorized JavaScript origins**
6. Configure Stripe webhook endpoint pointing to `https://<prod>/api/stripe/webhook` with the matching `STRIPE_WEBHOOK_SECRET`
7. `git push` → Vercel auto-deploys → cron registers from `vercel.json`
8. Smoke-test: `/auth/signup` → email confirm → `/dashboard`; create invite → share link → view; PWA install
9. Stripe CLI: `stripe trigger checkout.session.completed` → confirm webhook 200 + idempotent on replay
10. `/api/cron/expire-invites` + `/api/cron/monthly-email` with `Authorization: Bearer $CRON_SECRET` → 200

---

## Architecture / Patterns (carry-forward)

Full pattern library: `BUILD_PROCESS.md` (project root). Reusable for future apps.

Highlights:
- **Distributed rate limit via Postgres RPC** — no Redis; fails OPEN
- **3-layer Stripe webhook** — constructEvent → claim_stripe_event → verify_stripe_customer
- **Atomic claim** — `.neq(field, target).select()` is per-row atomic in Postgres
- **HMAC unsubscribe** — reuses `CRON_SECRET`; GET+POST per RFC 8058
- **Welcome dedup** — `profiles.welcomed_at` set on first auth callback
- **SSR-safe state hydration** — never lazy-init useState from window
- **Shared lib over server→own-API hop** — extract to a lib both call
- **Inline derivation > effect-driven clamp**
- **CSP dev/prod NODE_ENV split** — `unsafe-eval` dev-only

## Known Trade-offs (intentional)

- **Stripe Plus per-invite race** — webhook falls back to "most recent UNPAID invite of theme" when `stripe_session_id` doesn't match. Idempotency prevents reruns. Durable fix: pre-stamp `stripe_session_id` at checkout-start OR migrate Plus to credit-balance.
- **Onboarding modal trigger** — `localStorage.tadaaaa.onboarded`. Per-device, not per-account. Acceptable for soft education.
- **PWA dynamic icons** — `ImageResponse` adds latency on first install; cached after.
- **Full CSP nonce migration deferred** — would require Tailwind + framer-motion inline-style refactor.

## Reusable Artifacts

| Path | Purpose |
|---|---|
| `BUILD_PROCESS.md` | 12-section playbook for idea→ship |
| `~/.claude/agents/idea-to-app.md` | Autonomous build agent |
| `~/.claude/commands/idea-to-app.md` | `/idea-to-app <idea>` slash command |
| `~/.claude/projects/-Users-rohit-Downloads-ClaudeCodeProject/memory/project_tadaaaa_security_patterns.md` | Pattern library carried forward across projects |
| `memory/diary.md` | Session-by-session log |

## Genuinely Open (low priority)

- Full CSP nonce migration
- Prettier config
- Optional auto-`releaseSounds()` on reveal unmount
- `posthog.identify(user.id)` on client (currently anon-only)
- `auditAfter()` DRY wrapper in auth.ts (7 boilerplate blocks)
- Happy-path test for `/api/account/export`

## Next Phases (sophistication plan)

- **B2** Collaborative memory invites — multi-contributor photos/questions
- **B3** Reveal video as default share asset (Remotion already wired)
- **C–F** Templates marketplace, pricing restructure, Web Push, i18n, edge runtime, Inngest

## Prior Sessions

- 2026-05-18: Phases 1-5 (favicons, OG, avatar, magic link, Lottie/sounds, branded emails, Remotion video, security fixes, PWA manifest, expire cron)
- 2026-05-20 early: 14 P0 ship-blockers
- 2026-05-20 mid: 10 high-impact P1
- 2026-05-20 late: 15 remaining P1 + Hallmark onboarding + tests
- 2026-05-20 final: P2 polish + lint baseline cleared
- 2026-05-21: Server restart, hydration fixes, port-sync, BUILD_PROCESS.md + idea-to-app agent; Google OAuth verified live
- 2026-05-21 sophistication: Phase A — Sentry, PostHog, audit log, GDPR export, Sightengine moderation, cookie consent (10 commits)
- 2026-05-22: Phase B1 — AI invite drafter; sql/ai_drafts.sql run in Supabase
- 2026-05-22: Phase B2 — collaborative memory invites (contribute table + RLS, /contribute/[slug] page, ContributeForm, anon upload via service role, surprise reveal renders contributions as polaroids + notes, audit on dedup, React.cache on hot path)
