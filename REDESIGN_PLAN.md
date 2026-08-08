# TaDaaaa — Mockup Match Redesign Plan

**Source of truth (visual/motion):** `/Users/rohit/Downloads/tadaaaa-app-animated_1.html` (1036-line single-file prototype)
**Source spec (intent/scope):** `/Users/rohit/Downloads/tadaa-claude-code-prompt.md` (detailed build brief — fonts, tokens, motion list, screens, data model, acceptance bar, build order, hard rules)
**Goal:** Make the live Next.js app pixel-match the mockup — same layout, type, motion, reveal — WITHOUT touching the working backend.
**Date:** 2026-06-27

---

## 0. The One Non-Negotiable Rule

The mockup is a **frontend-only prototype** with fake in-memory state (`var state = {...}`, `defaultPhotos`, fake router `go()`). The real app has live Supabase auth, Stripe checkout, signed photo uploads, AI drafter, cron, RLS, moderation.

**We re-skin the presentational layer. We DO NOT rewrite server actions, API routes, data contracts, or auth.** Every screen keeps its existing data wiring; only the markup, CSS, and motion change to match the mockup. Any agent that proposes changing a server action, DB query, or API shape to "match the mockup" is wrong — the mockup's fake state is not a spec for the backend.

### 0a. Stack-conflict resolution (build brief vs reality)

The build brief (`tadaa-claude-code-prompt.md`) specifies **Vite + React + plain CSS** and a **from-scratch** build. The real app is already **Next.js 16 (App Router) + Tailwind v4 + Supabase**, fully wired, security-hardened, 301 tests green. **We do NOT migrate to Vite. We do NOT rewrite from scratch.** The brief is authoritative for *design, motion, screens, brand tokens, and acceptance bar* — NOT for framework choice. Reconciliation:

| Brief says | We do |
|---|---|
| Vite + React + TS | **Keep Next.js 16** (backend wiring lives here; Vite would nuke it) |
| Plain CSS custom properties | **Keep Tailwind v4 `@theme inline` + CSS vars** — tokens already ported verbatim in `globals.css` |
| Hand-written CSS keyframes + canvas confetti, no heavy anim lib | **Honor it** — port keyframes/canvas as-is; framer-motion (already a dep) only for page/route transitions + dodging-button gesture |
| Routes `/signin` `/create` `/dashboard` `/r/:slug` `/pricing` | **Keep existing routes** (reveal is `/surprise/[slug]`, not `/r/:slug`) — do NOT rename, links/QRs/emails already point at them |
| Supabase schema (surprises/photos/contributions/responses/events) | **Already exists** as `invite_*` tables — guard, do not recreate |
| Plan limits, RLS, signed URLs, expiry | **Already enforced server-side** — guard, do not duplicate in UI |

**Net:** the brief raises the *fidelity bar* (exact keyframe names, 10-beat reveal, ribbons everywhere, celebration pop on every primary btn, reduced-motion, Lighthouse ≥90). It does not change the re-skin-only rule.

---

## 1. Gap Analysis (mockup vs current app)

| Area | Current app | Mockup | Action |
|---|---|---|---|
| Brand palette | cream/rose/gold/charcoal (identical hex) | same | **Keep** — already matches |
| Heading font | Playfair Display | **Bricolage Grotesque** | **Swap** — biggest visible gap |
| Body font | DM Sans | DM Sans | Keep |
| Hand font | Caveat | Caveat | Keep |
| Buttons | shadcn variants | pill `border-radius:30px`, gradient + rose-glow shadow, lift-on-hover | Restyle |
| Hero | text + existing art | text + **3 animated SVG cartoon cards** (birthday/mom/anniversary) floating | Build new |
| Confetti | canvas-confetti pkg | hand-rolled canvas burst engine + ambient falling ribbons | Match behavior, reuse pkg where equivalent |
| Reveal | TapToReveal + carousel | **curtain open → locked gift stack → tap → polaroid cascade → typed message → contributor note → dodging No → celebrate** | Rebuild to mockup choreography |
| Dodging "No" | — | runaway button on hover/touch | Build new |
| Toast | sonner | custom pill toast | Keep sonner, style to match |
| Screens present | all routes exist | all screens exist | 1:1 mapping, re-skin each |

**Conclusion:** ~80% is restyle + motion choreography. ~20% is net-new (SVG cartoons, curtain, dodging button). Zero backend work.

---

## 1a. Exact Motion Inventory (from brief §3–§6 — port verbatim, no degrade)

