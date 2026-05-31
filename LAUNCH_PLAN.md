# TaDaaaa — Launch Plan

**Owner:** Rohit
**Status:** GO/NO-GO HOLD — 3 blockers between us and production
**Target ship:** Today + 3 hours of focused work
**Branch:** `feat/sophistication` (20 commits ahead of `main`)
**Last audit:** 2026-05-25

---

## 1. Executive Summary (read this first)

TaDaaaa is 95% production-ready. Code quality is solid: 173/173 tests pass, zero TypeScript errors, zero lint errors, full security privilege audit closed, 13 SQL migrations live in production Supabase, GDPR + cookie consent + error boundaries + Sentry + PostHog all wired.

We are **NOT** ready to ship because of three categories of problems, none of which are deep:

1. **Two NEW security holes** introduced today during the photo-upload refactor. Both are trivially exploitable and would expose us to legal liability on day one. Fix is mechanical, ~75 minutes.
2. **Five small config gaps** — PWA manifest path, viewport export, `vercel.json` function config, env var checklist incomplete. Total fix time: ~25 minutes.
3. **Three external integrations** still on placeholder keys: Stripe live, Resend, Sightengine moderation. Total: ~45 minutes of dashboard work.

**Total path to live:** ~3 hours of disciplined execution, then merge → deploy → smoke test → done.

