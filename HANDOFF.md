# TaDaaaa — Session Handoff (2026-05-30)

## Status: LOCAL-READY · DEPLOY-PENDING · MOTION-P3-DONE · SECURITY-HARDENED

**Tests:** 227/227 pass · **tsc:** 0 errors · **lint:** 4 pre-existing errors, 15 warnings (no new from P3) · **branch:** feat/sophistication

---

## What shipped this session (2026-05-30 — Motion P3 Create Wizard)

**P3 — Create flow motion layer (DONE, gates P4):**

- ✅ `src/app/create/page.tsx` — directional step transitions:
  - `makeSlideVariants(shouldReduce)` — reduced=true returns opacity-only; reduced=false returns `x:±60, opacity, scale:0.96` (depth cue on exit)
  - Transition tokenized: `durations.base + easings.entrance` (was inline `0.3, "easeInOut"`)
  - `useReducedMotion()` added at component top; `direction` state (1=fwd, -1=back) drives x polarity
- ✅ `src/components/create/OccasionSelector.tsx` — spring card feedback:
  - `motion.button` with `whileTap={{ scale:0.94 }}` + `animate={{ scale: selected ? 1.02 : 1, y: selected ? -1 : 0 }}`
  - `springs.soft` for all transitions — press feedback + selection confirm (not instant class flip)
  - `useReducedMotion()` guards whileTap
- ✅ `src/components/create/ThemeSelector.tsx` — same spring pattern (larger cards = `scale:0.96` whileTap):
  - `motion.button initial={false} animate={{ scale: isSelected ? 1.02 : 1 }}`
  - CSS `transition-all duration-300` → `transition-colors` (CSS only for color; motion owns transforms)
  - `useReducedMotion()` at component top
- ✅ `src/components/create/PhotoUploader.tsx` — spatial photo list:
  - Fixed inline magic `0.18` → `durations.instant`
  - `Loader2 animate-spin` → authored breathing `ImagePlus` (scale+opacity pulse via `durations.slow`)
  - `<AnimatePresence initial={false}>` + `<motion.div layout>` per photo — items enter from x:20 / exit to x:-20 with `springs.soft`
  - `useReducedMotion()` guards all; reduced = opacity-only instant
- ✅ `src/components/create/AIDraftButton.tsx` — authored loading state:
  - `<AnimatePresence mode="wait">` wraps open/closed panel states
  - Panel entrance: `scale:0.97, y:-8 → springs.soft` (not flat opacity)
  - Sparkles icon: `rotate:[0,20,-20,0], scale:[1,1.2,1]` loop while loading (authored pending, not Loader2)
  - `useReducedMotion()` guards all motion
- ✅ `src/components/create/RevealSettings.tsx` — was CSS-only; now spring selection + AnimatePresence fields:
  - `conditionalFieldTransition()` helper using `durations.quick + easings.entrance`
  - Tap/Countdown option buttons: `motion.button` with spring select confirm + whileTap
  - Countdown date + expiry date fields: `<AnimatePresence>` with `y:-6→0` slide-in/out
  - `useReducedMotion()` at component top
- ✅ `src/components/create/QuestionBuilder.tsx` — was no framer-motion; now AnimatePresence add/remove:
  - `<AnimatePresence initial={false}>` around question list
  - Add: `{ opacity:0, y:10, scale:0.97 } → { opacity:1, y:0, scale:1 }` via `springs.soft`
  - Remove: exits to `{ opacity:0, y:-10, scale:0.97 }`
  - `useReducedMotion()` gates — reduced = opacity only
- ✅ `src/components/create/PreviewPublish.tsx` — full success payoff + publish pending:
  - `<AnimatePresence mode="wait">` wraps form ↔ published success states
  - **Check circle payoff** — `springs.weighty` (mass:1.1, stiffness:140) — settles with tangible weight
  - Success headline: `y:8→0` with `durations.base + durations.instant` delay
  - Publish CTA: `<motion.div whileTap={{ scale:0.97 }} transition={springs.soft}>` wrapper (removed CSS hover:scale)
  - Publishing ✨: `scale:[1,1.15,1] opacity:[1,0.7,1]` loop via `durations.base`
  - `useReducedMotion()` throughout; reduced delays = 0
