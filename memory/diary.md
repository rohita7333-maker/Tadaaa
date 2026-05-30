# TaDaaaa Session Diary

---

## 2026-05-30 — Motion P3: Create Wizard

**What happened:** Implemented P3 of MOTION_MASTERPLAN — full motion layer on the 4-step create wizard. Audited all 9 create components, named every flat opacity swap + uniform fade-up, then replaced all of them with role-differentiated authored motion.

**What changed:**

- `src/app/create/page.tsx` — directional step transitions. `makeSlideVariants(shouldReduce)` drives x:±60+scale:0.96 forward/back. Replaced inline `0.3, "easeInOut"` with `durations.base + easings.entrance`.
- `OccasionSelector.tsx` + `ThemeSelector.tsx` — `motion.button` spring press (whileTap) + selection confirm (animate scale:1.02). CSS color-only transitions remain; transforms owned by framer-motion.
- `PhotoUploader.tsx` — `<AnimatePresence initial={false}>` + `layout` on photo items for spatial list. `Loader2 animate-spin` → authored ImagePlus breathing pulse. Fixed inline `0.18` → `durations.instant`.
- `AIDraftButton.tsx` — `<AnimatePresence mode="wait">` panel open/close. Sparkles icon rotate+scale loop while loading. No more flat opacity toggle.
- `RevealSettings.tsx` — `motion.button` for tap/countdown selection. `<AnimatePresence>` around conditional date fields (countdown date, expiry date).
- `QuestionBuilder.tsx` — `<AnimatePresence initial={false}>` on question list. Add: y:10+scale:0.97 entrance; Remove: y:-10 exit. Springs.soft.
- `PreviewPublish.tsx` — `<AnimatePresence mode="wait">` form↔success. Check circle: `springs.weighty` (payoff moment). Headline/copy: staggered. CTA press: `springs.soft`. Publishing ✨: keyframe pulse.
- `VideoGenerator.tsx` — `<AnimatePresence mode="wait">` across 4 status states. Film icon breathes while processing. CheckCircle2 springs.soft entrance on ready.
- `motion.test.ts` — +7 P3 token contract tests.

**NOT touched:** StepIndicator (P0 gem — expo easing intact), MessageEditor (inputs settle quietly via CSS).

**Verification:** tsc 0 · 227/227 tests · lint 0 new errors · reduced-motion verified all 7 animated create components · wizard direction correct · StepIndicator untouched · zero inline magic numbers · transforms+opacity only

**Commit:** feat/sophistication branch (pending caveman-commit)

---

## 2026-05-25 — Hour 1: Launch Blockers Closed (SEC-001/002/003)

**What happened:** Executed Hour 1 of LAUNCH_PLAN.md Section 5. Fixed all 3 code blockers that were preventing launch. 190/190 tests pass, 0 tsc errors, 0 lint errors in modified files.

**What was built/changed:**

**SEC-001 — Orphan photo storage attack (FIXED):**
- `signed-upload-url/route.ts`: signed URLs now point to `pending/{user}/{invite}/{i}.{ext}` not the canonical path. Attackers who get a URL and never finalize can only pollute `pending/`, which the sweep cron cleans.
- `invite.ts` / `finalizeInvite`: prefix validation now requires `pending/` prefix. After moderation passes, copies each file to canonical `{user}/{invite}/{i}.{ext}` via `adminClient.storage.copy()`, deletes pending original, stores canonical path in `invite_photos`.
- New `sweep-orphans/route.ts` cron: lists `pending/` tree recursively, deletes files >30 min old; also finds `invites` rows with `is_active=false` and no `invite_photos` joins older than 30 min and deletes them.
- `vercel.json`: registered sweep at `0 */6 * * *`.

**SEC-002 — Quota evasion via abandoned shells (FIXED):**
- Monthly cap query in `createInviteShell` now adds `.eq("is_active", true)` so dead shells don't count toward free limit.
- New invites INSERT with `is_active: false`. Only `finalizeInvite` success path flips `is_active: true`.

**SEC-003 — Path ext brittleness (FIXED):**
- Replaced `ALLOWED_EXT.includes(userInput)` + `.toLowerCase()` interpolation with explicit `switch` returning hardcoded string literals (`"jpg"`, `"jpeg"`, `"png"`, `"webp"`, `"gif"`). User-controlled string can never reach storage path.

