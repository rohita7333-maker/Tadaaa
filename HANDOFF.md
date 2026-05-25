# TaDaaaa — Session Handoff (2026-05-25)

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
