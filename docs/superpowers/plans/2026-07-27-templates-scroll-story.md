# Templates Marketplace + Scroll Story Reveal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each phase's tasks get micro-expanded (failing test → run → implement → run → commit) at execution start by the phase owner.

**Goal:** Ship a `/templates` marketplace and a third reveal style (`scroll_story`) as an additive feature on web (live this week) and mobile (code-complete + device-verified this week; store go-live next week), gated by the existing tier system, all prices USD.

**Architecture:** Template = named preset over existing (theme × occasion × revealType) — a code registry, no new DB table. Scroll story = new client component tree rendered by the existing `/surprise/[slug]` branch when `reveal_type === "scroll_story"` (plain TEXT column, no migration needed for the enum). One additive migration in Phase 3 (`events jsonb`). All personal content flows through the existing InviteData fetch; RSVP/answers/views reuse existing anon-granted RPCs.

**Tech Stack:** Next.js 16 (web, framer-motion + motion.ts tokens), Expo SDK 54 / RN 0.81 / Reanimated 4.1 (mobile), Supabase (shared project `xrlmnlknymgakswsbawk`), Stripe (existing rails), zod v4.

**Locked decisions (user may veto):**
1. RSVP = in-app `record_rsvp` RPC (+ optional WhatsApp deep-link deferred until a sender-phone field exists).
2. Events = `events jsonb` additive migration in Phase 3 (max 4 plaques).
3. Tier: free templates on Free tier (2/mo limit unchanged); premium templates unlock per-surprise $4.99 OR any active subscription (Plus/Unlimited) — reuses `canUsePremiumTheme(tier, isPaid)`, zero new billing code.
4. Music = existing WebAudio-style chime v1 (no assets); MP3 upload post-launch.
5. Art = original AI-generated scene art (aesthetic direction only — NEVER Missing Piece assets; their license prohibits copying/redistribution).

**Standing rules for every phase:**
- PES gates in order: build → lint+typecheck → tests → security pass → runtime verification → adversarial self-review. Evidence required before any "done".
- Conventional commits per task; branch `feat/templates` off `feat/sophistication`.
- Memory update (`~/.claude/projects/.../memory/project_tadaaaa_templates_feature.md`) at the END of every phase — non-optional.
- Skills per phase listed inline; `sp-verification-before-completion` closes every phase.

---

## Phase 0 — Infra Gate (Day 0)

Blockers that make "live this week" possible at all. No feature code.

**Tasks:**
- [ ] 0.1 Unblock GitHub pushes on web repo: remove/park the workflow-file commit OR mint a PAT with `workflow` scope. Verify: `git push origin feat/sophistication` succeeds.
- [ ] 0.2 Supabase: `restore_project` if paused; verify `get_project` → ACTIVE_HEALTHY; confirm keep-alive workflow after 0.1.
- [ ] 0.3 Vercel: connect repo, set env (SUPABASE_*, ANTHROPIC_API_KEY, STRIPE_* — test keys OK until live-key decision, RESEND_*). Deploy preview of current branch. Verify: preview URL renders landing + sign-in works against Supabase.
- [ ] 0.4 Create branch `feat/templates`. Baseline gates: `npx tsc --noEmit` → 0 errors; `npm test` → all pass; record output.
- [ ] 0.5 Memory update: infra state + preview URL.

**Skills:** `setup-deploy`, `ship` (gstack), `sp-verification-before-completion`.
**Exit gate proof:** push output, preview URL, baseline tsc/test logs.

---

## Phase 1 — Web P0: Storefront + Scroll Story engine on demo config (Day 1–2)

No DB changes. No existing-behavior changes except nav links + one query param.

**Files:**
- Create: `src/lib/templates.ts` + `src/lib/templates.test.ts` — registry: `{ id, name, occasionId, themeId, revealType, coverArt, tier: "free"|"premium" }[]`, derived helpers `templatesByOccasion()`, `getTemplate(id)`. 12 entries.
- Create: `src/lib/scroll-story/config.ts` + test — `StoryConfig` type + `demoConfig`; `src/lib/scroll-story/seeded.ts` + test — mulberry32 seeded RNG (seed = slug) for stars/lanterns/confetti positions (SSR-hydration-safe).
- Create: `src/app/templates/page.tsx`, `src/components/templates/{CoverflowFan,FilterChips,TemplateGrid,TemplateCard}.tsx` — port of prototype, framer-motion springs from `motion.ts`, chips filter w/ layout animation, `Load more` pagination, card → `/create?template=<id>`.
- Create: `src/components/surprise/scrollstory/ScrollStoryReveal.tsx` + scene files `{SkyHero,MessageScene,PlanScene,PolaroidScene,RsvpScene,FinaleScene}.tsx` — 6 scenes, seamless gradient contract (scene N first stop === scene N−1 last stop), IntersectionObserver one-shot reveals, reduced-motion → fades only.
- Modify: `src/app/surprise/test/page.tsx` — add "Scroll story" mode rendering `ScrollStoryReveal` with `demoConfig`.
- Modify: `src/app/create/page.tsx` — read `?template=` → preselect theme + occasion + revealType (revealType applied in Phase 2; theme+occasion now).
- Modify: landing `Navbar`/`Footer` — "Templates" link.
- Modify: `src/app/dashboard/page.tsx` (+ dashboard nav component) — "Templates" nav entry + "Start from a template" card linking `/templates` (logged-in entry point; this is where users pick a template then edit recipient name/message in the existing wizard).
- Extract: shared pricing constants → `src/lib/pricing.ts`; `src/app/pricing/page.tsx` and marketplace pricing strip both import it (USD only).