**Hard rule (brief §11):** do NOT degrade or simplify any prototype animation. If one must change, flag it. Every item below must also gracefully disable under `prefers-reduced-motion`.

**Brand tokens to confirm in `globals.css` (brief §3):**
- `--r:16px; --r-lg:24px; --r-xl:32px`
- `--sh:0 8px 30px rgba(45,41,38,.08); --sh-lg:0 24px 60px rgba(45,41,38,.16)`
- `--grad:linear-gradient(135deg,#C4686D,#9B3D42)`, `--grad-gold:linear-gradient(135deg,#E8D5A8,#C9A96E)`
- Headings: `font-weight:800; letter-spacing:-.02em; line-height:1.02`

**4 signature motions (present app-wide unless noted):**
1. **Ambient falling ribbons** — fixed full-screen layer, ~26 small rose/gold rectangles drifting + rotating. On EVERY screen. → `src/components/fx/Ribbons.tsx`.
2. **Celebration pop on primary buttons** — every `.btn-pri` click fires upward confetti + emoji (🎉✨🎊🥳) from click point. → `src/components/fx/ConfettiCanvas.tsx` + shared button handler.
3. **3 animated SVG hero cards** (§4) — reusable `<OccasionCard>`, SVG scene as child, slot for future `<lottie-player>` (add code comment). Named keyframes to port: `floaty`, `sway-body`, `wave-arm`, `offer-arm`, `flame-flick`, `blink`, `pop-heart`, `clink`, `clink2`, `confetti-fall`. Cards bob at staggered delays, rotations −6° / +3° / +7°.
   - 🎂 Birthday: party-hat kid arms-up, cake w/ flickering candle, falling confetti, blink. Caption "happy birthday!"
   - 💐 Mother's Day: child offering bouquet (arm extends/retracts), hearts pop+float, blink. Caption "love you, mom".
   - 🥂 Anniversary: couple clinking glasses (tilt loop), heart rising. Caption "5 years 🥂".
4. **The Reveal sequence (10 beats, §6)** — driven by REAL DB data:
   1. Curtain opens — two panels slide apart, 1.4s, `cubic-bezier(.77,0,.18,1)`.
   2. Locked scene — blurred photos + "someone made you something…" (Caveat) + bobbing "Tap to reveal 🎁".
   3. Tap → confetti burst, locked fades, open scene appears.
   4. Photos cascade as polaroids, staggered ~260ms, alternating rotations, `cubic-bezier(.2,1.2,.3,1)`.
   5. Title appears.
   6. Message types out letter-by-letter, blinking cursor.
   7. Contributor note slides in (if contributions enabled).
   8. Question rises — title + Yes + No.
   9. Dodging No — jumps to random in-bounds position on hover/tap/click (if enabled). Bounds keep it inside container.
   10. Yes → full-screen celebration overlay, big pulsing heart + multi-burst confetti finale.
   - Include **"replay reveal"** control. Reduced-motion: instant, no typing, no dodge.

---

## 2. Skill Assignment — Per Feature (no deviations)

Per CLAUDE.md auto-routing. Each feature lists the skills to fire IN ORDER before writing code.

### Phase 0 — Design Foundation
**Feature:** Design tokens + font swap (Playfair → Bricolage Grotesque), port mockup CSS atoms, reduced-motion guard.
- `extract-design` — lock exact tokens/values from the mockup HTML
- `design-system` — token architecture: primitive → semantic → component CSS vars in `globals.css`
- `ui-ux-pro-max` — palette/type-pairing validation, ensure Bricolage+DM Sans+Caveat pairing is sound
- Files: `src/app/layout.tsx` (font import), `src/app/globals.css` (atoms: `.btn`, `.chip`, `.card`, `.input`, `.polaroid`, scene gradients, shadows)

### Phase 1 — Shared Primitives
**Feature:** Pill buttons, chips, cards, inputs, polaroid, confetti engine, ambient ribbons, toast.
- `frontend-design` — component implementation
- `impeccable` (`craft`) — build atoms to spec; 8-state coverage
- `emil-design-eng` — button feedback: hover lift, active press, easing/durations match mockup (`.18s`, `translateY(-2px)`)
- `mcp__magic__21st_magic_component_builder` — accelerate any net-new atom
- Files: `src/components/ui/*` (button, chip/badge, card, input), new `src/components/fx/ConfettiCanvas.tsx`, `src/components/fx/Ribbons.tsx`

