# App Coherence Overhaul — 16-Point Audit Fix Plan (Web + Mobile)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (or gsd-execute-phase once `.planning/` is initialized — ROADMAP.md mirrors these phases). ALL development in **caveman mode**. NO commits without the user's explicit go (standing hold). NO DB migrations without showing SQL + explicit yes (one exception already burned).

**Goal:** Close every finding from the 2026-08-02 full-app audit so TaDaaaa reads as one coherent product — one chrome, one promise, one price moment, living stats, catalog depth — working end-to-end on web AND mobile.

**Architecture:** Web = Next.js 16 (`surprise-invite`, branch `feat/templates`, large uncommitted tree). Mobile = Expo SDK 54 (`mobile`, branch `main`, uncommitted). Shared Supabase `xrlmnlknymgakswsbawk`. All phases additive; the only schema-touching phase (W5 push notifications) is confirm-gated.

**Model policy (user-mandated):** Complex/product-logic phases → **Opus 4.8**. Config/integration/click-audit phases → **Sonnet 5**. Every dev agent runs caveman mode. Verification/review agents → Fable (session model).

**Standing gates every phase:** PES order (build → tsc/eslint → tests → security → runtime → adversarial review) · evidence before "done" · memory update at phase close (non-optional) · mobile parity in the same phase, not deferred.

---

## Audit-point → phase coverage matrix (all 16, no orphans)

| # | Finding | Phase |
|---|---|---|
| 1 | Navigation breaks (chrome flips, wizard dead-end, test-page demo) | W0, W3 |
| 2 | Repetition (pricing ×3, occasion ×2, theme ×2, templates self-link) | W0, W1 |
| 3 | CEO reference gaps (identity, template-is-product, named guests, art) | W0–W4 |
| 4 | Routing pattern (marketing vs product chrome separation) | W0 |
| 5 | Unverified/dead buttons (Google, magic link, gift, palette, art dl) | W5 |
| 6 | Feature gaps (email verify, push, OAuth config) | W5 |
| 7a | Pricing panel shown to signed-in users on /templates | W0 |
| 7b | Wizard re-asks occasion+theme after template pick | W1 |
| 7c | Two colliding price surfaces ($4.99 theme chips mid-wizard) | W1 |
| 8 | No identity chrome on /create (Meta rule) | W0 |
| 9 | Stats look dead — no drilldown, anonymous guests | W2 |
| 10 | Evite catalog anatomy (filters, badges, taxonomy) | W3 |
| 11 | "Pet project" look — placeholder art, inconsistency | W3 (slots), W4 (art+polish) |
| 12 | App nav structure (authed menu) | W0 |
| 13 | Templates self-link, no active state | W0 |
| 14 | Creator preview counting | ✅ verified already correct (invite-view.ts skips creator) — no work; regression test added in W2 |
| 15 | Full re-check sweep | W6 |
| 16 | My additions: curated demo, occasion curation, RSVP name, wizard back affordance, mobile parity, pre-existing TODOs | W2, W3, W5 |

---

## Phase W0 — One Chrome (identity everywhere) · **Opus 4.8 · caveman**

**Goal:** Signed-in user sees the same authed bar (avatar, greeting, nav with active states) on every product page; marketing chrome only for visitors. Points 1,2,4,7a,8,12,13.

