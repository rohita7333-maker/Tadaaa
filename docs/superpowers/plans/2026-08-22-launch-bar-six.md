# Launch Bar Six — Recovery + Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six launch-blocking gaps Rohit named on 2026-08-22 (AI-slop look, per-invite analytics, camera video message, live create preview, four-way reveal picker, QR) and attach the LAUNCH_PLAN ship sequence to the end — nothing else enters scope.

**Architecture:** Recover the reverted editorial retheme + P4 work from `docs/superpowers/snapshots/FINAL-web.patch` on a fresh branch, repair the five documented reveal bugs it carries, then build the four genuinely-new pieces (real analytics data capture, camera recorder, live preview, letters authoring) on top. Web only; mobile stays paused per the 2026-08-13 pivot (its analytics screen + QR already exist in its tree).

**Tech Stack:** Next.js 16 / Supabase (never-drop migrations) / vitest / Playwright / MediaRecorder API / qrcode.react (installed) / Sightengine.

## Global Constraints

- **NEVER drop** any table/column/function/trigger (standing user rule 2026-08-09). All migrations additive, shown to user, explicit yes before apply.
- Evidence rule: "done/passing" only with pasted output. Browser screenshot for every visual claim — code reading lied about the reveal bugs before.
- Gates in order per phase: `npx tsc --noEmit` → `npm run lint` → `npm test` → build → runtime walk.
- Baseline is UNKNOWN post-revert — Task A1 records it; it never regresses after.
- Trust the live DB, never `sql/` files (query `pg_constraint`/`pg_policy`).
- Commits now REQUIRED per task (the no-commit hold caused this loss — lifted for this plan with user's go).
- Scope freeze: the six items + ship. Any seventh idea goes to `docs/TODOS.md`, not the plan.

---

## Phase A — Protect, Recover, Repair (Day 1–2)

### Task A1: Record ground truth and protect the patches

**Files:** none created; commits protect `docs/superpowers/snapshots/*.patch` (currently UNTRACKED — the only copy of ~2 weeks of work).

- [ ] Step 1: `cd tadaaaa/surprise-invite && npx tsc --noEmit && npm test 2>&1 | tail -3 && npm run lint 2>&1 | tail -2` — record counts as BASELINE in this file.
- [ ] Step 2: `git add docs/superpowers/ && git commit -m "chore: protect snapshot patches and plans (untracked recovery net)"` — do the same in `mobile/` for `docs/snapshots/`.
- [ ] Step 3: `git tag pre-recovery-2026-08-22` — instant rollback point.
- [ ] Step 4: Verify anon reveal still green: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/surprise/demo` → expect `200` (verified 2026-08-22).

### Task A2: Apply the recovery patch on a branch

- [ ] Step 1: `git checkout -b recovery/launch-bar-six`
- [ ] Step 2: `git apply --exclude='graphify-out/*' --exclude='src/graphify-out/*' --exclude='*.lock' docs/superpowers/snapshots/FINAL-web.patch` (94 src files, 14,263 insertions; contains editorial retheme P0–P3 + `InviteQr.tsx` + parity work; verified NOT to contain `/dashboard/analytics` — that is Task B1's rebuild).
- [ ] Step 3: Run all gates. Expected: green (this tree state was green on 2026-08-13 at 699 vitest).
- [ ] Step 4: `git add -A src docs && git commit -m "feat: recover editorial retheme + P4 partials from FINAL-web snapshot"`

### Task A3: Fix the five reveal bugs the retheme carries (they are why it felt "destroyed")

All five documented with root causes in `tadaaaa/NEXT_SESSION_PROMPT.md`. Test invite: `/surprise/warm-embrace-k69tyvcpua`. Reproduce in browser → fix → screenshot proof. One commit per bug.

- [ ] **Bug A** — restore sequential one-by-one photo reveal with per-photo captions in `src/components/surprise/PolaroidCarousel.tsx` (keep editorial styling, restore pacing; masonry was a mockup-fidelity mistake).
- [ ] **Bug B** — remove `FloatingPhotos` from inside `QuestionScreen.tsx:178` (P3 removed it from MessageReveal/RSVPButton; QuestionScreen was skipped).
- [ ] **Bug C** — creator preview must not record RSVPs/answers: mirror the creator-skip from `src/lib/invite-view.ts:52-58` into `src/app/api/invite/rsvp/route.ts` and the answer route (compare caller to `creator_id`).
- [ ] **Bug D** — strip emoji-as-content: `📡` (QuestionScreen.tsx:42), `😏` (:290), `✅` (ReportButton.tsx:62).
- [ ] **Bug E** — cookie banner must not overlap the reveal at phone width: suppress `CookieConsent` on `/surprise/[slug]` until the reveal's final stage (render after `stage === "cta"`), or dock it collapsed.
- [ ] Final: full reveal walk in browser at 375px + 1280px, screenshots saved to `docs/superpowers/snapshots/A3-reveal-*.png`, commit.

## Phase B — Analytics That Tell the Truth (Day 3–5)

The mockup's "Maya turns thirty" screen shows data the DB has never captured (country, device %, avg time). Rule: **no faked panels** — capture first, then display.

### Task B1: Rebuild `/dashboard/analytics` (lost — in no patch, no commit)

**Files:** Create `src/app/dashboard/analytics/page.tsx`, `src/lib/analytics.ts` + `analytics.test.ts`. Spec survives in memory: stat tiles (views/RSVPs/reactions if wired/avg time once captured), 7-day views bar chart, engagement funnel (opened→scrolled→viewed photos→RSVP'd), per-invite drill-down `?invite=`. Port shape from `mobile/src/lib/analytics.ts` + `mobile/src/components/handoff/AnalyticsPanels.tsx` (exists in mobile tree today). TDD; re-derive the recorded rules: timezone-boundary bucketing, zero-division funnel guards, PostgREST row-cap raised to 10k with visible "capped" note, RLS: server-validated user + explicit `.eq("creator_id")`.

### Task B2: Capture device, country, dwell — additive migration (CONFIRM-GATED)

```sql
-- sql/invite_views_analytics_capture.sql  (additive only, never-drop rule)
alter table invite_views add column if not exists country text;
alter table invite_views add column if not exists device text;
alter table invite_views add column if not exists dwell_ms integer;
```

- [ ] Capture country in `src/lib/invite-view.ts` from `headers().get("x-vercel-ip-country")` (works on Vercel; null locally — display handles null as "Unknown").
- [ ] Derive device server-side from the already-stored user agent: `/(ipad|tablet)/i → tablet`, `/(mobi|iphone|android)/i → mobile`, else `desktop` (pure fn + tests in `src/lib/device.ts`).
- [ ] Dwell: `navigator.sendBeacon("/api/invite/dwell", …)` on `visibilitychange→hidden` from the reveal page (visitor-token-keyed, updates the row's `dwell_ms`, rate-limited).
- [ ] Panels render with honest empty state: "Collecting since <deploy date>" until rows exist. Historical rows: device backfillable from stored user_agent; country/dwell cannot be backfilled — say so in the UI, never estimate.

### Task B3: Export report = real CSV

**Files:** Create `src/app/api/invite/[slug]/report/route.ts` — owner-auth'd, streams CSV (views by day, RSVPs, answers, contributors). The mockup's Export button was a `toast()` stub; ours downloads a file.

### Task B4: Contributors approve/pending on web

Surface `invite_contributions` moderation (mobile's B4 "Needs you" pattern) as the Contributors table with Approve action — table + RLS already live; UI only.

## Phase C — "Pick how it unfolds. Four ways." (Day 6–8)

- [ ] C1: Adopt the mockup copy in `RevealSettings.tsx`: heading **"Pick how it unfolds"**, sub **"Four ways to open a moment. One will fit."**
- [ ] C2: Add **Open-when Letters** as the 4th card on web. DB CHECK already accepts `letters` (live, verified Aug 16). Port `LettersReveal` from `mobile/src/` to `src/components/surprise/LettersReveal.tsx`.
- [ ] C3: **Letters authoring step** (the gap that makes mobile publish EMPTY letters): letters editor (title + body, 2–6 letters) in the wizard when `reveal_type === "letters"`; Zod `.refine` blocks publish with zero letters — schema-level, so it fixes mobile's hole too. Storage: `invites.events` jsonb (exists, live) or additive `invite_letters` table — decide at build with shown SQL.
- [ ] C4: Guard: tap/countdown/scroll_story reveal paths byte-identical before/after (existing pattern from templates P2).

## Phase D — Record a Video Message (Day 9–11) — NET NEW (never existed in app; mockup-only)

Distinct from the existing Remotion invite→film renderer (keep both; rename Remotion button "Turn into a film").

- [ ] D1: `src/components/create/VideoMessageRecorder.tsx` — `MediaRecorder` (webm/mp4 fallback), 60s hard cap with countdown ring, re-record, preview playback. Falls back to file upload where MediaRecorder unavailable (iOS Safari `capture` input).
- [ ] D2: Upload through the existing `pending/` signed-upload → finalize pipeline (same orphan-sweep protection as photos). Additive column: `alter table invites add column if not exists video_message_path text;` (CONFIRM-GATED).
- [ ] D3: Moderation: sample 3 frames server-side at finalize → existing Sightengine image check (video API costs more; frame-sampling limitation documented in code comment + delivery report).
- [ ] D4: Reveal plays the message via existing `VideoPlayer` as a stage before photos. Tier call (recommend): free = 15s, paid = 60s.

## Phase E — Live Preview While Creating (Day 12–13) — NET NEW (mockup-only)

- [ ] E1: `src/components/create/LivePreview.tsx` — phone-framed mini render fed from wizard draft state: occasion eyebrow, title, theme colors, first 3 photos (object URLs), message excerpt, reveal-style chip. Right column at `lg+`; floating "Preview" button opening a sheet below `lg` (mobile-web parity with the same component).
- [ ] E2: No network calls, no signed URLs — local state only; updates as the user types. Reduced-motion honored.

## Phase F — Identity Gate + Ship (Day 14)

- [ ] F1: Match-the-mockup pass, screen-by-screen vs `tadaaaa-editorial.html` at 1280 + 375 — only the 4 sanctioned divergence classes (real backend / real data / accessibility / platform). This is the "doesn't look AI-made" gate; the P1 honest-copy rules stand (no fake testimonials return).
- [ ] F2: Art: generate per `docs/art/style-prompts.md` (user's imagegen or Canva/Figma MCP); drop into template `art` slots (registry field exists, gradient fallback until then).
- [ ] F3: **Ship** — LAUNCH_PLAN.md §5–6 verbatim: buy domain → Vercel connect → env vars (real Stripe/Resend/Sightengine) → preview smoke checklist → merge → prod → §8 tripwires. Support email must match the purchased domain before F1 closes.

## Self-Review Notes (per writing-plans)

- Analytics rebuild (B1) is spec-from-memory, not recovered code — labeled as such; mobile files are the closest living reference.
- D and E are the only fully net-new features; both scoped to smallest honest version (frame-sampled moderation, local-only preview).
- Every migration is additive and confirm-gated, per the standing never-drop rule.
- Out of scope by explicit freeze: reactions UI (table is live; panel appears only if it ships someday), mobile resume, new mockups, marketplace expansion.