**Commits (3 separate, all on feat/sophistication):**
- `5e065fa` — fix(invites): gate monthly cap on is_active; default shells inactive
- `605db70` — fix(photos): harden ext to hardcoded literals in signed-upload-url
- `109f11f` — fix(photos): quarantine uploads to pending/ and sweep orphans via cron

**Tests:** 173 → 190 (+17 new). All pass.

**Key gotcha:** Supabase Storage `copy()` method needed (not documented prominently). The two-phase pending→canonical move works because `adminClient.storage.from(bucket).copy(fromPath, toPath)` returns `{ data, error }`. After copy succeeds, remove the pending file separately.

**Next (Hour 2 — needs external dashboards):** Fix manifest path, viewport export, vercel.json function config, then Stripe live keys + Resend + Sightengine keys.

---

## 2026-05-25 — Hour 2 (code-only): Config Blockers #4/#5/#6 Closed

**What happened:** Executed code-only portion of LAUNCH_PLAN.md Hour 2. Three config blockers fixed. No external dashboards touched.

**What was built/changed:**

**Blocker #4 — PWA manifest path (FIXED):**
- `layout.tsx`: `manifest: "/manifest.json"` → `manifest: "/manifest.webmanifest"`. Next.js serves `app/manifest.ts` at `/manifest.webmanifest` — `.json` returned 404, suppressing mobile install prompt.

**Blocker #5 — Viewport export (FIXED):**
- `layout.tsx`: Added `import type { Viewport }` + `export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FFF8F0" }`. Next.js 15+ requires viewport as separate named export; brand color confirmed `#FFF8F0` from `globals.css`. Without this: mobile renders at desktop width, browser chrome color doesn't apply.

**Blocker #6 — vercel.json function config (FIXED):**
- `vercel.json`: Added `"functions"` block with `maxDuration: 30` for `draft-invite/route.ts`. Added `"regions": ["iad1"]`. Default 10s killed ~50% of Anthropic API calls. `iad1` co-locates with Supabase (US-East).

**Commits (2, both on feat/sophistication):**
- `19fef7d` — fix(layout): fix PWA manifest path and add viewport export
- `3537711` — fix(vercel): extend AI drafter timeout and pin region to iad1

**Verification:** tsc exit 0 · 4 lint errors (pre-existing) · 190/190 tests pass.

**Remaining (needs human dashboard access):** Blockers #7-#10 — Stripe live keys, Resend API key, Sightengine keys, Vercel env var paste.

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

## 2026-05-22 (session 2 — Phase B2 collaborative invites)

**What happened:** Phase B2 (collaborative memory invites) shipped on `feat/sophistication`. Subagent-driven flow: implementer → spec review → code quality review → 3-fix follow-up.

**What was built:**
- `sql/invite_contributions.sql` — contributions table (id/invite_id/contributor_name/email/message/photo_url/approved/visitor_hash) + `accept_contributions` flag on invites + RLS (public-read-approved, no client INSERT)
- `src/app/api/invite/[slug]/contribute/route.ts` — POST: 10/hr/IP rate limit, Zod validation, Sightengine scan on photoUrl, visitor_hash=`sha256(ip:invite.id)`, 23505 dedup returns 200 not 500, audit `contribution.received` AND `contribution.dedup` via `after()`
- `src/app/api/invite/[slug]/contribute/upload/route.ts` — service-role anon upload, MIME allowlist (jpeg/png/webp, no SVG), 1.25× size cap, 20/hr rate limit, gated on `accept_contributions + is_active + status`, returns 1hr signed URL
- `src/app/contribute/[slug]/page.tsx` — public form page; notFound on inactive/non-accepting
- `src/components/contribute/ContributeForm.tsx` — name/email/message/photo fields, reuses `browser-image-compression`
- Wizard toggle in `RevealSettings.tsx` (Switch) → threaded through create/page.tsx → invite.ts persists
- `ShareButtons.tsx` — conditional `/contribute/[slug]` secondary share link when `acceptContributions=true`
- Surprise page integration — `getInviteBySlug` now returns contributions; photo contribs merge into `PolaroidScroll`, message-only notes render as letter cards via new `notes` prop
- `getInviteBySlug` wrapped in React.cache() — dedupes generateMetadata + page body double-query

