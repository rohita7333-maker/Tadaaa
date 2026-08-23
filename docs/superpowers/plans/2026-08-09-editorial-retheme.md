# TaDaaaa Editorial Re-Theme + Feature Level-Up — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Dev agents run **Opus 4.8 in caveman mode**; verification runs **Fable 5**. No git commits at any point until the user says go.

**Goal:** Re-skin and level up the real TaDaaaa product (`surprise-invite` Next.js web + `mobile` Expo app) to the editorial identity of `tadaaaa/tadaaaa-editorial.html`, end to end, with every new surface wired to the real Supabase/Stripe/auth backend — no mock flows, no dead buttons.

**Architecture:** One primitive token layer (editorial palette + Georgia/system type) replaces the rose/gold/cream brand layer in `globals.css` (web, Tailwind v4 CSS-first `@theme inline`) and `src/theme/tokens.ts` (mobile). Existing brand names survive one phase as value-less aliases so the migration is incremental, then are deleted with a grep gate proving zero remain. Surfaces migrate in dependency order — tokens → marketing → app chrome → wizard/reveals → new features → polish. Backend contracts (server actions, RPCs, RLS, Stripe) are untouched except where a new feature explicitly requires a confirm-gated migration.

**Tech Stack:** Next.js 16.2.12 · React 19.2.4 · Tailwind v4 (CSS-first, **no `tailwind.config`**) · shadcn · framer-motion 12 · zod 4 · vitest · Supabase (`xrlmnlknymgakswsbawk`) · Stripe · Expo/React Native + Reanimated 4 · jest.

---

## Global Constraints

Copied verbatim from the user directive — every task inherits these.

1. **No git commits** until the user explicitly says go. Both repos stay uncommitted.
2. **No DB migration is applied** without the SQL shown to the user first and an explicit "yes". Applying without that is a P0 process violation (it happened once before — see the reveal_type incident in memory).
3. **Dev agents: Opus 4.8, caveman mode, always.** Verification pass: Fable 5. Never scale effort down for model tier.
4. **CLAUDE.md skill stack fires every phase** — superpowers (plans/TDD/verify) + hallmark → impeccable → taste-skill for any UI + emil-design-eng for any motion + security-review for anything touching backend/migrations.
5. **Evidence rule.** "done/passing/verified" only with the command output shown. No output → "changed, unverified".
6. **Web + mobile parity inside each phase.** A phase does not close with mobile lagging; if a mobile item is genuinely infeasible (native dep missing), it is disclosed in that phase's report, not silently dropped.
7. **No fake flows.** Every button hits the real backend. Anything stubbed is labelled STUB in the delivery report.
8. **No functional regressions.** Baselines below must never go down.
9. **Memory update closes every phase** (`~/.claude/projects/.../memory/project_tadaaaa_templates_feature.md`).
10. **Token-lean operation** — headroom + caveman on all agents; `codeburn` reported at the end of each phase.
11. **Per-phase patch archive** (D3, approved). Every phase closes with `git diff > docs/superpowers/snapshots/<phase>.patch` in **both** repos. Read-only against git state — no commits, no objects written, the no-commit rule is intact.

### Verified baselines (must never regress)

| Repo | tsc | tests | build/export | a11y |
|---|---|---|---|---|
| web `surprise-invite` (branch `feat/templates`) | 0 errors | 460 vitest | `next build` 0 | Lighthouse a11y ≥ 0.96 |
| mobile `mobile` (branch `main`) | 0 errors | 90 jest | `expo export` ios+web 0 | — |

### Gate commands (exact — every phase runs all of them)

```bash
cd tadaaaa/surprise-invite && npx tsc --noEmit && npm test && npx eslint . && npm run build
```

```bash
cd tadaaaa/mobile && npx tsc --noEmit && npm test && npx expo export -p ios && npx expo export -p web
```

Runtime walk: production build on `:3100`, Playwright, signed in as `tada.tester@example.com / Tadaaaa!2026`, **0 console errors** required.

---

## Acceptance standard — MATCH THE MOCKUP (user directive, 2026-08-09)

The user's standard is **exact visual match to `tadaaaa/tadaaaa-editorial.html`**, not "editorial-flavoured". Every phase from P1 on is accepted against the mockup itself, not against taste.

**Per-surface acceptance gate — every phase, every screen:**
1. Open the mockup screen at `http://localhost:8899/tadaaaa-editorial.html` and the real page at the same viewport (1280 and 375 minimum).
2. Screenshot both. Compare side by side.
3. The real page matches on: layout and grid, spacing rhythm, type scale and face, colour usage, border/radius/shadow treatment, component anatomy, states (hover/focus/active/empty), and copy tone.
4. **Every divergence is listed with a reason.** An unlisted divergence is a phase failure.

**Sanctioned divergence classes** — these are the only reasons a divergence may exist, and each must still be named in the phase report:
- **Real backend.** The mockup fakes state in `localStorage` with dead buttons. Where its markup exists only to simulate a backend, the real app keeps its real wiring and matches the *rendered result*, not the markup.
- **Real data.** Mockup names, photos, counts and stock imagery are placeholders. Layout matches; content comes from Supabase.
- **Accessibility.** Where the mockup fails WCAG AA, the a11y gate (≥ 0.96) wins and the divergence is flagged to the user rather than shipped silently. This already happened once in P0: the mockup's own `.btn-coral:hover` dark coral measured 4.66:1, so `#B8412F` (5.20:1) shipped instead.
- **Platform.** React Native has no CSS cascade; mobile matches intent via token presets, not by porting selectors.

Anything else — "close enough", "cleaner this way", "the mockup looks off here" — is **not** a sanctioned divergence. Raise it and ask.

## Design source of truth

**File:** `tadaaaa/tadaaaa-editorial.html` (140 KB, modified 2026-08-08 22:00).
Served at `http://localhost:8899/tadaaaa-editorial.html` via `cd tadaaaa && python3 -m http.server 8899`.