**Web tasks:**
- Extract authed chrome into a shared server wrapper: promote `DashboardNavServer` usage via a route-group layout `src/app/(app)/layout.tsx` OR per-page mounts (decide at execution: route-group move relocates `dashboard/ create/ settings/ pricing/ templates/` folders — planner evaluates git-churn vs per-page mounts; per-page mounts acceptable v1).
- `dashboard/Navbar.tsx`: add nav cluster **Dashboard · Templates · Create** with active-state (current page = highlighted, non-link) — kills #13; accept `activeRoute` prop.
- `/create`: mount authed bar above the step indicator (keep "Step x of 4"); add explicit "← Dashboard" affordance (#16 back).
- `/pricing`, `/settings`: swap hand-rolled headers for the shared bar when signed in.
- `/templates` authed view: HIDE pricing panel + how-it-works sections (`authedChrome` prop already exists — extend to gate those sections) (#7a).
- Footer: authed product pages get slim footer or none (marketing footer only for visitors).
- **Mobile:** already tab-bar-correct; verify create modal ✕ header shows nothing misleading; add active-state parity check only.

**Skills:** sp-writing-plans (micro-expand), sp-test-driven-development, karpathy-guidelines, impeccable (audit → shape), frontend-design, hallmark (chrome audit), sp-verification-before-completion.
**Verify:** tsc 0 · vitest green · Playwright: signed-in walk `/dashboard→templates→create→pricing→settings` asserts avatar present + active nav on each; signed-out walk asserts marketing chrome; screenshots. Mobile: tsc/jest/export.
**Exit:** evidence pack + memory update.

## Phase W1 — Template Is The Product (wizard collapse + one price) · **Opus 4.8 · caveman**

**Goal:** Picking a template never re-asks; price exists in exactly two places: badge on card, gate at Publish. Points 7b, 7c, 2.

**Web tasks:**
- `create/page.tsx`: template mode — when `?template=` valid, step 1 renders a **TemplateSummaryChip** ("🎂 Cake O'Clock — Birthday · Golden Hour · Countdown · change?") instead of occasion+theme grids; "change" expands the grids (escape hatch). Wizard becomes effectively 3 steps in template mode.
- `ThemeSelector`: remove `$4.99` chips/`Unlock` from mid-wizard (premium themes show lock badge only); per-theme Stripe purchase moves to the Publish gate.
- `PreviewPublish`: single price moment — if selected template/theme is premium and user lacks entitlement (`canUsePremiumTheme`), show one gate card: "Premium surprise — $4.99, or included with Unlimited" → existing Stripe checkout rail (mode plus w/ themeId) → returns to publish. NO other price UI anywhere in wizard.
- `templates.ts`: template card badge stays (Free/Premium) — already done.
- **Mobile:** same collapse in `create/index.tsx` + `RevealSettings`/theme step (chip + change), price gate at mobile publish via existing tier check; strip any mid-flow price chips.

**Skills:** sp-test-driven-development (gate logic unit-tested), backend-dev (checkout return→publish resume), impeccable (craft the chip + gate card), taste-skill (anti-slop copy), security-review (entitlement check server-side at finalize — verify `is_paid` enforcement unchanged), context7 (Stripe return-flow if touched).
**Verify:** unit: entitlement matrix (free user+free tpl / free+premium / plus / unlimited / session-unlocked). Playwright: free template E2E unchanged; premium template E2E hits gate at publish (Stripe test-mode redirect asserted, not completed). Regression: non-template wizard entry unchanged. Mobile jest + export + template-param flow.
**Exit:** evidence + memory.

## Phase W2 — Living Stats & Named Guests (engagement loop) · **Opus 4.8 · caveman**

**Goal:** Stats answer "who"; guests have names. Points 9, 3, 16, +regression test for 14.

**Web tasks:**
- RSVP name capture: `RsvpScene` (scroll story) gains optional name field before "Count me in" (RSVPButton modal already captures name — reuse pattern/`rsvp-client`); prompt copy "Who's saying yes?" — skippable.
- Dashboard stat tiles → clickable: aggregate tiles open an **Activity view** (`/dashboard/activity` or slide-over) — unified feed from `invite_views`(anon) + `invite_rsvps`(named) + `invite_answers` newest-first, grouped per invite, powered by one server query (no schema change — all tables exist).
- Surface `ResponsesModal` better: "See responses" primary affordance on each invite card.
- Regression test: creator-view skip (point 14) — unit/integration test around `logInviteViewBySlug` creator branch.
- **Mobile:** Activity tab renders the same feed (query via db.ts, RLS: creator-only read policies exist? verify invite_views/rsvps select policies for creator — if service-role-only, add BFF endpoint `/api/mobile/activity` bearer-authed additive route instead; NO RLS changes without confirm).
- Scroll-story RSVP on mobile: add same name field.

**Skills:** sp-test-driven-development, backend-dev, database-reviewer (feed query + policy check — read-only inspection first), security-review (feed exposes only creator's own data; name sanitized length-capped), impeccable (feed UI), sp-verification-before-completion.
**Verify:** E2E: RSVP with name → appears named in activity + ResponsesModal; anonymous path still works. Feed pagination cap (50). Creator-view regression test green. Mobile feed renders (BFF or direct per policy finding).
**Exit:** evidence + memory. **Gate:** if RLS change needed → show SQL, wait for yes.

## Phase W3 — Catalog Depth & Honest Demo · **Sonnet 5 · caveman**

**Goal:** Evite-grade browsing structure + customer-grade demo. Points 10, 1(demo), 11(slots), 13-leftover, 16(curation).

**Web tasks:**
- Template metadata: registry gains `styleTags: string[]`, `paletteTag` (typed, additive).
- Filter rail on /templates: occasion (exists) + **Price (Free/Premium)** + style tags; counts shown ("12 results"); sort optional-defer.
- Curated demo: seed ONE production-grade demo invite (real copy, art-ready photos, events, future countdown, `is_active`, excluded from stats via creator-skip) under a reserved slug `demo`; swap all "Watch a live reveal" links (landing hero, templates hero) from `/surprise/test` → `/surprise/demo`. `/surprise/test` stays but noindex + not linked.
- Occasion curation: fix `golden-hour` template → birthday occasion (registry edit + test update); sweep all 12 for occasion sanity.
- Art slots: confirm `art.cover` renders in fan + cards when present (built in P3) — wire one sample pack if user supplies art, else gradient fallback ships.
- **Mobile:** filter chips gain Free/Premium; registry port stays 1:1 (copy metadata); demo link parity (mobile marketing surfaces if any).

**Skills:** sp-test-driven-development (registry/filter tests), impeccable + taste-skill (filter rail + demo copy), hallmark (demo invite content quality — anti-slop), frontend-design, sp-verification-before-completion.
**Verify:** filter combinations unit-tested; Playwright: filters narrow grid + counts correct; `/surprise/demo` renders full scroll story signed-out; no link to `/surprise/test` remains (grep). Mobile jest/export + filter smoke.
**Exit:** evidence + memory. **Note:** demo invite insert = data row (not schema) on shared DB — shown to user in report, trivially deletable.

## Phase W4 — Art & Elegance Pass · **Sonnet 5 · caveman** (+ user's imagegen)

**Goal:** Kill the "pet project" look. Point 11.

**Tasks:**
- Generate art packs per `docs/art/style-prompts.md` (USER runs imagegen or approves my driving whatever tool is available; commissioned art later swaps in with zero code) → `public/templates/<id>/` → registry `art` fields for the 4 scroll_story templates first.
- `impeccable polish` sweep: spacing/typography/shadow consistency across dashboard, templates, wizard, settings (web) — 46-detector run, fix HIGHs.
- `taste-skill` anti-slop pass on all user-facing copy (empty states, toasts, gate card).
- Motion review (`emil-design-eng`): fan, chip transitions, activity feed entrances; reduced-motion re-check.
- Lighthouse re-run with real images (budgets from style-prompts.md; LCP must not regress past baseline).
- **Mobile:** same art assets bundled (expo-image), polish pass on templates screen + wizard.

**Skills:** imagegen-frontend-web / image-enhancer (art track), impeccable (polish), taste-skill, emil-design-eng, hallmark (final slop-test), benchmark (gstack Lighthouse), sp-verification-before-completion.
**Verify:** Lighthouse ≥ current (perf ≥0.84, a11y ≥0.96); visual screenshot set 375/768/1440 attached; asset weights within budget.
**Exit:** evidence + memory. **Dependency:** art generation capability — if unavailable, phase ships polish-only and art lands when user provides assets (disclosed, not silent).

## Phase W5 — Feature-Complete Hardening · **Sonnet 5 · caveman**

**Goal:** Every button works or is removed. Points 5, 6, 16(TODOs).

**Tasks:**
- Google OAuth: USER adds redirect URLs in Supabase (`tadaaaa://`, `exp://<LAN_IP>:8081`, prod domain) — I verify flow end-to-end after.
- Click-audit closure: magic link, forgot/reset password, gift purchase+redeem, command palette, DesignerArtButton (art/story/collage downloads), contribute flow — each: works | fixed | removed. Playwright per flow.
- Email verification hardening: enable Supabase confirm + `/auth/verify-email` handler check + disposable-domain block at signup (zod list) — config portion = USER toggle in Supabase dashboard, code portion mine.
- Push notifications (mobile): `push_tokens` migration — **SQL shown, explicit confirm required** — expo-notifications register + notify-on-RSVP edge (defer server sender to post-launch if scope blows: disclosed decision at execution).
- Stripe: full checkout E2E in test mode (theme gate from W1 + unlimited sub + gift) — click-through verified.
- `next` patch bump + full suite re-run (pre-deploy security advisory).

**Skills:** sp-systematic-debugging (any broken flow), webapp-testing + playwright, backend-dev, security-review + claude-code-security-review (auth surfaces), context7 (expo-notifications, Supabase email config), sp-verification-before-completion.
**Verify:** flow matrix table all-green (or removed-with-reason); mobile gates; migration applied only post-confirm.
**Exit:** evidence + memory.

## Phase W6 — Final Sweep & Ship-Ready · **Fable verification · caveman for fixes**

**Goal:** Point 15 — nothing missed; production-grade close.

**Tasks:** full nav re-walk both platforms (every link/button, signed in+out) · full E2E matrix (3 reveal styles × create/publish/reveal/RSVP × web+mobile-web) · Lighthouse + a11y keyboard pass · cross-browser (Chrome/Safari/Firefox) · final adversarial review (code-reviewer + security-reviewer, whole diff) · `/code-review` comprehensive · delivery report with Known Gaps & Risks · memory + diary updates · THEN user: test → commit go (conventional commits staged per phase) → deploy go (Vercel + env + domain; EAS submit mobile).

**Skills:** qa (gstack), webapp-testing, e2e-runner, code-review, security-review-action, simplify, sp-requesting-code-review, sp-finishing-a-development-branch, session-report, codeburn, headroom learn.

---

## Execution order & parallelism

W0 → W1 → (W2 ∥ W3) → W4 → W5 → W6. W2/W3 touch disjoint files (dashboard/activity vs templates/registry) — safe wave. Mobile parity lands inside each phase, same agent or paired agent, never deferred.

## Hard rules carried from user
- Caveman mode for all dev agents. Opus 4.8 heavy phases (W0-W2), Sonnet 5 lighter (W3-W5). Fable verifies.
- No commits until user go. No migrations without shown-SQL + yes (W2 RLS-if-needed, W5 push_tokens).
- Backend-to-frontend working, not UI paint. Web AND mobile every phase.
- Memory update closes every phase.

## Known Gaps & Risks (pre-declared)
1. Art generation depends on user-side imagegen capability (W4 fallback: polish-only).
2. Google OAuth + email-confirm need user actions in Supabase dashboard (W5).
3. Push notification server-side sender may defer post-launch (disclosed at W5 execution).
4. Route-group layout move (W0) may produce large-but-mechanical git diff — decision recorded at execution.
5. GSD orchestrator not fully bootstrapped — this plan mirrors GSD PLAN.md structure; `.planning/ROADMAP.md` written so `gsd-execute-phase` can adopt it later.