### Phase 2 — Landing
**Feature:** App bar, hero with 3 animated SVG cartoon cards, how-it-works, testimonial, final CTA, footer.
- `redesign-skill` — audit current landing first, diagnose deltas
- `taste-skill` + `hallmark` — anti-slop pass, premium non-templated feel
- `impeccable` (`craft` → `polish`) — layout + final pass
- `emil-design-eng` + `framer-motion` — SVG cartoon micro-motion (sway/wave/blink/flame/heart-pop/clink/confetti-fall), floaty card bob
- `vercel-react-best-practices` — keep landing a Server Component where possible; isolate motion to client islands
- Files: `src/components/landing/*` (Hero, HowItWorks, Testimonials, Footer, Navbar), new `src/components/landing/OccasionCartoons.tsx`

### Phase 3 — Auth / Sign In
**Feature:** Split-card sign-in (charcoal panel + form), Google/Apple buttons.
- `frontend-design` + `ui-ux-pro-max` — split-card layout
- `backend-dev` — **guard only**: verify the real Supabase auth action stays wired; do not replace the fake `data-go="dashboard"` with anything that bypasses auth
- Files: `src/components/auth/AuthForm.tsx`, `src/components/auth/PerksList.tsx`, `src/app/auth/signin/page.tsx`

### Phase 4 — Create Wizard (4 steps)
**Feature:** Step bar, occasion+theme picker, photos+message, question builder, publish preview.
- `frontend-design` + `ui-ux-pro-max` — wizard layout, step indicator
- `impeccable` (`craft`) — occasion/theme cards, dropzone, radio rows
- `emil-design-eng` — AI-draft pending state (Sparkles rotate+scale, not Loader2), thumb add/remove transitions
- `backend-dev` — **guard**: keep real signed-URL photo upload + AI drafter API; theme paywall must call real tier gate, not the mockup's fake toast
- Files: `src/components/create/*` (StepIndicator, OccasionSelector, ThemeSelector, PhotoUploader, MessageEditor, QuestionBuilder, RevealSettings, AIDraftButton, PreviewPublish)

### Phase 5 — Dashboard
**Feature:** Free-limit banner, welcome, 5 stat cards, occasion filter chips, invite grid.
- `frontend-design` + `ui-ux-pro-max` — stats + grid layout
- `impeccable` (`polish`) — card hover, cover scene gradients
- `backend-dev` — **guard**: stats/invites come from real queries; preserve.
- Files: `src/components/dashboard/*` (FreeLimitBanner, InviteCard, InviteList, OccasionFilter, Navbar)

### Phase 6 — THE REVEAL (the star — most effort)
**Feature:** Curtain open, locked gift-stack scene, tap-to-reveal, polaroid cascade, typed message, contributor note, dodging "No" button, celebrate overlay, confetti bursts.
- `impeccable` (`animate`) — choreograph the full reveal timeline
- `emil-design-eng` — easing/spring feel for every beat (curtain `cubic-bezier(.77,0,.18,1)`, polaroid `cubic-bezier(.2,1.2,.3,1)`, heart beat)
- `framer-motion` — orchestrate sequence + dodging button gesture (already a dep, v12)
- `hallmark` — ensure the emotional payoff reads premium, not gimmicky
- `webapp-testing` — verify timeline + reduced-motion fallback in browser
- `backend-dev` — **guard**: real RSVP/answer/view/report routes stay wired; "Yes" must persist via the real RSVP action, not just fire confetti
- Files: `src/components/surprise/*` (TapToReveal, PolaroidCarousel/PhotoCarousel, MessageReveal, QuestionScreen, CelebrationOverlay, RSVPButton, ReportButton), new `src/components/surprise/Curtain.tsx`, `src/app/surprise/[slug]/page.tsx`

### Phase 7 — Pricing
**Feature:** 4-plan grid (Free / Plus / Unlimited / Gift), "Most popular" flag.
- `frontend-design` + `brand-guidelines` — plan card layout, honest pricing voice
- `backend-dev` — **guard**: CTAs route to real Stripe checkout / create flow, not fake `go('create')`
- Files: `src/components/pricing/*` (PricingTiers, PricingCTA, GiftCTA)