**Tests:** 47/47 (was 43; added 404, 403, 200 ok, 200 dedup paths)

**Fixes from review:**
- Audit log dedup hits (`contribution.dedup` action with same meta-shape as received)
- React.cache() on getInviteBySlug to halve DB load on hot path
- Drop UA from visitor_hash (false dedups across in-app browser drift)

**Commits:** `905e688 feat(contributions): collaborative memory invites (Task B2)` + `5df1817 fix(b2): audit dedup hits, React.cache getInviteBySlug, drop UA from visitor hash`

**Build status:** tsc 0, lint 0, tests 47/47, build clean.

**Pending:**
- Run `sql/invite_contributions.sql` in Supabase before deploy
- Phase B3 next (reveal video default) OR low-priority cleanup pass OR merge → main
- Follow-ups documented: orphan-file cleanup cron, explicit getInviteBySlug return type, per-invite rate limit tuning

---

## 2026-05-23 (Phase B3 — video share button)

**What happened:** Phase B3 (reveal video as default share asset) shipped on `feat/sophistication`. TDD cycle: RED → GREEN → TypeScript + lint clean.

**What was built:**
- `src/lib/video-share.ts` — pure TS orchestration: fetch status → if ready fetch blob → `navigator.share({files})` with `canShare` gate → download fallback via anchor click; if not ready → POST /api/video/generate; returns typed `VideoShareOutcome` union (`shared|downloaded|rendering|error`)
- `src/lib/video-share.test.ts` — 9 vitest tests covering: correct status URL, generate POST trigger, native share with File, PostHog event, mobile Safari share rejection → download, no navigator.share → download, canShare false → download, rendering path, HTTP error path. Globals stubbed via `vi.stubGlobal` + `Object.defineProperty` (navigator is read-only).
- `src/components/dashboard/ShareButtons.tsx` — added `Video`+`Loader2` lucide icons; `videoSharing` state; `handleVideoShareClick` wrapping the helper; UI reorganized into 3-col row (WhatsApp | Video | Share) + 2-col row (Copy | QR); Video button hidden when no `inviteId`; disabled+spinner during fetch; toast for each outcome.

**Key design decisions:**
- Extracted logic to `video-share.ts` (not inline in component) so it can be tested in node/vitest without jsdom or React Testing Library (vitest config is `environment: node`, `include: src/**/*.test.ts`).
- `canShare({files})` checked before `navigator.share` to handle the mobile Safari files quirk.
- `capture` injected as a prop to `handleVideoShare` — no window.posthog probing in helper.
- Grid shifted to 3-col for primary row; Video button absent (no col taken) when `inviteId` undefined.

**Tests:** 56/56 (was 47; added 9 new)

**Commit:** `4d955e3 feat(b3): video share button on dashboard`

**Build status:** tsc 0, lint 0 errors (10 pre-existing warnings), tests 56/56.

**Pending:**
- Run `sql/invite_contributions.sql` in Supabase if not yet done (B2 dependency)
- `ANTHROPIC_API_KEY` → add to Vercel env vars before prod deploy
- Phase B3 is done — next: merge `feat/sophistication` → `main` + deploy, OR pick next B-phase item

---

## 2026-05-23

**What happened:** D2 — $5 gift checkout shipped.

**What was built:**
- `giftCheckoutSchema` in `schemas.ts` (mode=gift, recipient_email, optional message/sender_name)
- `giftInviteEmail()` template in `email/templates.ts` (brand cream+rose, XSS-escaped, plain-text field)
- `POST /api/stripe/checkout` extended with gift mode — no auth required; anti-self-gift when logged in; reads `STRIPE_GIFT_PRICE_ID` env var
- Webhook handler: new gift branch; inserts `gift_purchases` (service-role); sends email via Resend; audit log `gift.sent`; email failure → 200 (idempotency already claimed)
- `GET /gift/redeem?token=X` — validates status+expiry; redirects authed user to `/create?gift=<id>`; unauthenticated → signup with `?next=` redirect
- `/gift/success` — thank-you page post-Stripe
- `GiftCTA` modal component — recipient email + optional sender name/message
- Pricing page updated: Gift tile added (4-col grid on lg)
- `sql/gift_purchases.sql` added; migration applied via Supabase MCP

**Commit:** f77cbf1