**TDD:** registry shape/filter tests, seeded RNG determinism test (same seed → same layout; SSR/client parity), config adapter defaults, countdown floor at 00.

**Skills:** `sp-test-driven-development`, `karpathy-guidelines`, `impeccable` (craft), `taste-skill`, `frontend-design`, `framer-motion`, `vercel-react-best-practices`, `emil-design-eng` (motion review of fan flip + scene staggers), `web-design-guidelines` (a11y pass).

**Verification (proof required):**
- `npx tsc --noEmit` → 0. `npm test` → green incl. new tests.
- Playwright: `/templates` — fan auto-advances/drags/arrow-keys/dots, chips filter, 320/768/1440 no horizontal scroll, focus rings visible; `/surprise/test` scroll mode — 6 scenes render, no hydration warnings in console, reduced-motion emulation kills floats.
- Lighthouse `/templates`: LCP < 2.5s, CLS < 0.1, a11y ≥ 95.
- [ ] Memory update + commit trail.

---

## Phase 2 — Web P1: Real invites end-to-end (Day 2–3)

**Files:**
- Modify: `src/lib/schemas.ts:28` → `revealType: z.enum(["tap","countdown","scroll_story"])`.
- Modify: `src/components/create/RevealSettings.tsx` → third card (Moon icon, "Scroll Story", NEW pill); countdown-date input shown for `countdown` AND `scroll_story` (label: "The big day — powers the finale countdown").
- Modify: `src/app/create/page.tsx` — validation branch (scroll_story requires countdownDate ≥ +5min, same rule as countdown); `?template=` now also sets revealType; premium template → existing `onPremiumClick()` Stripe rail.
- Create: `src/lib/scroll-story/from-invite.ts` + test — adapter `inviteToStoryConfig(invite, photos, contributions, occasionLabel, senderName)`; sender name from creator profile (add `full_name` to the existing `getInviteBySlug` select — query change, not schema).
- Modify: `src/app/surprise/[slug]/page.tsx:139-164` — third branch → `<ScrollStoryReveal config={inviteToStoryConfig(...)} inviteId slug tier={...} />`.
- Modify: `RsvpScene` — wire existing `/api/invite/rsvp` flow (visitor token, 3x retry, confetti via `ConfettiCanvas`); optional `QuestionScene` insert (reuse `/api/invite/answer`) when questions exist.
- Create: `src/components/surprise/scrollstory/MadeWithPill.tsx` — rendered when `!is_paid && tier === "free"`; links `/templates`.
- OG image: extend `opengraph-image.tsx` variant for scroll_story (dusk gradient).

**Security (blocking):** all StoryConfig strings rendered via JSX (no dangerouslySetInnerHTML anywhere in new tree); maps links `encodeURIComponent`; `?template=` validated against registry whitelist (unknown id → ignored); no new endpoints (reuse rate-limited existing).

**Skills:** `sp-test-driven-development`, `backend-dev`, `security-review` + `security-reviewer` agent (diff scope), `code-reviewer` agent, `sp-requesting-code-review`, `sp-verification-before-completion`.

**Verification (proof required):**
- tsc 0, tests green (adapter unit tests: empty photos, no questions, past countdown → 00 floor, missing sender name fallback).
- Playwright E2E with test account (`tada.tester@example.com`): create scroll-story invite via wizard → publish → open `/surprise/<slug>` logged-out → scroll all scenes → tap RSVP → assert RSVP row visible in creator dashboard. Screenshots each scene.
- Regression: existing tap + countdown invites still render (test route + one real).
- [ ] Memory update.

---

## Phase 3 — Web P2: Events migration + wizard editor + original art (Day 3–4)

**DB (CONFIRM WITH USER before apply, then Supabase MCP `apply_migration`, then `get_advisors`):**
- Create: `sql/scroll_story_events.sql`:
```sql
alter table public.invites
  add column if not exists events jsonb not null default '[]'::jsonb;
comment on column public.invites.events is
  'Scroll-story plaques: [{label,title,detail,maps_query}] max 4, validated app-side';
```
- Modify: `src/lib/schemas.ts` — `eventsSchema`: array max 4 of `{ label: z.string().max(30), title: z.string().max(80), detail: z.string().max(120), mapsQuery: z.string().max(120).optional() }`; server action writes column; RLS unchanged (column rides existing invites policies).