### Phase 8 — QA, Review, Ship
- `agent-browser-core` + `webapp-testing` — full-flow browser test every screen at mobile + desktop breakpoints; verify motion + reduced-motion
- `ui-ux-tester` + `accessibility-tester` — a11y: focus-visible rings, ARIA on SVG, keyboard nav, contrast
- `review` + `simplify` — code quality, dedupe, remove dead mockup-isms
- `security-review` — confirm no backend contract weakened during re-skin (esp. auth bypass, tier gate, upload path)
- `caveman-commit` — terse commits per phase
- `verification-before-completion` — final gate before claiming done
- `context-save` + memory — persist redesign decisions

---

## 3. Execution Strategy

**Process skills:** `writing-plans` → `executing-plans` → `subagent-driven-development` / `dispatching-parallel-agents`.

- **Sequential gate:** Phase 0 + Phase 1 first (foundation). Everything depends on tokens + atoms.
- **Parallel after foundation:** Phases 2–7 are independent screens. Dispatch one specialist agent per screen in parallel:
  - Landing → `frontend-developer` + motion via `emil-design-eng`
  - Wizard → `frontend-developer` / `react-specialist`
  - Dashboard → `frontend-developer`
  - Reveal → dedicated agent (highest complexity, do not parallelize internally)
  - Pricing → `frontend-developer`
  - Auth → `frontend-developer`
- **Converge:** Phase 8 runs after all screens land.

**Per-phase loop (mandatory):** fire assigned skills → implement → `webapp-testing` browser check vs mockup → `review`+`simplify` → `caveman-commit`.

---

## 4. Acceptance Criteria ("same to same")

A phase is done only when, side-by-side at 375px and 1280px:
1. Typography matches (Bricolage headings weight 800, `-.02em` tracking, `1.02` line-height).
2. Spacing/radius/shadow match mockup values (`--r/--r-lg/--r-xl`, `--sh/--sh-lg`).
3. Motion matches (same easing, duration, sequence, keyframe names) — and degrades under `prefers-reduced-motion`.
4. Real data flows unchanged (auth, upload, tier gate, RSVP, Stripe all still work).
5. `npm test` green, `tsc --noEmit` clean, lint clean.
6. Browser-verified (Playwright/agent-browser screenshot diff against mockup).

**Brief §9 hard gates (whole-app, checked at Phase 8):**
7. Landing shows 3 animated SVG cards moving exactly like prototype.
8. Ambient ribbons on every screen; celebration pop on every primary button.
9. Full reveal plays end-to-end from real DB data, full-screen, mobile-first.
10. E2E smoke: sign up → create w/ real photo upload → publish → open public link incognito → reveal plays.
11. Plan limits enforced server-side; RLS blocks reading others' drafts.
12. Lighthouse mobile perf ≥ 90; reveal interactive < 2.5s on mid-tier phone.

---

## 5. What We Explicitly Do NOT Do

- Do not port the mockup's fake `state` object or fake `go()` router.
- Do not weaken auth/tier/upload to mimic the mockup's instant transitions.
- Do not add the mockup's hardcoded numbers (12,431 counter, 312 views) as real values — keep live data; the animated counter is presentational only.
- Do not introduce new backend features. This is UI-only.
- Do not migrate to Vite or rewrite from scratch (brief §2 conflict — resolved in §0a: keep Next.js).
- Do not rename routes to `/r/:slug` etc. — keep existing paths; links/emails/QRs already point there.
- Do not add any dependency not already in `package.json` without flagging (brief §11). framer-motion + canvas-confetti already present — use those.
- Do not introduce a UI kit that overrides brand tokens. No copyrighted characters, no paid stock — original SVG only.

---

## 6. Build Order (brief §10, adapted to re-skin)

Brief's order assumes greenfield; ours keeps foundation-first but skips backend stand-up (already live):

1. **Phase 0+1 (sequential):** Port tokens/fonts (Playfair→Bricolage) + get **ambient ribbons + celebration-pop working app-wide first** (shared, every screen depends on them). Build pill-button/chip/card/input/polaroid atoms + confetti/ribbon engine.
2. **Phase 2:** Landing incl. 3 animated SVG hero cards (port SVG + keyframes verbatim).
3. **Phase 6 (REVEAL):** Nail the full 10-beat sequence. Brief says "do it before backend" — backend already exists, so wire to real `/surprise/[slug]` data from the start. Highest-effort, do not parallelize internally.
4. **Phases 3/4/5/7 (parallel):** Auth, Create wizard, Dashboard, Pricing — one specialist agent per screen, re-skin only.
5. **Phase 8:** Reduced-motion pass, Lighthouse, full E2E, a11y, review, security-review, ship.