**TODO before prod:**
- Add `STRIPE_GIFT_PRICE_ID` to Vercel env vars (create $5 Price in Stripe dashboard first)
- Wire gift bypass in `/create` route: check `?gift=<gift_id>` → look up `gift_purchases` where `redeemed_by = current_user` and `status = redeemed` → skip tier check for that invite

---

## 2026-05-23 (evening)

**What happened:** Code review fixes — 7 issues on feat/sophistication.

**What was fixed:**

**🔴 Critical #1 — Unsubscribe weekly (GDPR)**
- `src/app/api/unsubscribe/route.ts`: added `"weekly"` to `ListKey` type + `COLUMN_FOR_LIST → "notify_occasions"`
- k=weekly param now returns 200 instead of 400 (was GDPR violation — users couldn't opt out)
- Test: `src/app/api/unsubscribe/route.test.ts` (new file, 5 tests)

**🔴 Critical #2 — Gift tier bypass**
- `src/lib/gift-redemption.ts` (new): `validateGiftForUser(adminClient, giftId, userId)` helper
- `src/actions/invite.ts`: reads `giftId` from formData; skips monthly cap if gift valid; marks `status="used"` after invite created
- `src/app/create/page.tsx`: reads `?gift=` from URL on mount, passes in formData during publish
- Test: `src/lib/gift-redemption.test.ts` (new file, 6 tests)

**🟡 Important #3 — Toggle thumb never slides**
- `src/app/settings/SettingsAnimated.tsx`: restructured ToggleRow so thumb span is a peer SIBLING of checkbox (was a child of the track span — invalid Tailwind peer usage). `peer-checked:translate-x-5` now works.

**🟡 Important #4 — Clipboard unhandled rejection**
- `src/components/dashboard/ShareButtons.tsx`: both clipboard copy paths wrapped in try/catch with `toast.error("Could not copy — tap the link to copy manually")`

**🟡 Important #5 — Weekly digest OOM at scale**
- `src/app/api/cron/weekly-digest/route.ts`: replaced single `.select()` with `PAGE_SIZE=500` cursor loop using `.range(offset, offset+PAGE_SIZE-1)`
- Updated all 5 profile mocks in `route.test.ts` to include `.range()` in chain; added pagination test (600 profiles → asserts 2 DB calls)

**🟢 Minor #6 — Gift email double blank lines**
- `src/lib/email/templates.ts`: `.filter(Boolean)` (was `.filter(l => l !== undefined)` — didn't remove empty strings)

**🟢 Minor #7 — PolaroidScroll final aria-label**
- `src/components/surprise/PolaroidScroll.tsx`: final screen now shows "Finish and continue to the reveal" instead of always showing "Continue to next part of the surprise"

**Build status:** 171/171 tests · tsc 0 errors · lint 0 errors
**Commits:** fbd210c (criticals) · 1a3063c (importants) · 65ae356 (minors)

**Branch state:** feat/sophistication — ready to merge + deploy after Stripe/Resend env vars set


---

## 2026-05-24 — 4-Phase 21st.dev Modernization + Dev-Server Fix

### Session
Full-app visual modernization using 21st.dev Magic MCP component catalog.

### Bug Fixed
**middleware.ts + proxy.ts conflict** — Next.js 16 detected both files and threw unhandled rejection on startup.
- Fix: deleted `src/middleware.ts` (both files had identical Supabase auth guard; `proxy.ts` is the Next.js 16 convention).

### Phase 1 — Foundation Primitives
6 new shared UI components in `src/components/ui/`:
- `animated-counter.tsx` — viewport-triggered spring counter (framer-motion + react-intersection-observer), respects `useReducedMotion()`
- `skeleton.tsx` — shimmer skeleton base + `InviteCardSkeleton` + `StatTileSkeleton`
- `magnetic-button.tsx` — mouse-follow spring pull ±8px, disables on touch, rose gradient default
- `spotlight-card.tsx` — cursor radial gradient via `useMotionTemplate`, `bare` prop to skip chrome
- `grid-pattern.tsx` — dotted/grid CSS background with radial fade mask
- `shimmer-text.tsx` — rose→gold gradient sweep on accent words

Also added `@keyframes shimmer` + `@keyframes shimmerText` + 3 CSS tokens (`--rose-glow`, `--midnight`, `--cream-deep`) to `globals.css`.

New deps: `@number-flow/react`, `react-intersection-observer`.

### Phase 2 — Landing + Auth
- **Hero.tsx**: grid background, "magic" wrapped in ShimmerText, AnimatedCounter for live stats, MagneticButton CTA, eyebrow pill "AI-drafted surprises"
- **HowItWorks.tsx**: rebuilt as asymmetric bento grid (2+1+1 cols), each cell in SpotlightCard
- **AuthForm.tsx**: inline `PasswordStrengthMeter` (4 segments, signup only), submit → MagneticButton
- **PerksList.tsx** (NEW): staggered `motion.li` perks (separate client component because signup/page.tsx is server)

### Phase 3 — Dashboard + Create
- **dashboard/page.tsx**: AnimatedCounter for stat tiles (removed `format` function prop — RSC can't pass functions to client components)
- **InviteCard.tsx**: SpotlightCard wrapper, 3-layer floating shadow, -6px hover lift via inline style
- **CommandPalette.tsx** (NEW): Cmd+K dialog — new surprise, settings, pricing, sign out, filter by occasion; arrow-nav + Enter/Esc
- **dashboard/loading.tsx** (NEW): Next.js route-segment skeleton (StatTileSkeleton × 5 + InviteCardSkeleton × 3)
- **StepIndicator.tsx**: numbered circles (completed/active/future states), animated rose fill bar, sticky top progress bar
- **PhotoUploader.tsx**: drag-over rose dashed border + floating "Drop photos here" badge
- **MessageEditor.tsx**: floating-label inputs via `peer-placeholder-shown` CSS
- **AIDraftButton.tsx**: "Drafting…" in shimmer-text-gradient during generation

### Phase 4 — Reveal + Pricing + Settings
- **PricingTiers.tsx** (NEW): monthly/yearly toggle, NumberFlow animated prices, SpotlightCard per tier, pulse badge on "Most popular", MagneticButton CTAs, staggered feature checklist entrance
- **pricing/page.tsx**: refactored — server-only header, delegates to `<PricingTiers>` client
- **PolaroidScroll.tsx**: sparkle burst on final card (8 deterministic positions, framer-motion, reduced-motion safe)
- **MessageReveal.tsx**: reveal title in ShimmerText
- **settings/page.tsx**: section headers get icon badge (rose gradient bg)
- **SettingsAnimated.tsx**: shimmer on save pending, CheckCircle on success (1.5s reset)

### Key Bug Fixed (RSC → CC boundary)
`format` prop dropped from `<AnimatedCounter>` in dashboard/page.tsx (Server Component passing `(v) => v.toLocaleString()` to Client Component fails React serialization). Default format already handles it.

### SpotlightCard Composition Fix
Patched to destructure `onMouseEnter/Leave/Move` from props and compose with internal handlers — prevents InviteCard's shadow/lift handlers from being overridden by SpotlightCard.

### Build Status
- tsc: 0 errors
- npm test: 171/171 pass
- Committed: `1d3e440` on `feat/sophistication`
- Pushed: `https://github.com/rohita7333-maker/Tadaaa`

### Patterns Reinforced
- **RSC → CC serialization**: functions (closures) can't cross the React Server/Client boundary. Only primitives, plain objects, arrays. Remove function props; use defaults on the client side.
- **loading.tsx vs inline Suspense**: When a page is a single async function that fetches its own data, `loading.tsx` is the right Suspense boundary — cleaner than manually wrapping each child.
- **SpotlightCard composition with bare prop**: `bare` prop pattern lets existing styled containers opt into cursor-radial behavior without re-theming — "open for extension, closed for modification."
- **next/font vs inline Geist**: Project uses next/font for Geist — don't add Google Fonts `<link>`; they're loaded via the layout.
- **Next.js 16 middleware/proxy**: `middleware.ts` is deprecated; only `proxy.ts` should exist. Both causes unhandled rejection at startup.

### Next Steps
1. Merge `feat/sophistication` → `main`
2. Connect to Vercel
3. Set env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, CRON_SECRET, ANTHROPIC_API_KEY, STRIPE_GIFT_PRICE_ID
4. Apply any remaining SQL migrations

---

## 2026-05-24 (security fix — rateLimit service-role)

**What happened:** Graphify graph traversal on `rateLimit()` surfaced a security issue. 4 public routes called `rateLimit()` before auth check, opening a service-role Supabase connection for every unauthenticated request.

**Affected routes (rateLimit before auth):**
- `/api/invite/answer` — line 9 vs auth line 98
- `/api/invite/rsvp` — public route, no user auth at all
- `/api/report` — public route, no user auth at all
- `/api/invite/[slug]/contribute` — public route, no user auth at all

**Root cause:** `rateLimit()` used `createServiceClient()` (service-role key). Service-role = admin DB access. Every anonymous RSVP/answer/report/contribute hit opened a service-role connection unnecessarily.

**Fix shipped:**
- `src/lib/rate-limit.ts`: `createServiceClient()` → `createClient()` (anon key)
- `sql/rate_limits_anon_rpc.sql`: rebuilt `consume_rate_limit` with `SECURITY DEFINER` + `GRANT EXECUTE TO anon, authenticated` + `ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY`
- Migration applied live via Supabase MCP (project `xrlmnlknymgakswsbawk`)

**Verified in Supabase:**
- `prosecdef: true` — RPC runs as owner regardless of caller
- `rls_enabled: true` — anon cannot read/write `rate_limits` table directly

**Pattern reinforced:** Supabase SECURITY DEFINER + GRANT EXECUTE to anon = correct pattern for public-callable RPCs that need to write protected tables. Service-role key should only be used when you actually need to bypass RLS (admin operations, webhooks, etc.).

**Commit:** `74c828a` on `feat/sophistication`, pushed to GitHub.

---

## 2026-05-24 (security audit — full privilege review)

**What happened:** Full audit of all `createServiceClient()` usage across the codebase. Found 4 P0s (service-role exposed to unauthenticated public paths) and 2 P1s (overcredentialed but auth-gated). All closed.

### P0 Findings + Fixes

**P0 #1 — `src/lib/invite-view.ts`**
- `createServiceClient()` used for `increment_view_count` RPC on public view path
- RPC had no SECURITY DEFINER or GRANT — service-role was the only reason it worked
- Fix: added SECURITY DEFINER + GRANT to RPC; `invite-view.ts` uses `createClient()` for invite SELECT + RPC; `createAdminClient()` isolated to notification block (profile reads, `auth.admin.getUserById`, email)

**P0 #2 — `src/app/api/invite/rsvp/route.ts`**
- Service-role on public POST; `invite_rsvps` had RLS enabled with no INSERT policy
- Fix: new `record_rsvp(p_invite_id, p_visitor_hash, p_user_agent)` SECURITY DEFINER RPC handles validation + upsert atomically, returns `{ok, code}`; route uses `createClient()`

**P0 #3 — `src/app/api/invite/answer/route.ts`**
- Worst: `auth.admin.getUserById()` called on a public POST route — admin auth API reachable by unauthenticated traffic
- Fix: new `record_answer(p_question_id, p_invite_id, p_answer, p_user_agent)` SECURITY DEFINER RPC returns `{ok, creator_id, title}`; route uses `createClient()`; `auth.admin.getUserById` moved to `createAdminClient()` inside email block

**P0 #4 — `src/app/api/unsubscribe/route.ts`**
- Service-role for profiles upsert on public path; HMAC token had no expiry (tokens from 3-year-old emails still valid forever)
- Fix: new `unsubscribe_user(p_user_id, p_list)` SECURITY DEFINER RPC; `verifyUnsubscribe()` now takes 4 args (added `dayParam`); tokens expire after 90 days via day-granular HMAC input + `d` URL param

### P1 Findings + Fixes

**P1 #1 — `src/actions/questions.ts`**
- `createServiceClient()` used for `invite_questions`, `invite_answers`, `invite_rsvps` reads/writes after correct `getUser()` + ownership check
- Discovery: RLS policies already existed and covered everything (`Creators can manage questions` ALL policy, `Creators can view answers` SELECT, `owner-read` on rsvps) — service-role was pure dead weight
- Fix: removed `createServiceClient()` entirely; all queries use the `createClient()` already initialized for auth; explicit ownership fetch retained in `saveQuestions` so callers get `{ error: "Not found" }` instead of silent RLS no-op returning `ok: true`

**P1 #2 — `expire-invites/route.ts` (already fixed — audit agent false positive)**
- Audit agent flagged raw `!==` timing oracle; code actually already used `safeBearerCheck()` at line 12. No change needed.

### Cleanup
- Dead `rsvp_count()` RPC dropped from DB (`drop_dead_rsvp_count_rpc` migration) + removed from `sql/invite_rsvps.sql`
- `sql/increment_view_count.sql` synced with deployed SECURITY DEFINER state

### SQL Migration
- `sql/public_rpc_security.sql` — 4 RPCs rebuilt/created with SECURITY DEFINER + GRANT to anon, authenticated; applied live via Supabase MCP

### Tests
- 7 new unsubscribe tests (expiry, missing-day, tamper cases)
- `src/app/api/unsubscribe/route.test.ts` updated to mock `createClient` (was `createServiceClient`)
- All 171 tests pass

### Commits
- `5f868d3` — fix(security): eliminate service-role from all public request paths
- `e9fb5f7` — fix(security): drop service-role from questions server actions
- `723bf67` — fix: restore ownership check in saveQuestions; drop dead rsvp_count RPC

### Pattern Reinforced
**`createServiceClient()` should never appear on a public (unauthenticated) request path.** The correct pattern:
- Public reads → `createClient()` (anon, RLS enforced)
- Public writes to RLS-protected tables → SECURITY DEFINER RPC + `createClient()`
- `auth.admin.*` calls → `createAdminClient()` (raw service-role, no cookies, narrowly scoped)
- `createServiceClient()` → cron routes + Stripe webhook only (cross-user, behind auth gate)

---

## 2026-05-30 — Motion P0 Foundation

**What happened:** Executed P0 of the MOTION_MASTERPLAN. Pure foundation — no visual changes. Establishes one shared motion "hand" across all surfaces.

**What was built:**
- `src/lib/motion.ts` (new) — typed easing tokens (`easings.*` 4-tuples for framer-motion, `cssEasings.*` strings for CSS `transition` props), spring configs (`springs.soft` stiffness:260/damping:22, `springs.weighty` stiffness:140/damping:18/mass:1.1), duration scale (instant/quick/base/slow/cinematic), `makeReducedMotionTransition` factory (defaults reduced to `durations.instant` not raw `{duration:0}`)
- `src/app/globals.css` — 4 CSS vars added to `:root`: `--ease-entrance`, `--ease-exit`, `--ease-spring-soft`, `--ease-spring-bouncy`
- `src/components/create/StepIndicator.tsx` — replaced `[0.22,1,0.36,1]` literal with `easings.entrance`; replaced ternary reduced-motion with `getReducedMotionTransition()`. Zero visual change.
- `src/components/surprise/PolaroidCarousel.tsx` — replaced `cubic-bezier(0.4,2,0.3,1)` CSS string literal with `cssEasings.springBouncy`; import switched from `@/lib/a11y` to `@/lib/motion`. Zero visual change.
- `src/lib/motion.test.ts` (new) — 40 tests covering all token values + reduced-motion factory paths

**Build status:** tsc 0 · 211/211 tests (was 171, +40) · lint 4 pre-existing errors not from P0 · branch `feat/sophistication`

**Key gotchas:**
- Two parallel token sets needed: `easings.*` (number arrays for framer-motion `ease` prop) vs `cssEasings.*` (strings for CSS `transition`). Can't use same value in both contexts.
- `makeReducedMotionTransition` uses `durations.instant` (0.12) not `{duration:0}` as default reduced path — per masterplan "never ship a raw duration:0 scatter".
- Duration mismatches: StepIndicator uses 0.5/0.45, PolaroidCarousel CSS uses 0.8s — none have exact token matches. Kept raw to preserve zero visual change. These will align in P1+ when those animations are redesigned.

**Next:** P1 (Reveal surface) — unwrap, continuity, message reveal, particle + reduced-motion fixes. Entry point: `src/components/surprise/TapToReveal.tsx`.

---

## 2026-05-30 — Motion P1: Reveal Surface Choreography

**Status:** DONE — gates P2 (Landing).

**What changed:**

**`src/lib/motion.ts`** — additive extensions:
- `durations.ambient = 2.8` (loop-range duration, 2.5–4s band, for FloatingParticles + reveal icon ambient loops)
- `staggers = { lead: 0, support: 0.06, detail: 0.10 }` — hierarchy-aware stagger offsets; replaces uniform drips

**`src/lib/motion.test.ts`** — +6 tests: staggers hierarchy, boundary cap (5×detail ≤ 0.5s), `durations.ambient` value, count assertion updated 5→6.

**`src/components/surprise/TapToReveal.tsx`** — full motion rework (logic machine untouched):
- FIXED: `FloatingParticles` had zero reduced-motion guard — vestibular hazard. Now receives `shouldReduce` prop; when true, `animate={}` (static particles, visible but no motion).
- FIXED: Reveal icon ambient loop had no reduced-motion guard. When `shouldReduce`, settles to `scale:1, rotate:0` instantly.
- REPLACED: All 6 stage transitions were flat opacity crossfades. Now:
  - Landing exit: `scale:1.08, y:-16` with `easings.exit` — unwrap "lid lifts"
  - Photos/Video enter: `scale:0.96, y:20 → springs.weighty` — hand-placed arrival with `vibrate(20)` on settle
  - Questions: directional slide (`x:±20`) with `easings.entrance`
  - Celebrate: scale-pop (`scale:1.04→1`) with `springs.soft`
  - Message: `y:20 → springs.weighty` — emotional weight
  - CTA: `y:16 → springs.soft`
- All inline magic numbers removed — 100% from `@/lib/motion` tokens.
- Removed unused `color` prop from FloatingParticles (−1 lint warning).

**`src/components/surprise/MessageReveal.tsx`** — stagger-with-intent:
- Title h2: word-by-word `blur(8px)→0` reveal, 0.04s `lead` stagger/word (rhymes with PolaroidCarousel captions)
- Body: `\n`-split line-by-line reveal, 0.10s `detail` stagger/line — killed the uniform word drip
- Button: token-computed delay after all body lines settle
- Imports switched from `@/lib/a11y` → `@/lib/motion` exclusively

**Gate results:** tsc 0 · vitest 217/217 · lint 19 problems (0 new from P1, −1 warning vs P0)

**Decisions:**
- `\n` split for body lines (not `. `) — preserves author intent, safe for URLs/abbreviations/ellipses
- Embedding `transition` inside `exit` objects — lets each stage own its departure physics independently
- `color` prop removal: was passed but never used in FloatingParticles (pre-existing dead code)
- `vibrate(20)` in `onAnimationComplete` on photos/video stages only — settle haptic, not repeated per-animation

**Next:** P2 — Landing (Hero.tsx de-uniform, scroll choreography, a11y gaps). Entry: `src/components/home/Hero.tsx`.

---

## 2026-05-30 — Motion P2: Landing surface de-uniform

**What happened:** Implemented P2 of MOTION_MASTERPLAN. Killed uniform fade-up-everything across all landing components. Added `useReducedMotion` to every animated landing component (historic gap).

**Key decisions:**
- Hero headline → word-by-word blur reveal (6 words, `staggers.word=0.04` cadence). Rhymes with PolaroidCarousel captions. Reduced path = single opacity fade-in.
- Badge entrance → `scale:0.85→1, springs.soft` (pop, not drift). Role: first trust signal should feel confident.
- Stats → horizontal slide `x:-16→0` (reading direction L→R), not another y drip.
- CTA → `scale:0.95→1, springs.soft` (action item pops).
- Subcopy → quieter `y:10→0, durations.slow`, starts while headline tail is still coming in (intentional overlap).
- HowItWorks step 01 → `x:-24→0` (wide dominant card slides from reading direction). Steps 02+03 → `y:20→0` (subordinate, rise).
- Testimonials → `y:20→0` (shorter than y:32 original — more refined), `staggers.support` cadence.
- Navbar mobile menu → **removed `height:0→"auto"`** (was animating layout property). Replaced with `opacity+y:-8→0` transforms only.
- All ambient loops (heart, polaroid float, reaction badges) → conditional render on `!reducedMotion`.

**P1 fix committed first:** `staggers.word=0.04` token + MessageReveal.tsx hardcoded 0.04 → token (`54ab8c7`).

**Gates passed:** tsc 0 · vitest 220/220 (+3 new tests) · lint 0 new errors · reduced-motion on all 4 landing components · gems untouched · no uniform fade-up remaining.

**Next:** P3 — Create wizard (step transitions, tactile inputs, publish payoff). Entry: `src/components/create/`.