The Bezos question: *what would I regret in 30 days?* Answer: shipping without moderation keys, getting one piece of CSAM uploaded, and dealing with that. So the moderation key (#10 below) is non-negotiable even though it's the most boring task in this document.

---

## 2. What's Already Done (do not re-verify)

These were verified clean during the 2026-05-25 audit. Move on.

- All 13 SQL migrations applied to production Supabase (rate_limits_anon_rpc, public_rpc_security, gift_purchases, stripe_events, stripe_customers, invite_rsvps, invite_contributions, ai_drafts, profiles_welcomed_at, account_audit, increment_view_count, rate_limits, ALL_MIGRATIONS)
- Row-Level Security enabled on every public table
- All three cron routes (`expire-invites`, `weekly-digest`, `monthly-email`) use timing-safe `safeBearerCheck` with fail-closed on missing `CRON_SECRET`
- Service-role key eliminated from all public request paths; `createServiceClient()` confined to cron + webhook handlers
- GDPR export (rate-limited 5/day, audit-logged) + account delete with storage purge
- Cookie consent banner mounted in root layout
- `/privacy`, `/terms` legal pages exist
- Stripe webhook idempotency (claim_stripe_event RPC + UNIQUE constraint for gift sessions)
- Google OAuth verified live in Google Cloud + Supabase Auth
- Per-route error boundaries (root + `/dashboard`, `/surprise`, `/create`) + `not-found.tsx`
- Sentry + PostHog wired in `instrumentation.ts` + `instrumentation-client.ts`, gated on `NODE_ENV=production`
- CSP `connect-src` includes `*.supabase.co` — new direct-to-Storage upload flow works behind CSP without changes
- Zero `TODO/FIXME/HACK` in `src/` (excluding tests + tooling)
- 21st.dev visual modernization shipped (animated counters, magnetic buttons, spotlight cards, NumberFlow pricing, command palette, etc.)

---

## 3. Launch Blockers — fix in this order

### BLOCKER #1 — Orphan photo storage (P0 security)
**Location:** `src/app/api/photos/signed-upload-url/route.ts` + `src/actions/invite.ts`
**Risk:** Attacker calls `createInviteShell`, gets a signed PUT URL, uploads arbitrary content (CSAM, malware, copyrighted material), and never calls `finalizeInvite`. The file lives in our `invite-photos` bucket indefinitely. We are legally liable for hosted content we never moderated.
**Fix:**
1. Change signed-URL path from `${userId}/${inviteId}/${i}.${ext}` to `pending/${userId}/${inviteId}/${i}.${ext}`
2. In `finalizeInvite`, copy each pending file to its final path, run moderation, then delete the pending file
3. Add `/api/cron/sweep-orphans/route.ts` that deletes anything in `pending/` older than 30 minutes
4. Register the sweep cron in `vercel.json` with `0 */6 * * *` (every 6 hours)

**ETA:** 60 minutes
**Owner:** Rohit (or `tdd` skill)

### BLOCKER #2 — Orphan invite rows / quota evasion (P0 security)
**Location:** `src/actions/invite.ts:47-51`
**Risk:** Free users hit their monthly invite cap by calling `createInviteShell` repeatedly without finalizing. Dead rows accumulate and never expire.
**Fix:**
1. Change the monthly-cap query to `.eq("is_active", true)` so abandoned shells don't count
2. In the same sweep cron from Blocker #1, also delete `invites` rows older than 30 minutes that have zero `invite_photos` joins
3. Set `is_active=false` as the default for new invite rows; flip to `true` at end of `finalizeInvite`

**ETA:** 15 minutes
**Owner:** Rohit

### BLOCKER #3 — Path extension brittleness (P0 security)
**Location:** `src/app/api/photos/signed-upload-url/route.ts:49-65`
**Risk:** Today the `ALLOWED_EXT` whitelist makes traversal infeasible. Future relaxation creates path traversal. Defense-in-depth.
**Fix:** Replace `(rawExt as string).toLowerCase()` interpolation with an explicit `switch` returning hardcoded literals. Never let user-controlled strings into a filesystem path.
**ETA:** 5 minutes
**Owner:** Rohit

### BLOCKER #4 — PWA manifest path mismatch (P0 config)
**Location:** `src/app/layout.tsx:44`
**Risk:** `manifest: "/manifest.json"` returns 404 because Next.js serves the file at `/manifest.webmanifest`. No mobile install prompt. PWA badge in browser doesn't appear.
**Fix:** Change to `manifest: "/manifest.webmanifest"`.
**ETA:** 1 minute
**Owner:** Rohit

### BLOCKER #5 — Missing `viewport` export (P0 config)
**Location:** `src/app/layout.tsx`
**Risk:** Next.js 16 requires `export const viewport` for `themeColor` + `width=device-width`. Without it, mobile renders at desktop width and `theme-color` browser chrome doesn't apply.
**Fix:** Add the `viewport` export with `width: "device-width"`, `initialScale: 1`, `themeColor: "#FFF8F0"` matching brand.
**ETA:** 5 minutes
**Owner:** Rohit

### BLOCKER #6 — `vercel.json` function config missing (P0 config)
**Location:** `vercel.json`
**Risk:** AI drafter `/api/ai/draft-invite` defaults to a 10-second timeout. Anthropic API calls regularly take 8-15 seconds with prompt caching warmup. Users will see "drafter failed" half the time.
**Fix:** Add `functions` block setting `src/app/api/ai/draft-invite/route.ts` to `maxDuration: 30`. Set `regions: ["iad1"]` for predictable Supabase latency.
**ETA:** 5 minutes
**Owner:** Rohit

### BLOCKER #7 — Stripe live keys missing (P0 business)
**Location:** Stripe Dashboard + Vercel env
**Risk:** Subscription + gift checkout broken on day one.
**Fix:** In Stripe dashboard:
1. Activate account if not already live
2. Create live products: "Plus monthly", "$5 gift"
3. Copy live `STRIPE_SECRET_KEY`, `STRIPE_PLUS_PRICE_ID`, `STRIPE_GIFT_PRICE_ID`
4. Create live webhook endpoint pointing at `https://<prod-domain>/api/stripe/webhook`, copy `STRIPE_WEBHOOK_SECRET`
5. Paste all four into Vercel env vars

**ETA:** 20 minutes
**Owner:** Rohit

### BLOCKER #8 — Resend API key missing (P0 business)
**Location:** Resend dashboard + Vercel env
**Risk:** No magic-link delivery means $5 gift redemption flow is broken, weekly digests don't send, password reset doesn't work.
**Fix:**
1. Sign up at resend.com if not done
2. Add and verify sending domain
3. Copy `RESEND_API_KEY`
4. Paste into Vercel env + set `RESEND_FROM_EMAIL=hello@<your-domain>`

**ETA:** 10 minutes
**Owner:** Rohit

### BLOCKER #9 — Sightengine moderation keys missing (P0 business + legal)
**Location:** Sightengine dashboard + Vercel env
**Risk:** Image moderation currently fails OPEN (by design — so a Sightengine outage doesn't lock out users). Without keys configured, every uploaded photo passes through unscanned. Combined with public sharing, this is a CSAM-risk vector on day one.
**Fix:**
1. Sign up at sightengine.com (free tier: 2,000 ops/month is plenty for week 1)
2. Copy `SIGHTENGINE_API_USER` + `SIGHTENGINE_API_SECRET`
3. Paste into Vercel env

**ETA:** 15 minutes
**Owner:** Rohit

### BLOCKER #10 — Complete env var checklist
**Location:** `HANDOFF.md` deploy checklist + Vercel env
**Risk:** Half-configured production. Sentry / PostHog won't initialize, OG metadata broken, `RESEND_FROM_EMAIL` undefined.
**Fix:** Verify and paste all of the following into Vercel project env (alphabetical):

```
ANTHROPIC_API_KEY
CRON_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
POSTHOG_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
SENTRY_AUTH_TOKEN
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SIGHTENGINE_API_SECRET
SIGHTENGINE_API_USER
STRIPE_GIFT_PRICE_ID
STRIPE_PLUS_PRICE_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

**ETA:** 10 minutes
**Owner:** Rohit

---

## 4. Post-Launch — 48-Hour Hardening

Not blocking launch. Address within 48 hours of going live.

| # | Task | Risk if skipped | ETA |
|---|------|-----------------|-----|
| 1 | Add `UNIQUE(invite_id, storage_path)` to `invite_photos` | Concurrent `finalizeInvite` calls duplicate photo rows | 5 min |
| 2 | Bump Sentry Replay sample rate from 0.05 → 0.10 | Lower-fidelity session replay during early debugging | 1 min |
| 3 | Create PostHog feature flag `share_copy_v1` with `control / personal / intrigue` variants | A/B test never activates, all users see control | 5 min |
| 4 | Add `capture="environment"` to PhotoUploader `<input>` | Mobile camera doesn't auto-launch on tap | 2 min |
| 5 | Set up Vercel deploy notifications → Slack or email | Silent prod failures | 5 min |
| 6 | Configure custom domain in Vercel + verify DNS | App lives on `*.vercel.app` until then | 15 min |
| 7 | Set up uptime monitoring (Better Stack / Pingdom free) | No alert if site goes down | 10 min |
| 8 | Add `robots.txt` allowing crawl + sitemap.xml | SEO blind for first week | 10 min |

---

## 5. Ship Sequence — Hour-by-Hour

### Hour 1 — Fix Code Blockers
```
00:00  Write failing tests for Blocker #1 + #2 (TDD discipline)
00:20  Implement pending/ prefix + sweep cron route
00:50  Implement is_active gating + cap query
01:00  Hardcode ext switch, run typecheck + tests
```
**Gate to advance:** all 173+ tests green, `npx tsc --noEmit` exit 0.

### Hour 2 — Config + External Integrations
```
01:00  Fix manifest path + add viewport export
01:10  Update vercel.json with function config + regions
01:20  Stripe dashboard: live keys + webhook
01:40  Resend signup + domain verify
01:50  Sightengine signup + key copy
02:00  Paste all env vars into Vercel project settings
```
**Gate to advance:** every blocker checked off, env vars list complete.

### Hour 3 — Deploy + Smoke Test
```
02:00  git add + commit + push to feat/sophistication
02:05  Vercel: connect GitHub repo to project
02:10  First preview deploy starts
02:15  Smoke-test preview URL — see Section 7 below
02:45  Update Supabase Auth Site URL + Redirect URLs to prod domain
02:50  Update Stripe webhook URL to prod
02:55  Merge feat/sophistication → main
03:00  Production deploy from main → custom domain live
```

### Hour 4 — Launch Ops
```
03:00  Verify Sentry receiving errors from prod (trigger one synthetic error)
03:10  Verify PostHog receiving events (load dashboard, check events tab)
03:20  Manual smoke-test full critical path from a fresh browser
03:30  Tweet / post launch
03:40  Watch Sentry + Vercel logs for 30 min
```

---

## 6. Smoke Test Checklist (run on preview URL before merging to main)

Run these in order. Each must pass. If any fails, fix before merging.

- [ ] Landing page loads, hero animation runs, magnetic CTA pulls cursor
- [ ] Signup with new email → confirmation email arrives via Resend → click magic link → land on dashboard
- [ ] Signup with Google OAuth → consent screen → dashboard
- [ ] Create invite: pick occasion → pick theme → upload 3 photos (one >500KB) → add message + reveal type → publish
- [ ] **Verify photo upload no longer hits 1MB Server Action limit** (this is today's regression test)
- [ ] Publish succeeds, share link displayed, copy-to-clipboard works
- [ ] Open share link in incognito → tap-to-reveal animation runs → polaroid carousel works → confetti on RSVP yes
- [ ] Cmd+K command palette opens on dashboard, all 6 actions reachable by arrow keys
- [ ] Pricing page: NumberFlow toggle animates, magnetic CTA, Stripe checkout opens in new tab → enter test card `4242 4242 4242 4242` → returns to success page → tier flipped in profile
- [ ] $5 gift checkout → magic-link email arrives → click → redeem on someone else's account
- [ ] Settings: toggle notification preference → reload → persisted
- [ ] Settings: delete account → confirms → storage purged → redirected to landing
- [ ] Unsubscribe link in weekly digest email works without auth
- [ ] Upload obviously NSFW test image → Sightengine flags it → user sees friendly error → invite rolled back
- [ ] Hit `/api/photos/signed-upload-url` from a different user's session → 404 invite-not-found
- [ ] Cron routes: `curl -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/cron/expire-invites` returns 200; without header returns 401

---

## 7. Rollback Plan

If anything breaks in production:

1. **Vercel one-click revert:** Project → Deployments → previous green deploy → "Promote to Production". Takes ~10 seconds.
2. **DB rollback:** No destructive SQL was deployed today. All migrations are additive. If a new migration causes problems, run the inverse SQL via Supabase SQL Editor.
3. **Stripe webhook URL:** revert to old endpoint URL in Stripe dashboard if webhook handler regresses.
4. **Communication:** prepared message in `memory/diary.md` template: "We hit a bug in [X], reverted within Y minutes, no data lost, sorry for the noise."

Rollback exercises confidence — practice it before launch by promoting an old preview deploy, verifying, then re-promoting current. 5 minutes of practice.

---

## 8. Day-1 Success Metrics

Watch these from launch hour zero. Each has a "tripwire" threshold — cross it and stop, investigate.

| Metric | Source | Tripwire |
|--------|--------|----------|
| 5xx error rate | Sentry | > 1% of requests |
| Photo upload failures | PostHog `photo_upload_failed` event | > 5% of attempts |
| Stripe webhook failures | Stripe Dashboard → Developers → Webhooks | > 0 in first hour |
| Sightengine moderation rejections | PostHog `photo.rejected` event | > 10% (suggests false positives) |
| Time-to-first-publish | PostHog funnel: signup → publish | > 5 minutes p50 |
| Signup-to-publish conversion | PostHog funnel | < 40% p50 |
| Cron run failures | Vercel logs | any failure first 24h |
| DB connection saturation | Supabase Dashboard | > 60% pool utilization |

---

## 9. Week-1 Roadmap (post-launch)

Once stable for 48 hours, the founder questions become: *what did users actually do, what did they ignore, where did they bounce?* Use PostHog to answer each.

1. **Most common drop-off step in create wizard** — fix the friction there first
2. **Free → Plus conversion rate** — if < 2%, the paywall is too soft or pricing is wrong
3. **Share link CTR** — if recipients aren't clicking, the share copy needs work (we have an A/B test ready)
4. **Photo count distribution** — if median is 1 photo, the uploader UX isn't selling the polaroid story
5. **AI drafter usage** — if < 20% of users tap it, surface it more prominently or kill it

The biggest founder mistake at this stage is shipping features. Resist. The right move week 1 is: watch funnels, fix friction, talk to the first 50 users by email.

---

## 10. Decision Log (founder context)

These decisions were made during today's session. Recorded so the next person inheriting context knows the "why":

| Decision | Why |
|----------|-----|
| Two-phase photo upload (signed URL → finalize) | Bypasses Next.js 1MB Server Action limit + Vercel's 4.5MB serverless cap. Scales to any photo count. |
| `safeBearerCheck` for cron auth | Timing-safe comparison closes the timing oracle attack vector that raw `!==` opens |
| `SECURITY DEFINER` + GRANT TO anon for RPCs | Lets public routes hit protected tables without service-role key exposure on public request paths |
| Service-role key confined to cron + webhook | Surface area minimization — if a public route is ever compromised, the service-role blast radius is zero |
| 21st.dev motion primitives over hand-rolled animations | Battle-tested, reduced-motion-safe, ships in days not weeks |
| Sightengine for moderation | Cheaper than AWS Rekognition, comparable accuracy, simpler API |

---

## 11. "What Would I Regret Most" Stack-Rank

The single best founder exercise. For each item, ask: *if this goes wrong on day one, will I regret not having fixed it?*

1. **Sightengine keys missing** → CSAM uploaded → existential. **Fix.**
2. **Orphan storage attack** → CSAM uploaded → existential. **Fix.**
3. **Stripe live keys missing** → no revenue + embarrassing emails to refund "purchases" → high. **Fix.**
4. **Resend missing** → magic-link gift flow broken → confused users, support tickets → medium-high. **Fix.**
5. **PWA manifest 404** → mobile install prompt missing → low. Annoying but not regret-worthy. **Fix because it's 1 minute.**
6. **`vercel.json` AI drafter timeout** → "drafter failed" half the time → users blame the product → medium. **Fix.**
7. **Viewport missing** → mobile looks janky on first load → low-medium. **Fix.**
8. Everything else in this document → won't regret skipping for week one.

---

## 12. The One-Sentence Status

> *We are three hours and ten focused tasks away from production. Every blocker is mechanical. Nothing requires invention. Execute, then ship.*