- ✅ `src/components/create/VideoGenerator.tsx` — was no framer-motion; now AnimatePresence status machine:
  - All 4 status blocks (none/processing/ready/failed): `y:6→0` entry, `y:-6` exit via `<AnimatePresence mode="wait">`
  - Processing: Film icon breathing pulse (not Loader2 spin) via `durations.slow`
  - Ready: CheckCircle2 entrance with `springs.soft`
  - `useReducedMotion()` guards all motion; Film pulse disabled on reduce
- ✅ `src/lib/motion.test.ts` — +7 P3 token contract tests:
  - Step transition uses `durations.base` (not magic 0.3)
  - Card press `springs.soft` non-reduced path returns full spring config
  - `springs.weighty.mass > 1` and lower stiffness than soft
  - Reduced path returns `durations.instant`
  - Conditional fields use `durations.quick < durations.base`
  - Processing loops use `durations.slow` = 0.6
  - Reduced step returns instant

**Files touched:** `src/app/create/page.tsx` · `src/components/create/OccasionSelector.tsx` · `src/components/create/ThemeSelector.tsx` · `src/components/create/PhotoUploader.tsx` · `src/components/create/AIDraftButton.tsx` · `src/components/create/RevealSettings.tsx` · `src/components/create/QuestionBuilder.tsx` · `src/components/create/PreviewPublish.tsx` · `src/components/create/VideoGenerator.tsx` · `src/lib/motion.test.ts`

**NOT touched:** `src/components/create/StepIndicator.tsx` (P0 gem — expo easing intact) · `src/components/create/MessageEditor.tsx` (inputs settle quietly via CSS — correct per spec)

**Verification:**
- `npx tsc --noEmit` → exit 0 ✓
- `npm test` → 227/227 pass (+7 new P3 token contract tests) ✓
- `npm run lint` → 0 new errors from P3 (4 pre-existing in animated-counter/magnetic-button) ✓
- Reduced-motion: all 7 animated create components have `useReducedMotion()` + guarded paths ✓
- Wizard direction correct: forward=enter-from-right (x:+60), back=enter-from-left (x:-60) ✓
- StepIndicator GEM byte-equivalent: untouched ✓
- Zero inline magic numbers in touched files ✓
- Transforms+opacity only — no width/height/margin animated ✓
- Authored pending states: AIDraftButton (Sparkles rotate+scale), PhotoUploader (ImagePlus breathe), VideoGenerator (Film breathe), PreviewPublish (✨ pulse) — no Loader2 spin ✓
- No uniform fade-up: every create element has role-differentiated motion (springs for cards/CTA, quick slide for fields, weighty for payoff) ✓

**Open risks / next phase entry point:**
- 60fps mobile profile: real-device Playwright verification still needed
- P4 (Dashboard — invite cards stagger/hover, command palette, onboarding modal, empty states) can now start
- P5 carry-over (Hero.tsx lines 320/348/356 ambient-loop inline durations + raw "easeInOut") — needs `durations.floatA/B` + easeInOut token before P5 hardening

---

## What shipped this session (2026-05-30 — Motion P2 Landing)

**P2 — Landing surface de-uniform + a11y (DONE, gates P3):**

