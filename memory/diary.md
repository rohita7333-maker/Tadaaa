# TaDaaaa Session Diary

---

## 2026-05-07

**What happened:** Merged MomentAsk's best features into TaDaaaa. MomentAsk was a parallel project built to explore polaroid aesthetics + better question UX — user decided not to maintain two projects.

**What was built/changed:**
- 4-step create wizard (added Occasion step before Photos)
- OccasionSelector component — 6 occasion types with prompt suggestions
- PhotoUploader — polaroid preview, caption per photo (Caveat handwriting font), rotation, drag reorder
- QuestionBuilder — custom yes/no labels, dodge toggle, requireAnswer toggle
- QuestionScreen — full dodge logic: No button springs away on hover/touch, freezes after 3 dodges, then becomes clickable. Custom yes/no labels from DB.
- RSVPButton — replaced CSS confetti with canvas-confetti (center burst + side cannons)
- DB: ALTER to add occasion_type, enable_dodge_no, response_count, caption, rotation_deg, yes_label, no_label, ip_hash
- Fixed PhotoCarousel bug: last photo never called onComplete

**Build status:** Clean. 14 pages, TypeScript OK.

**Pending / next session ideas:**
- Dashboard analytics (response_count, view_count display)
- Polaroid scroll reveal on experience page (like MomentAsk's IntersectionObserver approach)
- Middleware deprecation warning: rename `middleware.ts` → `proxy.ts` (Next.js 16 breaking change eventually)
- Consider adding occasion_type filter on dashboard

---

## 2026-05-07 (session 3 — Settings, Pricing, Security, Moderation)

**What happened:** Large feature push: subscription tiers, settings page, legal pages, content moderation, security hardening, navigation updates.

**What was built:**
- `src/lib/rate-limit.ts` — in-memory rate limiter (IP-keyed, configurable window)
- `src/actions/account.ts` — getProfile, updateNotifications, deleteAccount (GDPR)
- `src/app/settings/page.tsx` + `DeleteAccountButton.tsx` — Settings UI: account info, plan badge, notification toggles, delete account with "DELETE" confirmation
- `src/app/privacy/page.tsx` — Privacy policy
- `src/app/terms/page.tsx` — Terms of service
- `src/app/pricing/page.tsx` — 3-tier pricing cards (Free/$0, Plus/$4.99/invite, Unlimited/$19.99/yr)
- `src/components/surprise/ReportButton.tsx` — Floating flag button, modal with reason selector, submits to `/api/report`
- `src/app/api/report/route.ts` — Inserts into content_reports, rate limited (5/min per IP)
- `next.config.ts` — Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `src/app/api/stripe/checkout/route.ts` — Added `mode=unlimited` (subscription, $19.99/yr); Plus remains pay-per-invite ($4.99)
- `src/app/api/stripe/webhook/route.ts` — Handles subscription.created/updated/deleted, updates profiles.subscription_tier
- `src/actions/invite.ts` — Changed to monthly limit (FREE_INVITE_MONTHLY_LIMIT=2), unlimited tier skips limit check
- `src/components/landing/Footer.tsx` — Added Pricing, Privacy, Terms, Contact links
- `src/components/dashboard/Navbar.tsx` — Added Settings gear icon, plan badge (amber=Unlimited, rose=Plus), Settings in dropdown
- `src/app/dashboard/layout.tsx` — Fetches subscription_tier to pass to Navbar
- `src/components/landing/Hero.tsx` — Added Pricing button alongside "See how it works"
- `src/lib/supabase/middleware.ts` — Added `/settings` to protected paths
- `/api/invite/answer` + `/api/invite/view` — Rate limited (30/min and 20/min per IP)
- `src/app/surprise/[slug]/page.tsx` — ReportButton wired in at page level

**DB migrations needed (must run in Supabase):**
- ALTER profiles: add notify_on_view, notify_on_answer, notify_occasions, subscription_tier, subscription_expires_at
- CREATE content_reports table with RLS

**Build status:** Clean ✅ — 15 pages, TypeScript OK.

**Pending / next session ideas:**
- Wire Pricing page CTA to Stripe checkout (currently links to /auth/signup)
- Dashboard analytics panel (view_count + response_count display on InviteCard)
- Email notifications (notify_on_view/notify_on_answer — currently schema only, no send logic)
- Admin panel to review content_reports

---

## 2026-05-10

**What happened:** Production polish pass.

**Fixed:**
- FloatingPhotos.tsx — rewrote positioning to use % top/left in style (not animated), only animate rotate/opacity/scale via Framer Motion. Photos now correctly appear in 8 zones around screen perimeter, not at edges.
- Removed PolaroidBackground.tsx (replaced everywhere with FloatingPhotos)
- Verified createAdminClient uses @supabase/supabase-js directly (no cookie SSR) — photo uploads work correctly
- PhotoCarousel crash guard confirmed (useEffect + null guard)
- Removed console.log calls
- Created public/robots.txt
- Build: clean ✅

**Current state:** Production-ready locally. Needs Vercel deploy + Supabase Auth URL update + Stripe live keys for real launch.

---

## 2026-05-16 — Landing Page UX + Architecture Gaps

**What happened:** User reported 5 UX issues on landing page. Fixed all + added 6 new features from architecture audit. Then did CEO-level product audit.

**What was built/changed:**
- `src/app/auth/forgot-password/page.tsx` — NEW. Email form, sendPasswordReset action, Supabase PKCE flow
- `src/app/auth/reset-password/page.tsx` — NEW. Password + confirm form, updatePassword action
- `src/actions/auth.ts` — Added sendPasswordReset + updatePassword server actions
- `src/components/surprise/PolaroidScroll.tsx` — NEW. Ported from MomentAsk, adapted for TaDaaaa Theme interface. IntersectionObserver scroll reveal with framer-motion tilt
- `src/components/surprise/TapToReveal.tsx` — Replaced PhotoCarousel with PolaroidScroll
- `src/components/surprise/CountdownReveal.tsx` — Replaced PhotoCarousel with PolaroidScroll
- `src/components/dashboard/InviteCard.tsx` — Added response_count to stats strip
- `src/components/dashboard/OccasionFilter.tsx` — NEW. URL searchParams-based pill filter
- `src/app/dashboard/page.tsx` — Rewritten: async searchParams, occasion filter, 4-stat strip, Suspense
- `src/proxy.ts` — Renamed from middleware.ts per Next.js 16
- `src/components/landing/Navbar.tsx` — NEW. Sticky transparent navbar with auth buttons, mobile hamburger
- `src/components/landing/CraftingIntro.tsx` — NEW. 3s polaroid-assembling intro animation, sessionStorage once-per-session, skip button
- `src/components/landing/LandingShell.tsx` — NEW. Client wrapper managing intro state
- `src/components/landing/Hero.tsx` — Reduced spacing, preview card → Link to /surprise/test, "Try the demo" CTA, mobile: hide floating cards, stats wired to real DB, enhanced shadows
- `src/app/globals.css` — Added smooth scroll
- `src/app/page.tsx` — Wired Navbar + LandingShell + real stats from Supabase
- `src/components/landing/Navbar.tsx` — Sign up button glow shadow enhanced

**Build status:** Clean ✅

**CEO Audit findings (14 gaps):** See `project_tadaaaa_ceo_audit.md`. Top priorities: favicon, OG image, analytics, per-invite dynamic OG, error/404 pages, sitemap, email system.

---

## 2026-05-18 — Security Audit + Gap Fixes + Handoff

**What happened:** Continued CEO audit phases 2-5. Ran 3 parallel audit agents (security, code review, gap analysis). Fixed all HIGH severity + BLOCKER issues.

**Security fixes:**
- HIGH-1: XSS in email templates — `esc()` applied to all 4 templates (inviteViewed, inviteAnswered, monthlyReengagement, welcome)
- HIGH-2: Magic link no email validation — added Zod `magicLinkSchema`
- MED-10: Race condition on view_count — switched to atomic `supabase.rpc("increment_view_count")`
- MED-12: Cron open when CRON_SECRET unset — fail-closed in both cron routes

**Blocker fixes:**
- CSP missing `media-src` — added for Supabase video + blob URLs
- VideoGenerator orphaned — wired into PreviewPublish post-publish flow, `createInvite` returns `{slug, inviteId}`, create page fetches user tier

**Other fixes:**
- AvatarUpload memory leak (revokeObjectURL before new blob)
- PWA manifest (public/manifest.json + layout.tsx metadata)
- Invite expiry cron (src/app/api/cron/expire-invites/route.ts)
- Created sql/increment_view_count.sql for Supabase

**Build status:** Clean ✅ — zero TS errors

**Action required:** Run `sql/increment_view_count.sql` in Supabase SQL Editor

**Handoff doc:** See HANDOFF.md for full remaining gaps and priorities

**Remaining P0:** Rate limiting on server actions, per-user video generation limit
**Remaining P1:** Onboarding empty state, tests, Google OAuth error handling, per-route error boundaries

---

## 2026-05-20 — E2E Audit + P0 Ship-Blocker Fixes

**Goal:** Identify all bugs + gaps end-to-end. Fix every P0 ship blocker.

### Audit pass (4 parallel agents)
- Security audit (backend): 27 findings (P0 / P1 / P2)
- Frontend audit: 12 findings
- Infra/config audit: env gaps, missing vercel.json, PWA icons missing, no test script
- E2E flow gaps: 24 user-facing issues across 5 flows (creator, recipient, premium, emails, account)

### P0 Fixes Shipped (14)
1. **Stripe webhook tier-mint** — added `stripe_events` dedupe table + `verify_stripe_customer` linkage. Mismatched user/customer pairs now return 400 on all 3 event types. Replays short-circuit.
2. **Stripe Plus invite mapping** — prefer `stripe_session_id` lookup; fallback to most-recent UNPAID invite (was just most-recent — race-prone).
3. **Video DoS** — per-user 5/hour rate limit + atomic claim via `update ... .neq("video_status","processing")`.
4. **Auth rate limits** — signUp/signIn/magicLink/sendPasswordReset all IP-rate-limited. Magic link tightened to 3/min.
5. **DB-backed rate limiter** — `consume_rate_limit(key, limit, window_ms)` Postgres RPC replaces in-memory Map. Works on serverless. Fails OPEN on outage.
6. **View race** — `increment_view_count` returns INTEGER; route checks `newCount === 1` for first-view email.
7. **getInviteBySlug active filter** — now refuses inactive/expired/status=expired invites.
8. **Cron expire split-brain** — sets BOTH `status="expired"` AND `is_active=false`. Page filters now match.
9. **Google OAuth try/catch** in AuthForm.
10. **Magic link** — replaced `document.getElementById` with `getValues("email")`.
11. **Answer route active gate** — HTTP 410 on inactive/expired.
12. **Schema** — datetime() on date fields, inviteQuestionsSchema caps 10 questions + field lengths.
13. **Theme paywall** — server rejects premium themes for non-Unlimited users (was UI-only).
14. **Report API** — validates inviteId exists.

### New SQL Files
- `sql/stripe_events.sql` — events dedupe + `claim_stripe_event()`
- `sql/rate_limits.sql` — `consume_rate_limit()` + cleanup
- `sql/stripe_customers.sql` — `profiles.stripe_customer_id` + `verify_stripe_customer()`
- `sql/increment_view_count.sql` — UPDATED to RETURNING

### Verification
- `npx tsc --noEmit` → exit 0
- Lint: 6 pre-existing errors (PhotoCarousel/RSVPButton/TapToReveal react-hooks) — not introduced this session

### Key Architecture Decisions
- **Rate limit fails OPEN** — DB outage cannot lock everyone out; only logs
- **Stripe customer binding** — first event for (user_id, customer_id) binds; subsequent mismatches rejected. Prevents arbitrary metadata.user_id from minting tier.
- **Atomic video claim** — Postgres update-with-where; no app-level mutex

### Handoff
HANDOFF.md fully rewritten with 14 P0 fixes + 40 remaining P1/P2 items. Hallmark skill assigned to P1 #39 (onboarding modal design).

---

## 2026-05-20 — P1 batch (after P0)

### Session
User said "start" on P1. Closed 10 high-impact items in one batch.

### Shipped
- **RSVP DB write** — `invite_rsvps` table (hash-deduped), `/api/invite/rsvp`, RSVPButton retries + persists localStorage visitor token. Dashboard now shows RSVP count per invite + stats strip.
- **Premium paywall wiring** — pricing CTAs (Free/Plus/Unlimited) go through `PricingCTA` client component; Unlimited fires Stripe checkout, Plus routes to `/create`. Premium theme button on create wizard now opens Stripe Plus checkout, returns to `/create?theme=X&payment=success` which auto-selects + unlocks via sessionStorage.
- **Tier expiry** — create page reads `subscription_expires_at`, downgrades stale Unlimited → free. ThemeSelector accepts `undefined` = all unlocked (Unlimited users).
- **Answer retry** — QuestionScreen.submitAnswer retries 3× with backoff; blocks required questions on failure with toast, warns + advances on optional.
- **Storage purge** — `deleteInvite` removes video_storage_path. `deleteAccount` collects all invite videos + photos + avatar files (3 ext guesses), removes them, then `signOut()` BEFORE `admin.deleteUser`.
- **View fetch URL hop** — extracted `src/lib/invite-view.ts` `logInviteViewBySlug(slug, ua, ip)`. SSR page calls directly via `headers()`. API route delegates. No `${NEXT_PUBLIC_APP_URL}/api/invite/view` fetch from server component.
- **CountdownReveal** — `useMemo` the target Date so the tick interval isn't recreated every render.

### New Files
- `src/lib/invite-view.ts`
- `src/components/pricing/PricingCTA.tsx`
- `sql/invite_rsvps.sql` (table existed from earlier P0 batch, this was the wire-up session)

### Verification
- `npx tsc --noEmit` → exit 0
- Lint baseline 6 pre-existing errors unchanged

### Patterns Reinforced
- **Shared lib over API hop** — when a server component needs to call its own API, extract to a lib both call. Skips env-URL traps.
- **Visitor token over IP for anon dedupe** — IP collapses households; localStorage is opaque + survives navigation. Server hashes before storing.
- **`undefined` as "all unlocked" signal** — ThemeSelector treats `undefined` unlockedPremiumThemes prop as "Unlimited tier, no restriction". Cleaner than passing the full theme list.

### Handoff
HANDOFF.md rewritten as P1 batch doc, lists 10 P1 items closed + 15 P1 still remaining. 5 SQL files now to run (was 4).

---

## 2026-05-20 — All remaining P1 + Hallmark onboarding

### Session
User said "continue, use all skills in CLAUDE.md". Closed every remaining P1 item plus the Hallmark-targeted onboarding modal.

### Shipped (15 items)
- **Avatar rate limit** — 5/hour per user via consume_rate_limit
- **Unsubscribe** — new `lib/unsubscribe.ts` with HMAC tokens (CRON_SECRET-keyed), `/api/unsubscribe` GET+POST, monthly recap email includes link, layout supports per-template unsubscribe footer
- **Welcome dedup** — removed from signUp; `/auth/callback` fires it ONCE gated by `profiles.welcomed_at`
- **Verify-email screen** — `/auth/verify-email` brand-styled holding page; signUp redirects here
- **Magic-link Terms gate** — `shouldCreateUser: false`; friendly toast for new addresses
- **Notify default-on + auto-upsert** — `view`/`answer` use maybeSingle, default to true, upsert default profile if missing
- **updatePassword** — currentPassword required (signInWithPassword verify), recovery=1 bypass for reset-link flow, rate-limited
- **Auth callback** — `safeNext()` allowlist (`/dashboard`, `/create`, `/settings`, `/pricing`, `/auth/reset-password`, `/about`) — blocks open-redirect
- **Settings ChangePasswordForm** — show-password toggles, useTransition, autocomplete attrs
- **Monthly cron** — chunks of 25 with `Promise.allSettled`, per-user counts via parallel `Promise.all`, returns sent/failed/total
- **Vitest** — installed, 3 test files, 29 tests covering schemas/utils/unsubscribe HMAC
- **Per-route error boundaries** — dashboard/create/surprise each branded
- **vercel.json** — daily expire-invites (03:00 UTC) + monthly recap (1st @ 14:00 UTC)
- **PWA** — removed public/manifest.json; new app/manifest.ts (Next.js metadata route) + dynamic icon1.tsx (192) + icon2.tsx (512) via ImageResponse
- **Onboarding modal** — Hallmark anti-AI-slop copy: 3 steps, eyebrow + warm body, progress dots, dismissible, sessionStorage-persisted, auto-shows only when dashboard empty + not previously dismissed

### New Files
- `src/lib/unsubscribe.ts`
- `src/lib/{schemas,utils,unsubscribe}.test.ts` (29 tests)
- `src/app/api/unsubscribe/route.ts`
- `src/app/auth/verify-email/page.tsx`
- `src/app/{dashboard,create,surprise}/error.tsx`
- `src/app/manifest.ts`
- `src/app/icon{1,2}.tsx`
- `src/app/settings/ChangePasswordForm.tsx`
- `src/components/dashboard/OnboardingModal.tsx`
- `sql/profiles_welcomed_at.sql`
- `vercel.json`
- `vitest.config.ts`

### Verification
- `npx tsc --noEmit` → exit 0
- `npm test` → 29 passed (29)
- `npm run lint` → 6 errors (all pre-existing in PhotoCarousel/RSVPButton/TapToReveal/LandingShell). Zero new.

### Patterns Reinforced
- **HMAC keyed off existing secret** — Cron_SECRET already required; reuse via createHmac instead of adding new env. Constant-time compare for security.
- **GET+POST for RFC 8058 unsubscribe** — mail clients pre-fetch via POST; users click via GET; same handler.
- **Welcome dedup via profile column** — `welcomed_at` timestamp lets the callback be idempotent across replays without a separate sent-table.
- **Lazy useState everywhere** — Next.js 16's react-hooks `set-state-in-effect` rule trips effect-driven mount sync. Read from sessionStorage/localStorage/URL synchronously in the useState initializer.
- **PWA via metadata routes** — beats maintaining PNG variants in /public; ImageResponse + manifest.ts is canonical Next.js.
- **Hallmark onboarding copy** — eyebrow + warm body + 3 steps. No "🎉 Let's get started!" or "Welcome aboard!" slop. Each step opens with "Pick / Make / Hand it over" — verbs first, no adjective stacking.

### Handoff
HANDOFF.md fully rewritten as comprehensive completion doc — all P0 + P1 fixed. 6 SQL migrations to run (was 5). Memory updated. Project ready to ship.

---

## 2026-05-20 — P2 polish closure

### Session
User said "continue". Closed all P2 polish + cleared the pre-existing react-hooks lint errors that had been the baseline since day one.

### Shipped
- **Lint baseline cleared** — 6 errors → 0 errors. Fixed:
  - `PhotoCarousel.tsx` — onCompleteRef sync moved into useEffect; clamp via inline `safeCurrent` derivation instead of effect-driven setState; aria-label + aria-current on dot buttons
  - `LandingShell.tsx` — lazy useState init from sessionStorage; removed effect setState cascade
  - `CraftingIntro.tsx` — reduced-motion check moved into useState initializer
  - `ResponsesModal.tsx` — async/cancelled-flag pattern instead of fire-and-forget
  - `surprise/test/page.tsx` — countdownDate stamped on Start press instead of computed every render
  - `RSVPButton.tsx` — `firedRef.current = onComplete` removed; was already moved via earlier P0 work
- **Navbar avatar aria-label** — `aria-label="Account menu"` on DropdownMenuTrigger
- **VideoPlayer onError + skip** — full error state with retry/skip CTA; permanent skip button overlay when playing
- **Sounds cleanup** — `releaseSounds(names?)` helper exported from `lib/sounds.ts` for explicit cache release
- **LottieAnimation orphan** — deleted (CelebrationOverlay imports lottie-react directly; wrapper was dead code)
- **CSP tightened** — `'unsafe-eval'` now dev-only via NODE_ENV guard. Added `frame-ancestors 'none'`, `form-action 'self'`, `upgrade-insecure-requests`. `'unsafe-inline'` on style-src stays (Tailwind + framer-motion); nonce migration tracked as future work.
- **`.nvmrc`** — pins Node 22

### Verification
- `tsc --noEmit` → 0
- `npm test` → 29/29 pass
- `npm run lint` → 6 warnings, **0 errors** (was 6 errors pre-session)

### Patterns Reinforced
- **Inline derivation > effect-driven setState** — `const safeCurrent = Math.min(current, photos.length - 1)` is cleaner than the rule-trip `setCurrent(photos.length-1)` clamp
- **Lazy useState for media queries** — `matchMedia` read in initializer; effect only handles the side effect (onComplete call)
- **Async-in-effect with cancelled flag** — modal data fetch pattern. React 19 forbids fire-and-forget `.then(set)`; wrap in async IIFE + cancelled flag returned from effect
- **CSP dev/prod split** — Next.js HMR needs `unsafe-eval`; production build doesn't. Gate via NODE_ENV; cleaner than per-env env vars

### Handoff
HANDOFF.md updated with P2 closure section + final ship-readiness checklist. Memory file extended with P2 patterns (21-23). All audit items now ✅.

---

## 2026-05-21 — Dev server + hydration bugs (caught via browser QA)

### Session
User asked: "did you start the server?" — no, hadn't. Started it. Hit two real bugs.

### Bug 1 — Turbopack workspace root misdetection
Stale `.next` cache from when /ClaudeCodeProject/package.json (my earlier accidental install) existed. Even after deleting parent package.json + lockfile + node_modules, Turbopack kept resolving Tailwind from `/tadaaaa` (parent) instead of `/surprise-invite`. Fix: `rm -rf .next node_modules/.cache` and restart. Kept `turbopack.root: path.resolve(__dirname)` in next.config.ts as defensive config.

### Bug 2 — Hydration mismatch (introduced by my P2 "fix")
The earlier lazy-`useState` refactor for `set-state-in-effect` lint rule introduced an SSR/CSR hydration mismatch in `LandingShell` → `CraftingIntro`:
- Server: `shouldShowIntro()` reads sessionStorage → undefined (no window) → returns `false` → renders `<nav>`
- Client: `shouldShowIntro()` reads sessionStorage → empty → returns `true` → renders intro `<div>`
Console error: `Hydration failed because the server rendered HTML didn't match the client.`

Same anti-pattern existed in:
- `OnboardingModal.tsx` — localStorage read in `useState` initializer
- `create/page.tsx` — sessionStorage + URL params in `useState` initializers

### Fix — two-render pattern
Reverted to the canonical SSR-safe pattern:
```tsx
const [showIntro, setShowIntro] = useState(false);  // SSR-safe default
useEffect(() => {
  if (!sessionStorage.getItem(KEY)) setShowIntro(true);  // post-mount sync
}, []);
```
Lint rule `react-hooks/set-state-in-effect` flagged each setState. Added per-line `eslint-disable-next-line` with rationale comment explaining hydration correctness > lint preference.

### Verification (live browser)
- Playwright navigation to `/`, `/auth/signup`, `/pricing`, `/auth/verify-email`: all return 200 with **0 console errors**
- `tsc --noEmit` → 0
- `npm test` → 29/29 pass
- `npm run lint` → 0 errors, 10 warnings (intentional)

### Patterns Reinforced
- **Browser QA catches what unit tests can't** — hydration mismatches only show under SSR+client-rehydrate. `vitest` running pure Node never saw them. Playwright MCP into a real Next.js dev server is the right loop.
- **Lazy useState reading window/storage = SSR bomb** — anywhere `useState(() => readWindowThing())` exists, you'll get a hydration mismatch on the first render. The "set-state-in-effect" rule is wrong for this case; per-line disable is the canonical pattern.
- **Stale Turbopack cache survives parent-config cleanup** — when changing workspace root or upstream package.json, `rm -rf .next` is mandatory. Add to runbook.

### Files Modified
- `src/components/landing/LandingShell.tsx` — two-render pattern w/ rationale comment
- `src/components/dashboard/OnboardingModal.tsx` — same
- `src/app/create/page.tsx` — same; reintroduced `setUnlockedPremium`
- `next.config.ts` — `turbopack.root` kept as defensive config

### Handoff
HANDOFF.md notes hydration bugs were caught in browser QA. Memory file extends with pattern 27 (SSR/CSR symmetry rule).

---

## 2026-05-21 — Google OAuth error reframe + BUILD_PROCESS.md + idea-to-app agent

### Session
User reported `/auth/signin` Internal Server Error after enabling Google OAuth in Supabase. Also asked for end-to-end documentation + a reusable agent to skip redundancy in future builds.

### Findings
- 500 was server-down (dev process died on session resume), not code. Restarted dev — `/auth/signin` returns 200 with 0 console errors.
- `signInWithGoogle` returned raw Supabase error message ("Unsupported provider: provider is not enabled"). Now intercepted and re-framed to "Google sign-in isn't configured yet. Use email + password or the magic link."

### Shipped
- `src/actions/auth.ts` — `signInWithGoogle` intercepts provider-disabled error
- `BUILD_PROCESS.md` (new, project root) — 12 sections covering pipeline, skill routing, patterns 4.1–4.20, anti-patterns, SQL playbook, env vars, verification gates, session discipline, anti-slop pledge, common gotchas
- `~/.claude/agents/idea-to-app.md` (new) — agent definition with hard rules, 14-phase pipeline, anti-pattern shortlist, output discipline
- `~/.claude/commands/idea-to-app.md` (new) — slash command to spawn the agent

### Patterns Reinforced
- **Server-down ≠ code bug** — when in doubt, restart dev first; 500 might just be the process being gone.
- **Re-frame raw provider errors** — Supabase / Stripe / Resend errors often leak implementation detail. Intercept by regex match on the message and translate to user-friendly text.
- **Doc + agent pair** — BUILD_PROCESS.md is the *why*, idea-to-app agent is the *how*. Future builds run the agent; humans only read the doc when overriding.
- **Skills are tools, not labels** — saying "I'll use frontend-design" without `Skill` tool invocation = no skill fired. Agent enforces real invocation.

### Verification
- `tsc --noEmit` → 0
- `npm test` → 29/29
- Dev server up on :3000 — `/auth/signin` 200, 0 console errors

### Handoff
HANDOFF.md unchanged this session (server fix was operational, not code). BUILD_PROCESS.md is the new canonical reference. Future sessions should `/idea-to-app <idea>` to dispatch the agent.

### Manual steps (user)
For Google OAuth to actually work:
1. Supabase dashboard → Authentication → Providers → Google → Enable
2. Add Google Cloud OAuth client ID + secret (redirect URI: `https://xrlmnlknymgakswsbawk.supabase.co/auth/v1/callback`)
3. Supabase → Authentication → URL Configuration → add `http://localhost:3000/auth/callback` to Redirect URLs

Until then, email/password + magic link work fine.

---

## 2026-05-21 — Google OAuth live + HANDOFF rewrite + agent v2

### Session
User finished Supabase Google OAuth config + Google Cloud OAuth client. Verified the entire OAuth chain via Playwright.

### Verified
- `/auth/signin` click "Continue with Google" → 302 to `accounts.google.com/v3/signin`
- URL params correct: `client_id=1005030629368-...`, `redirect_uri=https://xrlmnlknymgakswsbawk.supabase.co/auth/v1/callback`, `redirect_to=http://localhost:3000/auth/callback`
- Port now :3000 (was :3005 before env fix earlier today)

### Shipped
- HANDOFF.md fully rewritten — current state, all P0+P1+P2 done, deploy checklist, Supabase + Google Cloud dashboard config notes
- `~/.claude/agents/idea-to-app.md` updated:
  - Phase 7 now mandates provider-error reframe pattern
  - Added explicit Supabase + Google Cloud dashboard checklist
  - New section: "Verified-OAuth Smoke Test" — Playwright probe template
  - Anti-pattern shortlist extended with raw-provider-errors + port-mismatch
  - Cleanup section requires updating cross-project pattern memory too
- diary appended

### Patterns Reinforced
- **OAuth chain verifiable without completing auth** — Playwright can navigate signin, click Google button, and inspect the resulting Google URL params. Bot detection blocks the actual login but param verification catches every common misconfig (wrong port, missing redirect URI, mismatched client ID).
- **Dashboard config is part of the deliverable** — `BUILD_PROCESS.md` and HANDOFF.md must surface the exact Supabase + Google Cloud / Stripe / Resend dashboard steps. User shouldn't have to figure them out.
- **HANDOFF.md is a *current state* doc** — append-only diaries drift; HANDOFF should be rewritten top-to-bottom every session so it stays the canonical source-of-truth.

### Verification
- `tsc --noEmit` 0
- `npm test` 29/29
- Live browser: signin → Google OAuth chain reaches `accounts.google.com` with correct params

### Handoff
HANDOFF.md is the ship-readiness doc. BUILD_PROCESS.md is the cross-project playbook. idea-to-app agent v2 enforces Phase 7 OAuth checklist + smoke test. Future builds run the agent.

---

## 2026-05-22

**What happened:** Phase B1 (AI invite drafter) shipped on `feat/sophistication`. `sql/ai_drafts.sql` run in Supabase.

**What was built:**
- `src/lib/ai/draft.ts` — `draftInvite()` calls claude-sonnet-4-6 with prompt caching on system msg; `parseDraftOutput()` validates with Zod
- `src/lib/ai/prompts.ts` — system prompt + user message builder
- `src/lib/ai/draft.test.ts` — 5 tests (invalid JSON, schema pass, unsafe refusal, missing fields, title overflow)
- `src/app/api/ai/draft-invite/route.ts` — POST route: auth + 10/hr rate limit (reuses `consume_rate_limit` RPC) + audit log via `after()`
- `src/components/create/AIDraftButton.tsx` — UI: recipient, occasion, tone, optional details; inline expand/collapse
- `sql/ai_drafts.sql` — log table with self-read RLS (RAN in Supabase ✓)
- Wired into `create/page.tsx` step 1 — `applyDraft` fills title/message/theme/questions + auto-advances to step 2

**Build status:** Clean — 43/43 tests (up from 38), tsc 0 errors, lint 0 errors.

**Pending:**
- `ANTHROPIC_API_KEY` → add to Vercel env vars before prod deploy (TODO)
- Merge `feat/sophistication` → `main` + push when ready to deploy
- Phase B2 (collaborative invites) or B3 (reveal video default) next

---