**Files:**
- Create: `src/components/create/EventsEditor.tsx` — optional step-2 section, add/remove plaque rows, only when revealType === scroll_story.
- Modify: `PlanScene` — renders `events` when present, else single "When" plaque from countdown_date.
- Art track (parallel) — **full art PACKS, not just covers**. Per premium template, generate ORIGINAL layered assets in the target genre (painterly Indian-miniature / paper-cut arch / botanical damask — genre is free to use; never Missing Piece's actual assets):
  - `cover.webp` (3:4, marketplace card + fan)
  - `hero-bg.webp` (1920w dusk/scene backdrop for SkyHero)
  - `frame.png` (transparent arch/botanical frame for event plaques + polaroids)
  - `texture.webp` (tileable damask/velvet for scene backgrounds)
  - Pipeline: `imagegen-frontend-web` / `nano-banana-edit` generate → `image-enhancer` upscale/clean → cwebp compress (≤80KB cover/texture, ≤180KB hero) → `public/templates/<id>/`.
  - Create: `docs/art/style-prompts.md` — reusable style-prompt kit per pack (palette, motif vocabulary, "flat illustration, no text, no watermark") so future packs stay consistent.
  - Modify: `src/lib/templates.ts` registry gains `art: { cover: string; heroBg?: string; frame?: string; texture?: string }`; scene components accept art layers with CSS-gradient fallback when absent (free templates keep gradient art).

**Skills:** `database-reviewer`, `security-review` (jsonb caps + URL encoding), `imagegen-frontend-web` / `nano-banana-edit`, `image-enhancer`, `impeccable` (polish), `/code-review`.

**Verification (proof):** migration applied + advisors output clean; zod rejects >4 events / oversize strings (tests); E2E re-run with events; visual pass 320→1440; Lighthouse re-run with real images (LCP still < 2.5s — lazy below fold).
- [ ] Memory update.

---

## Phase 4 — Hardening + WEB LAUNCH (Day 4–5)

- [ ] 4.1 Full QA: `webapp-testing` + `e2e-runner` agent — Chrome/Firefox/Safari, 320/375/768/1024/1440/1920, keyboard-only pass, reduced-motion pass, dark OG cards.
- [ ] 4.2 Security: `claude-code-security-review` checklist on full branch diff (no secrets, inputs zod-validated, XSS, rate limits, CSP unchanged, error hygiene). `security-reviewer` agent. Block on CRITICAL.
- [ ] 4.3 `/code-review` comprehensive + `simplify` pass; fix CRITICAL/HIGH.
- [ ] 4.4 Merge `feat/templates` → `feat/sophistication`, push, Vercel production deploy + domain. Stripe live-key decision (test mode = disclosed gap if not ready).
- [ ] 4.5 Prod smoke: E2E suite against prod URL; Lighthouse prod.
- [ ] 4.6 Delivery report v1 (with Known Gaps & Risks) + memory update + `headroom learn`.

**Skills:** `webapp-testing`, `security-review`, `code-review`, `simplify`, `ship`/`land-and-deploy`, `sp-verification-before-completion`.
**Exit gate proof:** prod URL, green E2E log vs prod, Lighthouse report, security findings table.

---

## Phase 5 — Mobile P3: code-complete + device-verified (Day 5–6)

**Files (mobile repo, branch `feat/templates`):**
- Create: `src/app/templates.tsx` + `src/components/templates/{FeaturedStrip,TemplateGridCard,ChipRow}.tsx` — pushed from Home ("Start from a template" section card); snap carousel (NOT coverflow) + 2-col grid; reuses `themes.ts` + new `src/lib/templates.ts` (port of web registry).
- Modify: create wizard `RevealSettings` equivalent — third vertical card + big-day field.
- Create: `src/components/reveal/scrollstory/*` — 6 scenes, Reanimated scroll-driven interpolation, haptics per scene entry, `AccessibilityInfo` reduced-motion → fades.
- Modify: `src/app/surprise/[slug].tsx` — branch on `reveal_type === "scroll_story"` (currently ignores the field — this also un-deadens `countdown_date` there for the finale).
- Watermark pill → deep-link to create flow.

**Skills:** `expo-react-native-expert` agent, `context7` (Reanimated 4 scroll APIs before writing), `sp-test-driven-development` (jest 29, `--legacy-peer-deps`, `/// <reference types="jest" />`), `emil-design-eng` review.

**Verification (proof):** `npx tsc --noEmit` 0; `npx jest` full suite green (25 existing + new); `npx expo export --platform ios` bundles; Expo Go device smoke on LAN (backend `next dev -H 0.0.0.0`, Metro `--lan`, IP 192.168.254.23) — screenshots of all 6 scenes + RSVP recorded in web dashboard; reduced-motion device check.
- [ ] 5.x EAS build kicked off + store metadata drafted. **Store submission/review = next week (disclosed — not hidden).**
- [ ] Memory update.

---

## Phase 6 — Close-out (Day 6)

- [ ] Final PES delivery report across both repos: every gate's evidence, Known Gaps & Risks (mandatory).
- [ ] `codeburn` session stats; `headroom learn`; final memory update; retro notes.

## Known launch dependencies OUTSIDE this feature
Vercel/domain (0.3), Stripe live keys, Resend prod, GitHub push scope (0.1), Supabase free-tier pause behavior (keep-alive), app-store timelines (mobile).