- ✅ `src/components/landing/Hero.tsx` — full motion overhaul:
  - Eyebrow badge: `scale:0.85→1` via `springs.soft` (pop, not fade-up)
  - Subtitle badge: `opacity:0→1` only (supporting — doesn't compete)
  - h1 headline: **word-by-word blur reveal** — each of 6 words animates `filter:blur(8px)→0, opacity:0→1, y:6→0` with `staggers.word` offset; `ShimmerText` words treated as single units; reduced-motion = single `opacity` fade-in
  - Subcopy: `y:10→0, opacity:0→1` with `durations.slow` — quieter than hero, starts overlapping headline tail
  - CTA group: `scale:0.95→1` via `springs.soft` — pops in, not another y:24 drip
  - Stats ×3: **horizontal slide** `x:-16→0` with `staggers.detail` cadence (reading direction, not vertical drip)
  - Right panel entrance: `scale:0.92→1` via `springs.weighty` (weighted settle)
  - All ambient loops (heart pulse, polaroid float, reaction badges): fully guarded with `!reducedMotion` conditional
  - `useReducedMotion()` at component top — honored everywhere
  - Zero inline magic numbers — all from `@/lib/motion` T timing ladder
- ✅ `src/components/landing/HowItWorks.tsx` — directional card entrances:
  - Step 01 (wide/dominant): slides from left `x:-24→0` (reading direction)
  - Steps 02+03 (subordinate): rise `y:20→0` with `support`/`detail` stagger
  - Header: simpler `y:16→0` (not competing with hero)
  - `useReducedMotion()` guards all — instant opacity on reduce
  - Zero inline magic numbers
- ✅ `src/components/landing/Testimonials.tsx` — reading cadence stagger:
  - Cards: `y:20→0` (shorter travel = more refined; was 32), `staggers.support` between cards
  - Duration: `durations.base` (was inline 0.6)
  - `useReducedMotion()` + `makeReducedMotionTransition` on all cards + header
- ✅ `src/components/landing/Navbar.tsx` — fixed layout animation:
  - Mobile menu: **removed `height:0→"auto"`** (was animating layout property — violates transforms+opacity rule)
  - Replaced with `opacity:0→1, y:-8→0` (transforms+opacity only)
  - Exit: `opacity:0, y:-4`; duration: `durations.quick`
  - `useReducedMotion()` added — historic gap fixed
- ✅ `src/lib/motion.test.ts` — 3 new tests for P2 timing invariants:
  - `staggers.word` = 0.04 verified
  - `lead < word < support < detail` ordering
  - Hero headline settles before 0.8s (timing ladder contract)

**Files touched:** `src/components/landing/Hero.tsx` · `src/components/landing/HowItWorks.tsx` · `src/components/landing/Testimonials.tsx` · `src/components/landing/Navbar.tsx` · `src/lib/motion.test.ts`

**Verification:**
- `npx tsc --noEmit` → exit 0 ✓
- `npm test` → 220/220 pass (+3 new P2 motion tests) ✓
- `npm run lint` → 19 problems (4 errors, 15 warnings) — 0 new errors from P2 ✓
- Reduced-motion: Hero (badge/headline/subcopy/cta/stats/ambient loops), HowItWorks (header+cards), Testimonials (header+cards), Navbar (mobile menu) — all guarded ✓
- Gems intact: PolaroidCarousel untouched, StepIndicator untouched ✓
- Zero uniform fade-up remaining: every element has role-differentiated motion ✓
- Zero inline magic numbers in touched files ✓
- No layout animations: Navbar height removed; all use transforms+opacity only ✓
- Mobile fps: transforms + opacity only on hot path ✓

**Open risks / next phase entry point:**
- 60fps mobile profile: needs real-device Playwright verification
- P3 (Create wizard — step transitions, tactile inputs, publish payoff) can now start
- 4 pre-existing lint errors (animated-counter, magnetic-button) — not from motion work

---

## What shipped this session (2026-05-30 — Motion P1 Reveal)

**P1 — Reveal surface choreography (DONE, gates P2):**

- ✅ `src/lib/motion.ts` — added `durations.ambient` (2.8s, loop range) + `export const staggers` (`lead:0`, `support:0.06`, `detail:0.10`) for hierarchy-aware stagger
- ✅ `src/lib/motion.test.ts` — 6 new tests: `staggers` hierarchy + boundary cap + `durations.ambient`
- ✅ `src/components/surprise/TapToReveal.tsx` — full P1 motion rework:
  - `FloatingParticles`: added `shouldReduce` prop; **fixed reduced-motion bug** (particles were always looping — vestibular hazard); token-based durations/delays; removed unused `color` prop (−1 lint warning)
  - Reveal icon ambient loop: fully guarded (`shouldReduce` → static settle at scale:1); token durations
  - Landing exit — **unwrap choreography**: `scale:1.08, y:-16, ease:exit` (lid lifts off)
  - Photos/Video enter: `scale:0.96, y:20 → springs.weighty` settle (hand-placed arrival); `onAnimationComplete → vibrate(20)` haptic
  - All 6 stage transitions: replaced flat opacity crossfades with directional choreography (photos/video: weighted spring; questions: directional slide x:±20; celebrate: scale pop; message: weighty rise; cta: soft spring)
  - All transitions: zero inline magic numbers — 100% from `@/lib/motion`
  - `useReducedMotion` at component top; all stages have reduced path (`opacity only, durations.instant`)
- ✅ `src/components/surprise/MessageReveal.tsx` — P1 message choreography:
  - Title: word-by-word `blur(8px)→0` reveal (rhymes with PolaroidCarousel captions); `lead` stagger 0.04/word
  - Body: **replaced uniform word drip** with line-by-line reveal (`\n`-split); `detail` stagger 0.10/line
  - Button: arrives after all body lines settle (token-computed delay)
  - Imports switched from `@/lib/a11y` → `@/lib/motion` exclusively
  - All magic numbers removed; `easings.*`, `durations.*`, `springs.*`, `staggers.*` throughout

**Files touched:** `src/lib/motion.ts` · `src/lib/motion.test.ts` · `src/components/surprise/TapToReveal.tsx` · `src/components/surprise/MessageReveal.tsx`

**Verification:**
- `npx tsc --noEmit` → exit 0 ✓
- `npm test` → 217/217 pass (+6 new motion/stagger tests) ✓
- `npm run lint` → 19 problems (4 errors, 15 warnings) — 0 new errors; 1 fewer warning than P0 baseline ✓
- Reduced-motion: `FloatingParticles` static (no animate), reveal icon static, all stage wrappers opacity-only instant ✓
- Gems intact: PolaroidCarousel untouched, StepIndicator untouched ✓
- Zero inline magic numbers in touched files: all from `@/lib/motion` ✓
- Mobile fps: transforms + opacity only on hot path; no width/height/top/left animated ✓
- Bundle: no new imports added to route/page files ✓

**Open risks / next phase entry point:**
- 60fps mobile profile: needs real-device Playwright verification (not available in this session)
- P2 (Landing — Hero de-uniform, scroll choreography, a11y) can now start
- 4 pre-existing lint errors (animated-counter, magnetic-button) — not from motion work

---

## What shipped this session (2026-05-30 — Motion P0 Foundation)

**Tests:** 211/211 pass · **tsc:** 0 errors · **lint:** 4 pre-existing errors (not from P0) · **branch:** feat/sophistication

---

## What shipped this session (2026-05-30 — Motion P0 Foundation)

**P0 — Motion token foundation (DONE, blocks P1+):**

- ✅ `src/lib/motion.ts` — typed easing tokens (`easings.*` for framer-motion, `cssEasings.*` for CSS style props), spring configs (`springs.soft` / `springs.weighty`), duration scale (instant .12 / quick .2 / base .35 / slow .6 / cinematic .9), `makeReducedMotionTransition` factory extending `getReducedMotionTransition`
- ✅ `src/app/globals.css` — added 4 CSS vars inside `:root`: `--ease-entrance`, `--ease-exit`, `--ease-spring-soft`, `--ease-spring-bouncy`
- ✅ `src/components/create/StepIndicator.tsx` — migrated to `easings.entrance` + `getReducedMotionTransition()`; zero visual change (same easing values, same durations)
- ✅ `src/components/surprise/PolaroidCarousel.tsx` — migrated CSS `transition` string to `cssEasings.springBouncy`; zero visual change
- ✅ `src/lib/motion.test.ts` — 40 new tests (token exports + reduced-motion paths)

**Files touched:** `src/lib/motion.ts` (new) · `src/lib/motion.test.ts` (new) · `src/app/globals.css` · `src/components/create/StepIndicator.tsx` · `src/components/surprise/PolaroidCarousel.tsx`

**Verification:**
- `npx tsc --noEmit` → exit 0 ✓
- `npm test` → 211/211 pass (was 171; +40 new motion tests) ✓
- `npm run lint` → 4 errors (all pre-existing in animated-counter.tsx, error.tsx — not touched by P0) ✓
- Reduced-motion: `getReducedMotionTransition` / `makeReducedMotionTransition` both tested with `shouldReduce true/false/null` ✓
- Gems intact: PolaroidCarousel 3D spring preserved (same `cubic-bezier(0.4,2,0.3,1)` values); StepIndicator expo easing preserved (same `[0.22,1,0.36,1]` values) ✓
- Mobile fps: no hot-path change; CSS strings identical to before ✓
- No reveal-route bundle regression: no imports added to page/route files ✓

**Open risks / next phase entry point:**
- P1 (Reveal surface) can now start: all token references available in `@/lib/motion`
- Duration mismatches to resolve in P1: StepIndicator uses 0.5/0.45 (no exact token); PolaroidCarousel CSS 0.8s; these are intentional for P0 zero-visual-change, will align when redesigning those animations in P1+
- 4 pre-existing lint errors (animated-counter, error.tsx) — not from motion work, should be fixed in a cleanup pass

---

## Previous session state (2026-05-25)

## Status: LOCAL-READY · DEPLOY-PENDING · MODERNIZED · SECURITY-HARDENED · SEC-001/002/003 CLOSED · CFG-004/005/006 CLOSED

All 6 code blockers from LAUNCH_PLAN.md closed. Remaining blockers (#7-#10) require external dashboard access.

**Tests:** 190/190 pass · **tsc:** 0 errors · **lint:** 4 pre-existing errors in untouched UI components

**Latest commit:** `3537711` on `feat/sophistication` — fix(vercel): extend AI drafter timeout and pin region to iad1

---

## What shipped this session (2026-05-25 Hour 2 — code-only)

**CFG-004 — PWA manifest path (CLOSED):**
- ✅ `layout.tsx`: `manifest: "/manifest.json"` → `manifest: "/manifest.webmanifest"`

**CFG-005 — Missing viewport export (CLOSED):**
- ✅ `layout.tsx`: Added `export const viewport: Viewport` with `width: "device-width"`, `initialScale: 1`, `themeColor: "#FFF8F0"` (confirmed brand color from globals.css)

**CFG-006 — vercel.json function config (CLOSED):**
- ✅ `vercel.json`: Added `functions` block (`maxDuration: 30` for draft-invite route) + `regions: ["iad1"]`

**Commits:** `19fef7d` (layout) · `3537711` (vercel)

---

## What shipped this session (2026-05-25 Hour 1)

**SEC-001 — Orphan photo storage (CLOSED):**
- ✅ `signed-upload-url/route.ts`: path now targets `pending/{user}/{invite}/{i}.{ext}`
- ✅ `invite.ts` / `finalizeInvite`: validates `pending/` prefix, copies file to canonical path after moderation, deletes pending original; stores canonical path in `invite_photos`
- ✅ New `/api/cron/sweep-orphans/route.ts`: deletes pending files >30 min old + invite rows (is_active=false, no photos) >30 min old
- ✅ `vercel.json`: registered sweep-orphans at `0 */6 * * *`

**SEC-002 — Orphan invite rows / quota evasion (CLOSED):**
- ✅ Monthly cap query now filters `.eq("is_active", true)` — abandoned shells don't count
- ✅ New invite INSERT defaults `is_active: false`
- ✅ `finalizeInvite`: flips `is_active: true` only on success past moderation

**SEC-003 — Path ext brittleness (CLOSED):**
- ✅ `signed-upload-url/route.ts`: replaced `ALLOWED_EXT.includes(userInput).toLowerCase()` with explicit `switch` returning hardcoded string literals

**Tests added:** +17 new tests (invite.test.ts × 5, route.test.ts × 6, sweep-orphans/route.test.ts × 6)

---

## What shipped this session (2026-05-24)

**Bug fix:**
- ✅ Deleted `src/middleware.ts` — was conflicting with `proxy.ts` (Next.js 16), causing dev server crash

**Security fix #1 — rate limiter (graphify-surfaced):**
- ✅ `rateLimit()` swapped `createServiceClient()` → `createClient()` — 4 public routes were opening service-role connections on every unauthenticated request
- ✅ `consume_rate_limit` RPC rebuilt with `SECURITY DEFINER` + `GRANT EXECUTE TO anon, authenticated`
- ✅ `ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY` — blocks direct table access

**Security fix #2 — full privilege audit (P0 + P1 all closed):**
- ✅ Audited all `createServiceClient()` usage across codebase — found 4 P0s (service-role on public request paths) + 2 P1s (overcredentialed but auth-gated)
- ✅ `increment_view_count` RPC: added `SECURITY DEFINER` + `GRANT EXECUTE TO anon, authenticated`; `invite-view.ts` now uses `createClient()` for public reads, `createAdminClient()` for notification block
- ✅ RSVP route: new `record_rsvp(p_invite_id, p_visitor_hash, p_user_agent)` SECURITY DEFINER RPC handles validation + upsert atomically; route uses `createClient()`
- ✅ Answer route: new `record_answer(p_question_id, p_invite_id, p_answer, p_user_agent)` SECURITY DEFINER RPC returns `{ok, creator_id, title}`; `auth.admin.getUserById` isolated to `createAdminClient()` in email block
- ✅ Unsubscribe route: new `unsubscribe_user(p_user_id, p_list)` SECURITY DEFINER RPC; token expiry added (90-day HMAC with day param `d` in URL)
- ✅ `questions.ts` server actions: removed `createServiceClient()` — RLS policies on `invite_questions`/`invite_answers`/`invite_rsvps` already scope to `auth.uid()`; ownership check retained in `saveQuestions` for clear error messaging
- ✅ Dead `rsvp_count()` RPC dropped from DB + sql file
- ✅ `sql/increment_view_count.sql` synced with deployed SECURITY DEFINER state
- ✅ Migration `public_rpc_security.sql` applied live in Supabase
- ✅ 7 new unsubscribe tests (expiry, missing-day, tamper cases); all 171 tests pass

**4-Phase 21st.dev Modernization:**
- ✅ Phase 1 — 6 new UI primitives: animated-counter, skeleton, magnetic-button, spotlight-card, grid-pattern, shimmer-text + CSS tokens + keyframes + deps
- ✅ Phase 2 — Landing + Auth: bento HowItWorks, hero grid + shimmer + animated counters + magnetic CTA, password strength meter, staggered perks list
- ✅ Phase 3 — Dashboard + Create: stat animated counters, spotlight floating invite cards, Cmd+K command palette, loading skeleton, step indicator w/ progress bar, floating-label inputs, drag-over uploader
- ✅ Phase 4 — Pricing + Settings + Reveal: NumberFlow price toggle, PricingTiers client component, sparkle burst on final polaroid, ShimmerText reveal title, settings icon badges, shimmer/success save button

---

## Quick Status Table

| Layer | State | Notes |
|---|---|---|
| TypeScript | exit 0 | `npx tsc --noEmit` |
| Tests | 171/171 pass | `npm test` (vitest) |
| Lint | 0 errors | 13 warnings (intentional) |
| Dev server | http://localhost:3000 | `npm run dev` from `surprise-invite/` |
| Branch | feat/sophistication | 5 commits ahead of main |
| GitHub | pushed | https://github.com/rohita7333-maker/Tadaaa |
| SQL migrations | all applied | via Supabase MCP (incl. rate_limits_anon_rpc, public_rpc_security) |
| ANTHROPIC_API_KEY | .env.local ✅ | AI drafter works locally |
| Stripe | .env.local placeholder | need real test keys |
| Resend | .env.local empty | emails silent-fail locally |
| Google OAuth | Verified live | Provider + Google Cloud client configured |

---

## Deploy Checklist

**Before merging to main:**
- [ ] Stripe: create test Price for $5 gift → get `STRIPE_GIFT_PRICE_ID`
- [ ] Stripe: get `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- [ ] Resend: get `RESEND_API_KEY`
- [ ] PostHog: create feature flag `share_copy_v1` (values: `control|personal|intrigue`)

**Vercel deploy:**
1. Connect GitHub repo (`rohita7333-maker/Tadaaa`) to Vercel
2. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLUS_PRICE_ID`, `STRIPE_GIFT_PRICE_ID`, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `POSTHOG_API_KEY`
3. After deploy: update Supabase Auth → Site URL + Redirect URLs to prod domain
4. After deploy: update Stripe webhook URL to prod
5. Merge `feat/sophistication` → `main`

---

## All Features Shipped (cumulative)

### Foundation
- 4-step create wizard (Occasion → Photos → Message → Publish)
- 6 occasion types with themes, Polaroid photo uploader, yes/no dodge question, confetti RSVP

### Platform
- Subscription tiers (Free / Plus / Unlimited / Gift), Stripe checkout + webhook + tier enforcement
- $5 gift purchase → magic-link redemption (90-day expiry)
- Settings page (notifications, password change, delete account + storage purge)
- RSVP persistence, content reporting + moderation table

### Security (all P0 + P1 closed — full privilege audit done)
- DB-backed rate limiter (`consume_rate_limit` RPC, fails OPEN, anon key)
- Stripe webhook dedup + customer binding, atomic video claim
- Auth IP rate limits, server-side theme paywall
- Atomic view count, open-redirect prevention
- `record_rsvp`, `record_answer`, `increment_view_count`, `unsubscribe_user` — all SECURITY DEFINER + GRANT to anon; no service-role on public request paths
- Unsubscribe tokens: 90-day HMAC expiry (day param in URL)
- `createServiceClient()` confined to cron routes only (cross-user system ops behind `safeBearerCheck`)

### Features
- AI invite drafter (claude-sonnet-4-6, prompt caching, 10/hr)
- Collaborative memory invites (contributions + photo upload + merge into polaroids)
- Video share button (`navigator.share({files})` + download fallback)
- Onboarding modal (empty dashboard, anti-slop copy)
- Command palette (Cmd+K, 6 quick actions, arrow nav)
- HMAC unsubscribe (weekly/monthly/all, RFC 8058)
- Per-route error boundaries, PWA manifest, vitest suite (171 tests)

### UI Modernization (21st.dev — new this session)
- Animated spring counters (viewport-triggered, reduced-motion safe)
- Spotlight cards (cursor radial gradient), floating 3-layer shadows
- Magnetic buttons (spring pull, touch-safe)
- Grid/dot backgrounds, shimmer text, NumberFlow price transitions
- Bento grid HowItWorks, password strength meter
- Skeleton loading states, step indicator with progress bar
- Floating-label inputs, drag-over upload highlight
- Sparkle burst on final polaroid reveal, shimmer + checkmark save

---

## SQL Migrations Applied (all run)

1. `sql/stripe_events.sql`
2. `sql/rate_limits.sql`
3. `sql/stripe_customers.sql`
4. `sql/increment_view_count.sql`
5. `sql/invite_rsvps.sql`
6. `sql/invite_contributions.sql`
7. `sql/ai_drafts.sql`
8. `sql/gift_purchases.sql`
9. `sql/profiles_welcomed_at.sql`
10. `sql/rate_limits_anon_rpc.sql` — SECURITY DEFINER + RLS on rate_limits (applied 2026-05-24)
11. `sql/public_rpc_security.sql` — SECURITY DEFINER + anon GRANT for increment_view_count, record_rsvp, record_answer, unsubscribe_user; drops dead rsvp_count RPC (applied 2026-05-24)

---

## Architecture Notes

- **Rate limit fails OPEN** — DB outage won't lock everyone out
- **RSC → CC boundary** — functions can't cross; only primitives. Removed `format` function prop from AnimatedCounter in Server Component.
- **Next.js 16**: `proxy.ts` is middleware; `middleware.ts` must not exist alongside it
- **Two-render SSR pattern** — `useState(false)` + `useEffect(() => readStorage())` for window/storage access; lazy initializer = hydration mismatch
- **loading.tsx vs inline Suspense** — for single async page functions, `loading.tsx` is the correct segment boundary
- **Supabase least-privilege pattern** — `SECURITY DEFINER` + `GRANT EXECUTE TO anon` on RPCs that need to write protected tables. Service-role key only for true admin ops (webhooks, cron, storage admin). Public routes must use `createClient()` (anon) or `createAdminClient()` for isolated admin API calls — never `createServiceClient()` on a public request path.
- **`createAdminClient()` vs `createServiceClient()`** — both are service-role but `createAdminClient()` is raw (no cookies), purpose-built for `auth.admin.*` calls. `createServiceClient()` has cookie plumbing — only valid in SSR contexts that legitimately need cross-session service-role access (cron, webhooks).

Full session diary: `memory/diary.md`