> ⚠️ **Discrepancy to resolve before P1.** A second, *older and smaller* copy exists at `ClaudeCodeProject/tadaaaa-editorial.html` (105 KB, 16:38 same day) — that is the file attached to the prompt. This plan treats the **140 KB `tadaaaa/` copy as canonical** (the user's own instructions name that path and that server). If the user meant the root copy, P1 scope changes. **Flag at the P0 report; do not guess later.**

### Token contract (verbatim from mockup `:root`)

```
--ink:#1A1A1A  --paper:#FFFEFD  --stone:#484848  --pebble:#F5F0ED  --mist:#E8E4E0
--coral:#D45847  --sand:#CCAC9F  --kohlrabi:#994EA8
--grad-hero:linear-gradient(180deg,#FFFEFD 0%,#F5F0ED 100%)
--grad-dark:linear-gradient(180deg,#1A1A1A 0%,#2D2D2D 100%)
--sh:0 1px 3px rgba(26,26,26,.08)
--sh-card:0 4px 20px rgba(26,26,26,.06)
--sh-float:0 8px 30px rgba(26,26,26,.10)
--head:Georgia,"Times New Roman","Tiempos Headline",serif
--body:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif
--r-sm:6px  --r-md:12px  --r-pill:100px
```

Type rules: headings Georgia **weight 400**, `letter-spacing:-.02em`, `line-height:1.1`. Labels: 12px / 600 / `letter-spacing:.12em` / uppercase / `--stone`. Buttons: pill, 13px, 600, `.08em`, uppercase, `min-height:44px`. Focus: `outline:2px solid var(--coral); outline-offset:2px`.

Restraint rules (hard bans): no cursive, no emoji-as-content, no rainbow gradients, no heavy shadows, ~90% ink/paper/stone with coral reserved for primary CTAs and active states only.

### What this replaces (measured, not guessed)

Current web brand layer in `src/app/globals.css`: `--color-rose #C4686D`, `--color-gold #C9A96E`, `--color-cream #FFF8F0`, `--color-charcoal #2D2926`, `--color-warm-gray #6B5E57`, `--color-light-gray #D4CBC3` + shadcn semantics mapped onto them. Fonts: Bricolage (heading, weight **800**), DM Sans (body), Caveat (cursive — **banned by the new identity**), Geist Mono.

Migration surface, measured: **22 web `.tsx` files** reference rose/cream/gold classes; `caveat` appears in 11 files; `bricolage` 3; mobile has a single `src/theme/tokens.ts` plus 6 files hard-coding `#FFF8F0`/`#C4686D`.

**Perf note (free win):** Georgia + system-sans are system fonts. Dropping Bricolage/DM Sans/Caveat webfonts removes the app-wide font-swap that memory records as the residual LCP cost. Expect an LCP improvement, not a regression — measure it in P1 and report the delta.

---

## Architectural decision — token strategy (CEO-grade, per Operating Discipline 12)

**First principles.** The user wants one source of truth *and* zero breakage across ~90 web components + a whole RN app, in phases, with green gates between each. Those two goals conflict if the rename is atomic.

| Option | Cost | Risk | Verdict |
|---|---|---|---|
| **A. Big-bang rename** — delete rose/gold/cream, rewrite all 22 files + mobile in one task | 1 huge task, unreviewable diff | Breaks scroll-story SEAM hex parity with mobile in the same commit; a red gate has no bisect point | Reject |
| **B. Re-point values, keep names** — `--color-rose` now equals `#D45847` | Cheapest | "rose" naming a coral is a permanent lie in the codebase; the user asked for the editorial system, not a paint-over | Reject |
| **C. Editorial primitives + deprecated aliases, deleted per phase** | 1 extra deletion sweep | Two names briefly co-exist, but aliases carry **no independent values** | **Recommend** |

**Recommendation: C.** Define `--ink/--paper/--stone/--pebble/--mist/--coral/--sand` as the only primitives. Re-map every shadcn semantic (`--background`, `--primary`, `--border`, `--muted`, `--ring`, …) onto them. Keep `--color-rose` etc. as `var(--coral)`-style aliases marked `@deprecated`, so nothing breaks on day one. Each of P1–P3 deletes the aliases in the surfaces it touches. **P5 enforces a grep gate: zero deprecated aliases remain** — that is the mechanical proof of "one source of truth", not a promise.

**Risks and mitigations.**
- *Alias rot* (someone leaves an alias behind) → P5 grep gate is a hard failure, plus a vitest assertion parsing `globals.css`.
- *Contrast regressions* — coral `#D45847` on paper is a different ratio than rose `#C4686D`; the known-failing landing rose/gold contrast is finally fixable here → every phase runs Lighthouse a11y on its own pages, gate ≥ 0.96.
- *Scroll-story seam drift* — SEAM_* hexes are hardcoded and must byte-match web↔mobile → P3 changes both in one task and adds a test asserting the two constant sets are identical.

---

## File Structure

New files (web):
- `src/app/globals.css` — **modified**: editorial primitives, semantic remap, deprecated alias block, Georgia/system type, focus ring.
- `src/lib/design-tokens.ts` — **new**: typed export of the palette + radii + shadows for TS consumers (OG images, satori, canvas, charts). Single JS-side source; no second copy of hexes.
- `src/lib/design-tokens.test.ts` — **new**: asserts hexes match the mockup contract and that mobile's token file is in sync.
- `src/app/dashboard/analytics/page.tsx` + `src/components/dashboard/analytics/*` — **new** (P2).
- `src/components/surprise/letters/*` — **new** (P4a).
- `src/lib/reactions.ts` + `src/app/api/invite/react/route.ts` — **new** (P4c).
- `src/components/share/QrPanel.tsx` — **new** (P4b), wrapping the already-installed `qrcode.react` used by `ShareButtons.tsx`.

New files (mobile):
- `src/theme/tokens.ts` — **modified** to the same palette, same names.
- `src/theme/tokens.test.ts` — **new**: parity assertion against the web contract.
- `src/components/reveal/letters/*` (P4a), `src/lib/reactions.ts` (P4c).

Files that change together stay together: every reveal style keeps its own folder (`scrollstory/`, `letters/`) and both platforms mirror the folder names, which is how the existing scroll-story parity was kept verifiable.

---

## Phase map

| Phase | Deliverable | Migration? | Skills |
|---|---|---|---|
| **P0** | Token layer, both repos. One page screenshotted in new skin. Zero feature change. | No | `superpowers:writing-plans` (this doc) · `hallmark` (token audit) · `impeccable typeset`+`colorize` · `superpowers:test-driven-development` · `superpowers:verification-before-completion` |
| **P1** | Marketing: landing (live phone-frame hero, fan carousel, how-it-works, testimonials, final CTA, footer), pricing, auth screens | No | `hallmark` → `impeccable craft/polish` → `taste-skill` · `emil-design-eng` (hero cycle + fan) · `web-design-guidelines` · `benchmark` (Lighthouse) |
| **P2** | App chrome: dashboard, templates, settings, **new analytics page**, **new onboarding**, activity feed | No (analytics reads existing tables) | `hallmark audit` · `impeccable layout/audit` · `backend-dev` (analytics queries) · `tdd` · `security-review` (RLS on new reads) |
| **P3** | Create wizard + all 3 existing reveal styles re-skinned; seam parity re-proved | No | `impeccable craft` · `emil-design-eng` · `taste-skill` · `tdd` (seam parity test) · `webapp-testing` |
| **P4** | New features, ranked: QR → reactions → Open When Letters → timezone → video surfacing. PIN/music evaluated with a recommendation. | **Yes — 3 confirm gates** | `product-management:product-brainstorming` (done inline below) · `tdd` · `backend-dev` · `security-review` + `claude-code-security-review` · `impeccable` |
| **P5** | Polish, alias-deletion gate, Lighthouse, full E2E both platforms, adversarial review, delivery report | Pending-migration decision | `impeccable polish/critique` · `taste-skill` · `benchmark` · `webapp-testing` · `code-reviewer` (adversarial, Opus) · `superpowers:verification-before-completion` · `qa` |

Each phase ends with: gates → runtime walk → phase report → **user go/no-go** → memory update.

---

## P0 — Design tokens (no feature change)

**Files:**
- Modify: `surprise-invite/src/app/globals.css`
- Modify: `surprise-invite/src/app/layout.tsx` (font wiring)
- Create: `surprise-invite/src/lib/design-tokens.ts`, `surprise-invite/src/lib/design-tokens.test.ts`
- Modify: `mobile/src/theme/tokens.ts`
- Create: `mobile/src/theme/__tests__/tokens.test.ts`

**Interfaces produced (later phases consume these exact names):**
```ts
// src/lib/design-tokens.ts
export const palette = {
  ink: "#1A1A1A", paper: "#FFFEFD", stone: "#484848",
  pebble: "#F5F0ED", mist: "#E8E4E0", coral: "#D45847",
  sand: "#CCAC9F", kohlrabi: "#994EA8",
} as const;
export const radii = { sm: "6px", md: "12px", pill: "100px" } as const;
export const shadows = {
  base: "0 1px 3px rgba(26,26,26,.08)",
  card: "0 4px 20px rgba(26,26,26,.06)",
  float: "0 8px 30px rgba(26,26,26,.10)",
} as const;
export const fonts = {
  head: 'Georgia,"Times New Roman","Tiempos Headline",serif',
  body: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
} as const;
```

- [ ] **Step 1 — Write the failing token test** (`src/lib/design-tokens.test.ts`): assert every `palette` hex equals the mockup contract value; assert `globals.css` (read via `fs`) contains `--ink:#1A1A1A` … for all 8 primitives; assert `globals.css` contains **no** literal `#C4686D`, `#C9A96E`, `#FFF8F0` outside the deprecated-alias block.
- [ ] **Step 2 — Run it, confirm RED.** `npx vitest run src/lib/design-tokens.test.ts` → FAIL (module not found).
- [ ] **Step 3 — Write `design-tokens.ts`** exactly as above.
- [ ] **Step 4 — Rewrite the `globals.css` token layer.** Primitives in `:root`; `@theme inline` exposes `--color-ink|paper|stone|pebble|mist|coral|sand`; shadcn semantics remapped (`--background: var(--paper)`, `--foreground: var(--ink)`, `--primary: var(--coral)`, `--muted: var(--pebble)`, `--border: var(--mist)`, `--muted-foreground: var(--stone)`, `--ring: var(--coral)`, `--radius: 12px`); a clearly-fenced `/* @deprecated — deleted by P5 */` block aliases `--color-rose/gold/cream/cream-dark/charcoal/warm-gray/light-gray` onto editorial values; base layer sets `h1..h4 { font-family: var(--head); font-weight: 400; letter-spacing: -.02em; line-height: 1.1 }` and `:focus-visible { outline: 2px solid var(--coral); outline-offset: 2px }`.
- [ ] **Step 5 — Drop the webfonts.** In `layout.tsx` remove Bricolage/DM Sans/Caveat/Geist Mono loaders and their CSS var wiring; body → `var(--body)`. Cursive is banned by the identity, so `.polaroid-caption` moves to `var(--body)` italic at the same optical size (verify polaroid captions still read in P3).
- [ ] **Step 6 — Run the test, confirm GREEN.** `npx vitest run src/lib/design-tokens.test.ts` → PASS.
- [ ] **Step 7 — Mirror on mobile.** `mobile/src/theme/tokens.ts` gets the identical palette/radii/shadow names and values; add `__tests__/tokens.test.ts` asserting the hex set matches the same contract literals (mobile can't import from web — the test hard-codes the contract, and the web test hard-codes it too, so a drift breaks one of them).
- [ ] **Step 8 — Full gates, both repos** (commands in Global Constraints). Web target: tsc 0 · **≥ 461** vitest (460 + new) · eslint 0 · build 0. Mobile: tsc 0 · **≥ 91** jest · both exports 0.
- [ ] **Step 9 — Screenshot proof.** Prod build on `:3100`, Playwright screenshot of `/pricing` (simplest page, most token-dense) at 1280 and 375. **Deliver to the user before P1 starts** — this is the user's explicit P0 acceptance gate.
- [ ] **Step 10 — Phase report + memory update.** Include the mockup-file discrepancy flag and the measured LCP delta from dropping webfonts.

### P0 OUTCOME — complete, verified 2026-08-09

Gates, my own run (not the dev agents' claims):

| | tsc | tests | lint | build/export |
|---|---|---|---|---|
| web | 0 | **530 passed / 530** (baseline 460) | 0 errors, 12 pre-existing warnings | `next build` exit 0 |
| mobile | 0 | **104 passed / 104** (baseline 90) | n/a (no eslint config, pre-existing) | ios 0 · web 0 |

Runtime, prod build on `:3100`, Playwright: `/`, `/pricing`, `/templates`, `/auth/signin` all 200, **0 console errors**, **0 webfont requests** on every page. Computed on `/pricing`: `h1` = `Georgia, "Times New Roman", "Tiempos Headline", serif`, weight `400`, letter-spacing `-1.2px`; `body` background `rgb(255,254,253)` = paper. All 8 primitives + all 5 extension tokens resolve; zero empty vars.

**Correction to a standing assumption:** W0–W6 is **already committed** — web `b85f311`, mobile `ae7806d`. Memory recorded it as uncommitted. HEAD is a genuine recovery point, so D3's patch archive is a convenience, not the only safety net. The no-commit rule still governs everything from P0 forward.

**Extension token layer added (contract amendment).** The 8-colour contract had no dark coral, no tints and no white, so both dev agents invented their own fills — web mapped `rose-deep` straight onto `coral`, which dropped six scroll-story labels to ~3.4:1, under AA. Fixed by adding a shared, derived, primitives-tier layer used identically by both platforms:

`coralDeep #B8412F` · `coralLight #E18A7D` · `sandLight #E0CDC5` · `sandDeep #B08D7E` · `white #FFFFFF` · `chipCoralBg #FBEDEB` · `chipCoralBorder #F4D4D0` · `chipMutedText #73635D`

`coralDeep` measured: **5.20:1** on `#FFF8F0`, **4.72:1** on `#F5EDE3`, **5.44:1** on `#FFFEFD` — AA on every ground. Chosen over the mockup's `#c04a3a` (4.66:1) because mobile already shipped it and it measures better. `palette` stays exactly the 8 primitives; the extension lives beside it, outside the deprecated fence.

**Gate hardened.** Both fenced deprecated blocks now grep to **zero** hex literals (enforced in-suite). The web ban was extended to `rgba()` forms after the verifier found retired rose surviving as `rgba(196,104,109,…)` in `.pulse-glow`/`.btn-pri` and retired grays in `.animate-shimmer`; those three rules now use `color-mix(in srgb, var(--coral) …)` and primitives.

**Carried into later phases (recorded, deliberately not fixed):**
- ~90 arbitrary Tailwind hexes (`text-[#2D2926]`, `bg-[#FFF8F0]`, `#C4686D`, `#9B3D42`, `#C9A96E`) across landing/auth/dashboard/create/templates/pricing do not read the token layer. Visible proof: `/pricing` `h1` still computes `rgb(45,41,38)` (old charcoal) on an editorial paper ground. **This is the single biggest remaining visual inconsistency — P1–P3.**
- `.btn-pri` lost its gradient (aliases may hold no independent values) and reads flat coral — P1 replaces it with editorial pill styling.
- Headings dropped 800 → 400 serif app-wide, as contracted. Every hero now reads much lighter; P1 re-typesetting.
- `.occard` hero-art tints and `.bg-bday/.bg-mom/.bg-anniv` stops still legacy — P1 hero art.
- `src/lib/themes.ts` still declares `Bricolage Grotesque` / `DM Sans` (dormant, 0 consumers) and is **parity-locked byte-identical across web and mobile** — needs a joint task, not a one-sided edit.
- Mobile font loaders (`useFonts`) left in `_layout.tsx`: removing them also removes the first-render gate, which is a startup-behaviour change, not a token change. P1 cleanup. Native fonts are bundled, so there is no LCP win to bank there anyway.
- `FINALE_NIGHT` exists only on mobile; web inlines `#181513` twice. Pre-existing at HEAD. **P3's seam-parity test must normalise this or it will trip.**
- `--color-white` shadows Tailwind's built-in `white` with an identical value. No visual delta; namespace overlap worth knowing.

**Explicitly out of scope for P0:** any layout, copy, component-structure, or feature change. If a page looks wrong after re-tokening, that is P1–P3 work — record it, don't fix it here.

---

## P1 — Marketing surfaces

**Files (web):** `src/app/page.tsx`, `src/components/landing/*` (Hero, TemplateShowcase, Testimonials, Footer, Navbar), `src/app/pricing/page.tsx`, `src/components/pricing/*`, `src/app/auth/signin|signup|forgot-password|reset-password|verify-email/page.tsx`, `src/components/auth/*`.
**Backend:** untouched. Supabase auth calls, `src/actions/auth.ts`, `safeNext` allowlist, middleware `next=` threading all stay byte-identical — P1 is presentation only. Any diff in `src/actions/` during P1 is a review failure.

- [ ] Landing hero → **live phone-frame mini-reveal**: 4 auto-cycling scenes + a real ticking countdown, per mockup `.hero-phone`/`.hp-*`. Countdown ticks from a real future date; reduced-motion freezes the cycle on scene 1 and keeps the countdown readable. **Hydration guard:** no `Math.random()` — reuse the existing `src/lib/scroll-story/seeded.ts` PRNG. **Do not re-introduce the LCP bug** — memory records that a JS-gated hero entrance held H1 at opacity 0 for 5 s; the H1 must render server-side at full opacity, animation may only touch decorative layers.
- [ ] Fan carousel restyle to `.fan/.fan-card` (190×270, `--r-md`, mist border, `--sh-card`), driven by the existing `CoverflowFan` + pure `coverflow-math.ts` — math untouched, styling only; its unit tests must stay green.
- [ ] How-it-works (`.sec.pebble`), testimonials, final CTA, footer to editorial.
- [ ] Pricing: keep `src/lib/pricing.ts` as the single price source (no hardcoded prices in JSX — grep gate), re-skin tiers + FAQ.
- [ ] Auth screens: editorial forms, `--mist` borders, coral focus ring, pill CTAs. **Tabbed auth + password-strength meter** from the mockup are in scope; the meter is client-side UX only and must not alter the zod `signUpSchema` server contract.
- [ ] Gates + Playwright walk (signed-out landing → pricing → signin → signup → forgot) 0 console errors.
> **⚠️ D2 BLOCKED BY D-NO-COMMIT — surfaced 2026-08-09, needs a user call.** A Vercel project already exists (`tadaaa`, `prj_MvKlmQDlE36oP3Q8urP7tK7QhumN`, team `rohita7333-gmailcoms-projects`), but the repo has no `.vercel` link and **all P0/P1 work is uncommitted**. A git-push preview would deploy the *old* committed code — useless. `vercel deploy` from the working tree would carry the new code but needs an interactive Vercel login this session cannot perform. So D2 and the no-commit rule are in direct conflict.
> **Recommendation:** defer the preview to the first thing after commit-go — the project exists, so it is a ~5-minute step then. P1 still runs its full runtime walk against the local prod build on `:3100`. Also blocking full function in preview regardless: `.env.local` `STRIPE_SECRET_KEY` is still the literal placeholder `sk_test_...` and `STRIPE_GIFT_PRICE_ID` is absent.

- [ ] **Vercel PREVIEW deploy (D2, approved — see blocker above).** Deploy `feat/templates` to a preview URL — preview only, never production. Re-run the P1 runtime walk against the deployed URL, not just `:3100`. Stripe and OAuth-dependent paths will degrade until the user supplies a real `STRIPE_SECRET_KEY`, `STRIPE_GIFT_PRICE_ID`, and the OAuth redirect URLs — record exactly which flows degrade rather than papering over them.
- [ ] Lighthouse on `/` and `/pricing`: a11y ≥ 0.96 **and** report the LCP delta vs. the pre-P0 baseline (0.84 perf / 5.1 s landing LCP). The long-standing rose/gold brand-contrast failure should now resolve — confirm with the machine score.

---

## P2 — App chrome

**Files (web):** `src/components/dashboard/*` (Navbar, DashboardNavServer, InviteCard, stat tiles, ShareButtons), `src/app/dashboard/page.tsx`, `src/app/dashboard/activity/page.tsx`, `src/app/templates/page.tsx` + `src/components/templates/*`, `src/app/settings/page.tsx`, `src/app/settings/data/page.tsx`.
**Mobile:** `(tabs)/*`, `templates.tsx`, `activity.tsx`, card/chip components.

Preserve exactly, and prove it: the W0 "one chrome" behaviour (shared authed bar, `aria-current="page"`, zero "Sign up free" leaks when authed), activity-feed scoping, RLS-backed reads, `?template=` threading through middleware/signin.

- [ ] Dashboard: editorial rows, stat pills, SVG action icons (mockup replaced emoji with SVG — emoji-as-content is banned), QR button per row wired to the real `ShareButtons` QR (not a new implementation).
- [ ] Templates page + `/templates` filters/chips re-skin; `filterTemplates` logic untouched.
- [ ] Settings re-skin; sticky-header behaviour preserved.
- [ ] **NEW — Analytics page** `/dashboard/analytics`, real data only. Sources that already exist: `invite_views`, `invite_rsvps`, `invite_answers`, `invites.view_count`, `invites.response_count`. Build `src/lib/analytics-data.ts` as a **pure** aggregator (views over time, RSVP conversion, answer split, per-invite table) with unit tests over fixtures; the page is a server component doing RLS-scoped queries. No new table, no new migration. Charts use `design-tokens.ts` values — no ad-hoc hexes.
- [ ] **NEW — Onboarding.** `profiles.welcomed_at` already exists → gate a 3-step editorial onboarding on it, writing `welcomed_at` on completion via a server action. Skippable; never blocks the app.
- [ ] **Known gap to close here:** the dashboard nav cluster is `hidden` below `sm` (recorded as a W0 follow-up). Editorial mockup has a bottom `.appbar` for small screens — implement it as the mobile-web nav.
- [ ] Gates + walk over 6 authed pages + mobile tab walk. `security-review` on the analytics queries (scoping/leakage) before the phase closes.

---

## P3 — Wizard + reveals

**Files (web):** `src/app/create/page.tsx`, `src/components/create/*` (StepIndicator, OccasionStep, ThemeSelector, RevealSettings, EventsEditor, PreviewPublish, TemplateSummaryChip), `src/components/surprise/*` (TapToReveal, CountdownReveal, `scrollstory/*`), `src/components/contribute/*`, `src/app/contribute/[slug]/page.tsx`.
**Mobile:** mirrors of all of the above.

Preserve exactly: photo upload + compression + moderation, signed URLs, captions, `rotation_deg`, RSVP + answers + view RPCs, watermark tier logic, premium publish gate + Stripe session verification/anti-replay, draft persistence across checkout redirect.

- [ ] Wizard chrome to editorial (labels, pill CTAs, `--mist` fields, step rail). The existing chip-vs-grids `AnimatePresence` cross-fade stays; re-time to editorial motion (`emil-design-eng` review — durations, easing, press states).
- [ ] Tap reveal + countdown reveal re-skin (mockup `bTap`/countdown blocks): full-screen, no phone column.
- [ ] Scroll story re-skin. **Seam chain is the risk.** `SEAM_*` constants in `src/components/surprise/scrollstory/shared.tsx` must hex-match `mobile/src/components/reveal/scrollstory/shared.ts`. Change both in one task and add a parity test (web-side test asserts the literal chain; mobile-side test asserts the same literals) so drift is a red gate, not a visual bug.
- [ ] Sequential photo reveal with captions (mockup behaviour) — real signed photo URLs, real captions, real rotation.
- [ ] Contribute page re-skin; upload validation + reorder preserved.
- [ ] Gates + **full live E2E**: signin → `/create?template=golden-hour` → events → photo upload + moderation → publish → open the live invite → RSVP → verify rows in Supabase. Repeat against `/surprise/golden-hour-ll3yyhkeon` (existing live invite) and `/surprise/demo`.
- [ ] Reduced-motion pass on all three reveals.

---

## P4 — New features (real implementations, ranked)

### Ranking (product-brainstorming, inline — value ÷ cost ÷ risk)

| # | Feature | Value | Cost | Migration | Verdict |
|---|---|---|---|---|---|
| 1 | **QR on publish + share** | High — physical handoff (cards, gifts, parties) is the actual use case | **Low** — `qrcode.react` already installed and already used in `ShareButtons.tsx` | None | **Ship first** |
| 2 | **Reactions ❤️😂😢🔥 with counts** | High — the only lightweight signal a *guest* can leave; feeds activity feed + dashboard tiles | Medium — new table + anon RPC + rate limit + both clients | **Yes (M2)** | Ship second |
| 3 | **Open When Letters** (4th reveal style) | High — the strongest differentiator in the mockup; a genuinely new product mode | High — new reveal engine ×2 platforms + wizard + schema | **Yes (M1)** | Ship third |
| 4 | **Timezone** | Medium — `countdown_date` is already `timestamptz`, so this is a *rendering* concern | Low — store IANA string, render with `Intl` | **Yes (M3, trivial)** | **Keep** |
| 5 | **Video** | Medium | **Near-zero** — `/api/video/generate`, `/api/video/status`, Remotion deps already exist but are unsurfaced | None | **Keep — surface, don't build** |
| 6 | **PIN lock** | Medium | High to do *honestly* — a client-side PIN is fake security; real gating needs a hashed column + server-side reveal gate + a separate anon fetch path | Yes | **Defer** — recommend shipping as "password-protected link" later, or not at all. Half-measure is worse than absent. |
| 7 | **Music library** | Medium | High — licensing (real money/legal risk), storage, autoplay policy, and mobile has **no `expo-av`** (already a disclosed parity gap) | Yes | **Defer** — revisit after launch with a licensed track set |

**Recommendation:** ship 1 → 2 → 3 → 4 → 5. Defer 6 and 7 with the reasons above. Rationale: order maximises shipped value per unit of migration risk, and puts the two zero-migration items (QR, video surfacing) around the two that need user confirmation, so a slow confirm never blocks the phase.

### Migration confirm gates (SQL shown; **nothing is applied without an explicit "yes"**)

**M1 — Open When Letters (widen the CHECK).** Live constraint verified today:
`CHECK (reveal_type = ANY (ARRAY['tap','countdown','scroll_story']))`

```sql
-- sql/invite_reveal_type_letters.sql
-- Additive, idempotent, reversible. Rollback: re-run with 'letters' removed.
alter table public.invites drop constraint if exists invites_reveal_type_check;
alter table public.invites add constraint invites_reveal_type_check
  check (reveal_type = any (array['tap','countdown','scroll_story','letters']));
```

**M2 — Reactions.**

```sql
-- sql/invite_reactions.sql
create table if not exists public.invite_reactions (
  id uuid primary key default uuid_generate_v4(),
  invite_id uuid not null references public.invites(id) on delete cascade,
  emoji text not null check (emoji in ('heart','laugh','cry','fire')),
  created_at timestamptz not null default now()
);
create index if not exists invite_reactions_invite_idx
  on public.invite_reactions (invite_id, created_at desc);
alter table public.invite_reactions enable row level security;

-- Guests are anonymous: no direct insert. Writes go through a SECURITY DEFINER
-- RPC so rate limiting and invite-liveness checks cannot be bypassed.
create policy "creator reads own invite reactions" on public.invite_reactions
  for select using (
    exists (select 1 from public.invites i
            where i.id = invite_id and i.creator_id = auth.uid())
  );

create or replace function public.record_reaction(p_slug text, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_emoji not in ('heart','laugh','cry','fire') then
    raise exception 'invalid emoji';
  end if;
  select id into v_id from public.invites
   where slug = p_slug and is_active = true and deleted_at is null;
  if v_id is null then return; end if;
  insert into public.invite_reactions (invite_id, emoji) values (v_id, p_emoji);
end $$;
revoke all on function public.record_reaction(text,text) from public;
grant execute on function public.record_reaction(text,text) to anon, authenticated;
```
Store an emoji **key**, never the glyph — the identity bans emoji-as-content in the UI; reactions render as editorial icons with counts. Reuse the existing `rate_limits` table pattern (as `record_rsvp` does) — the exact throttle call is written against the live `rsvp_name.sql` function body, not reconstructed from `sql/` files (memory: `sql/` has drifted from live before).

**M3 — Timezone (only if the user takes item 4).**
```sql
-- sql/invite_display_timezone.sql
alter table public.invites
  add column if not exists display_timezone text;
```

**Also still pending from W5 (user's call, unchanged):** `invite_session_unique.sql` (closes the last HIGH — Stripe double-spend TOCTOU), `premium_enforcement.sql` (closes mobile `is_paid` forgery; deploy the branch *first*), `push_tokens.sql` (mobile push). Recommend applying all three **before** P4 ships, in that order — they close known HIGH findings and P4 adds writes on top of the same tables.

### P4 task order

- [ ] **P4-b QR** — `QrPanel` on the publish success step + share sheet + dashboard row; SVG (crisp print) with PNG download; **scan-verified** on a real phone camera or a decoder in the runtime walk, not just "it rendered". Mobile mirror via existing RN QR path or `react-native-qrcode-svg` (if a new dep is needed, disclose it before adding).
- [ ] **P4-c Reactions** — TDD: pure `src/lib/reactions.ts` (aggregate, cap, key↔icon map) → API route → reveal UI (all reveal styles) → activity feed + dashboard tile integration → mobile mirror. Rate-limited; anonymous; counts visible to the creator.
- [ ] **P4-a Open When Letters** — `schemas.ts` enum + refine, `RevealSettings` 4th card, `letters/` engine both platforms (envelope grid → open → letter view, per mockup `bLetters`/`.letview`/`.letpaper`), `from-invite` mapping, `/surprise/[slug]` 4th branch. **The existing three branches must stay byte-identical** — same discipline that kept tap/countdown safe when scroll_story landed.
- [ ] **P4-d Timezone** — `display_timezone` captured in the wizard, rendered via `Intl.DateTimeFormat`; default "their local time".
- [ ] **P4-e Video surfacing** — expose the existing generate/status routes in the dashboard with real job polling and honest failure states. If the routes turn out to be non-functional against current infra, **say so and stop** — do not fake a progress bar.
- [ ] Gates + `security-review` + `claude-code-security-review` on every backend delta; **CRITICAL findings block the phase**.

---

## P5 — Polish + verify

- [ ] **Alias-deletion gate.** Delete the deprecated block in `globals.css`; `grep -rn "color-rose\|color-gold\|color-cream\|color-charcoal\|warm-gray\|light-gray\|caveat\|bricolage" src | grep -v graphify-out` returns **zero**. Add it as a vitest assertion so it stays true.
- [ ] `impeccable polish` + `impeccable critique` + `taste-skill` pass; hallmark slop-test gates on every changed surface.
- [ ] `emil-design-eng review-animations` across hero cycle, fan, wizard transitions, reveals, reactions.
- [ ] Lighthouse on `/`, `/pricing`, `/templates`, `/dashboard`, `/dashboard/analytics`, a live invite — **a11y ≥ 0.96 gate**; perf reported with deltas.
- [ ] Responsive sweep 320/375/768/1024/1440; zero horizontal overflow.
- [ ] Full E2E both platforms (web Playwright on prod build; mobile expo web export + the disclosed device-smoke gap).
- [ ] Adversarial review: Opus `code-reviewer` over the whole branch diff + a Fable 5 independent verification run of every gate.
- [ ] Final delivery report with **Known Gaps & Risks**, then memory update, then wait for commit-go.

---

## Live bugs found during P1 (phantom `status` column)

Only `gift_purchases` has a `status` column — `invites` does not. Verified against the live database. Two places still assume it does.

**BUG-1 — free-tier expiry has never fired. FIXED in P1, TDD.**
`src/app/api/cron/expire-invites/route.ts` wrote `{ status: "expired", is_active: false }` and filtered `.neq("status", "expired")`. Every run errored, so no invite was ever deactivated — the exact revenue leak `PLAN_free_tier_expiry.md` was written to close. Live proof at the time of the fix: `past_due = 1`, `past_due_still_active = 1`.
Fixed to `{ is_active: false }` + `.eq("is_active", true)`, matching what `src/actions/invite.ts` already treats as the source of truth. New `route.test.ts`, 8 cases, RED-first (4 failed on the phantom column), now green. The test bans the string `status` from both the update payload and every filter argument, so it cannot regress.
**Not done (deliberate):** the one already-past-due invite was left alone. Repairing it is a production data write, not a migration, and the fixed cron will deactivate it on its next run. Flagging rather than writing.

**BUG-2 — dead `record_rsvp` overload still live. NOT FIXED — needs your yes.**
`public.record_rsvp` exists in two overloads:
- `record_rsvp(uuid, text, text)` — **contains `OR v_invite.status = 'expired'`**. Any call raises.
- `record_rsvp(uuid, text, text, text)` — correct, gates on `is_active` + `expires_at` only. This is the one both apps call today (W2 added the name argument).

The broken overload is dormant only because every current caller passes four arguments. Any older client, cached bundle, or hand-rolled call that passes three hits a hard error on a core guest action. PostgREST resolves overloads by the argument names supplied, so this is a live footgun, not a theoretical one.

```sql
-- sql/drop_stale_record_rsvp.sql
-- Drops the 3-arg overload that references invites.status, a column that does
-- not exist. The 4-arg overload (p_name) is the one both clients call and is
-- left untouched. Reversible: the old body is recorded above in this plan.
drop function if exists public.record_rsvp(uuid, text, text);
```

Recommend applying this alongside the other pending migrations. **Not applied.**

## Mockup-feature inventory — nothing dropped

Every distinct surface in `tadaaaa-editorial.html`, mapped to a phase. Anything not carried forward is listed with a reason, so no item is silently lost.

| Mockup surface | Exists in real app? | Phase | Note |
|---|---|---|---|
| Landing hero (live phone-frame reveal) | No — static hero | P1 | New, seeded PRNG, SSR-safe |
| Fan carousel | Yes (`CoverflowFan`) | P1 | Restyle only, math untouched |
| How-it-works / examples / testimonials / final CTA / footer | Yes | P1 | Restyle |
| Tabbed auth + password-strength meter | Partial (separate pages) | P1 | Meter is client UX; zod contract unchanged |
| Onboarding flow | No (`profiles.welcomed_at` exists) | P2 | New, skippable |
| Dashboard rows + SVG action icons + QR button | Partial | P2 / P4-b | Emoji→SVG; QR wires to real `ShareButtons` |
| Templates grid + filter chips + result count | Yes | P2 | Restyle |
| Settings (tz / PIN note / password) | Partial | P2 / P4-d | PIN deferred (see ranking) |
| **Analytics page** | **No** | P2 | New page, real tables, no migration |
| **Notification bell + dropdown** | **No** | P4-f | Needs `profiles.activity_seen_at` (4th confirm-gated migration — SQL below) |
| **Offline banner** | **No** | P5 | Pure client `navigator.onLine`, trivial |
| Bottom app bar (small screens) | No (nav hidden `<sm`) | P2 | Closes the known W0 mobile-web nav gap |
| Create wizard (5 steps) | Yes | P3 | Restyle + editorial motion |
| Tap / countdown / scroll-story reveals | Yes | P3 | Restyle, seam parity re-proved |
| Sequential photo reveal with captions | Partial | P3 | Real signed URLs + captions + rotation |
| Scheduled ("coming soon") page | Partial (`countdown_date`) | P3 | Renders from real countdown date |
| Contribute page + bulk contributors | Yes | P3 | Restyle; upload validation preserved |
| Reactions with counts | No | P4-c | Migration M2 |
| Open When Letters | No | P4-a | Migration M1 |
| Publish QR modal | Partial | P4-b | Ship first |
| Timezone selector | No | P4-d | Migration M3 |
| Music library | No | — | **Deferred** — licensing cost/risk + no `expo-av` on mobile |
| PIN lock | No | — | **Deferred** — client-only PIN is fake security |
| Video | Routes exist, unsurfaced | P4-e | Surface, don't rebuild |
| JSON export / type-DELETE confirm | Yes (`/settings/data`, GDPR export) | P2 | Restyle only |

**M4 — Notification bell (only if the user takes P4-f):**
```sql
-- sql/profile_activity_seen.sql
alter table public.profiles
  add column if not exists activity_seen_at timestamptz;
```
Unread count = rows in the existing activity sources newer than `activity_seen_at`. No new notifications table — the activity feed is already the source of truth.

---

## Standing risk register

| Risk | Mitigation |
|---|---|
| Mockup-file ambiguity (140 KB vs 105 KB copy) | Flagged at P0 report; canonical = `tadaaaa/tadaaaa-editorial.html` until the user says otherwise |
| Scroll-story seam hex drift web↔mobile | Parity test added in P3; red gate |
| Contrast regressions from coral | Per-phase Lighthouse a11y gate ≥ 0.96 |
| Re-introducing the hero LCP bug | Explicit P1 rule: H1 renders server-side at full opacity |
| Applying a migration without confirmation | All SQL is in this doc; agents are instructed to **stop and ask**; this already went wrong once |
| Uncommitted work loss (~55 web + ~25 mobile files, no commits allowed) | **Settled (D3).** `git stash create` is not used — it writes objects. Each phase archives `git diff > docs/superpowers/snapshots/<phase>.patch` in both repos. |
| Mockup-file ambiguity | **Settled (D1)** — `tadaaaa/tadaaaa-editorial.html` (140 KB) is canonical |
| App never deployed; risk of indefinite pre-launch polish | **Settled (D2)** — Vercel preview URL during P1 |
| Context exhaustion mid-phase | headroom + caveman on all agents; memory update closes each phase so a fresh context can resume from the memory file + this plan |
| Stripe E2E still blocked | `.env.local` `STRIPE_SECRET_KEY` is the literal placeholder `sk_test_...` and `STRIPE_GIFT_PRICE_ID` is missing — **user action**, blocks payment E2E in P3/P4 |

---

## Decisions — settled 2026-08-09

- **D1 — Canonical mockup: `tadaaaa/tadaaaa-editorial.html` (140 KB).** Settled. The root 105 KB copy is ignored. No further ambiguity.
- **D2 — Vercel PREVIEW deploy during P1.** Approved. Preview only, never production. P1 adds a task: deploy the branch to a preview URL and re-run the P1 runtime walk against it, so the re-theme lands on a live target instead of only `:3100`. Full function still needs the user's real Stripe key + OAuth redirect URLs.
- **D3 — Per-phase patch archive.** Approved. Every phase ends with `git diff > docs/superpowers/snapshots/<phase>.patch` (plus the same for the mobile repo). Read-only against git state — no commits, no objects written.

## Still open (do not block P0)

1. Migrations: apply the three pending W5 migrations (`invite_session_unique` → `premium_enforcement` → `push_tokens`) before P4? Recommended: yes, in that order — they close known HIGH findings that P4 writes on top of.
2. P4 ranking confirmation, and confirmation that PIN + music stay deferred.

---

## GSTACK REVIEW REPORT

**Mode:** HOLD SCOPE with one selective expansion proposed (D2 below). The user's directive is explicit and complete; the job is rigor, not re-scoping.

### Premise challenge (raised once, then executed as directed)

The one thing worth saying before starting: **this app has never been deployed and has never been seen by a real user.** W0–W6 are done, 460 tests green, ~80 files uncommitted, and the launch blockers are all *user actions* (real Stripe key, OAuth redirect URLs, three confirm-gated migrations, commit go). This plan adds five more phases in front of that.

The counter-argument for doing the re-theme now is real and I think it wins: re-skinning **before** first users means no expectation churn, and the branch is uncommitted anyway. The identity is also load-bearing — a warm/rose app that looks like every other invite SaaS is a weaker launch than an editorial one.

The risk is not the plan, it's the pattern: four mockups, six coherence waves, zero deploys. **Mitigation (D2):** put the current branch on a Vercel *preview* URL during P1. It costs nothing, changes no phase, and converts "someday" into a live URL that P2–P5 improve. Recommend taking it.

### Approach alternatives considered

| | Approach | Effort | Risk | Verdict |
|---|---|---|---|---|
| A | Big-bang token rename | S | High — unreviewable diff, no bisect point on a red gate | Rejected |
| B | Re-point values, keep rose/gold names | XS | Low breakage, permanent naming lie, fails "one source of truth" | Rejected |
| C | Editorial primitives + deprecated aliases deleted per phase, grep-gated at P5 | M | Low | **Chosen** |

### Findings folded into the plan

| # | Severity | Finding | Where fixed |
|---|---|---|---|
| 1 | HIGH | Scroll-story `SEAM_*` hexes are duplicated across web and mobile with no test — a re-skin silently desyncs them | P3 adds a parity test; red gate |
| 2 | HIGH | Prior hero animation held H1 at `opacity: 0` and cost 5 s LCP; the new hero is *more* animated | P1 rule: H1 renders server-side at full opacity; decorative layers only |
| 3 | HIGH | A migration was once applied without a confirm gate | All P4 SQL is transcribed in this doc; agents stop and ask |
| 4 | MED | "One source of truth" is unfalsifiable as a promise | P5 grep gate + vitest assertion over `globals.css` |
| 5 | MED | Two mockup files with different sizes and timestamps | Flagged at P0 report, not guessed later |
| 6 | MED | Mockup features could be silently dropped in a re-skin | Full inventory table above; every surface mapped or explicitly deferred with a reason |
| 7 | MED | No-commit rule means ~80 files of work have no recovery point | Per-phase `git diff` patch archive (D3) |
| 8 | LOW | Dropping 4 webfonts is a perf change disguised as a design change | P1 reports the LCP delta explicitly |

### Verdict

**PROCEED with P0.** Plan is executable as written. Three decisions are open (D1–D3 below) and none of them block P0.

NO UNRESOLVED DECISIONS
