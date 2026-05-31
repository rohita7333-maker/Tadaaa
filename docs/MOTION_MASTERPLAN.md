# TaDaaaa — World-Class Motion Masterplan

**North star:** every motion must feel *handcrafted by a person who loves the recipient — never auto-generated.* Motion is meaning, not decoration.

**Owner:** `tadaaaa-ceo` orchestrates · `tadaaaa-uiux-motion` specs/designs · `tadaaaa-principal-dev` implements · `tadaaaa-qa-test` tests adversarially (per-phase QA gate, blocks sign-off).
**Status:** PLAN — awaiting approval before any app code changes.
**Targets:** Surprise reveal · Landing · Create wizard · Dashboard.

---

## 1. Why the app currently reads "AI-made"

Grounded audit (real values from the codebase):

| Surface | What's there now | The synthetic tell |
|---|---|---|
| **Reveal** (`TapToReveal.tsx`) | 7-stage state machine; every stage transition is a flat `opacity` crossfade (0.4–0.6s) via `AnimatePresence mode="wait"` | The emotional spine has the weakest motion. No anticipation→payoff, no spatial continuity. `FloatingParticles` + landing stage have **no `prefers-reduced-motion` guard**. Particles are emoji (❤️✨🎊). |
| **Landing** (`Hero.tsx`) | Everything enters with `y:20/24`, `opacity:0→1`, duration 0.6–0.7, staggered only by `delay` | Uniform fade-up on every element = the #1 AI-slop signature. No `useReducedMotion`. |
| **Create** (`StepIndicator.tsx`) | Width bars, expo easing `[0.22,1,0.36,1]`, reduced-motion clean | Good — but motion stops at the indicator; steps themselves just swap. |
| **Cross-cutting** | 4+ different easing curves across files (`0.4,2,0.3,1` / `0.22,1,0.36,1` / `easeInOut` / `easeOut`) | No shared "hand" → reads as assembled, not authored. reduced-motion missing in ~11 components. |

**Already world-class (the bar — extend, don't flatten):**
- `PolaroidCarousel.tsx` — 3D circular stack, spring `cubic-bezier(0.4,2,0.3,1)`, word-by-word **blur** caption reveal, sparkle burst, clean reduced-motion. This is the reference.
- `StepIndicator.tsx` — expo-out easing, reduced-motion clean.

---

## 2. Foundation — the one motion "hand" (P0, blocks everything)

A single shared vocabulary so all surfaces feel authored by one person. Define once, reference everywhere.

**Easing tokens** (CSS vars in `globals.css` + a typed export `src/lib/motion.ts`):
- `--ease-entrance: cubic-bezier(0.22, 1, 0.36, 1)` — expo-out, for things arriving (reuse StepIndicator's curve).
- `--ease-exit: cubic-bezier(0.4, 0, 1, 1)` — accelerate away.
- `--ease-spring-soft: cubic-bezier(0.34, 1.56, 0.64, 1)` — gentle overshoot (matches existing `pop-in`/`dodge-btn`).
- `--ease-spring-bouncy: cubic-bezier(0.4, 2, 0.3, 1)` — pronounced overshoot (matches PolaroidCarousel — reserve for hero "touch" beats).

**Framer-motion springs** (typed, for interactive/gesture elements):
- `springSoft = { type: "spring", stiffness: 260, damping: 22 }` — buttons, cards, press.
- `springWeighty = { type: "spring", stiffness: 140, damping: 18, mass: 1.1 }` — the reveal "unwrap" (anticipation + settle).

**Duration scale:** `instant 0.12 · quick 0.2 · base 0.35 · slow 0.6 · cinematic 0.9` (seconds). Ambient loops: 2.5–4s.

**Stagger:** by hierarchy, not uniform — `lead 0` → `support 0.06` → `detail 0.10`, capped so nothing waits >0.5s.

**Reduced-motion contract:** one helper wraps every animated component; reduced = meaning preserved (opacity only / instant), motion removed. Extend existing `getReducedMotionTransition` in `src/lib/a11y.ts`. Never ship a raw `duration:0` scatter.

**Deliverable:** `src/lib/motion.ts` (tokens, springs, variants factory) + globals.css vars. No visual change yet — pure foundation. Once merged, every surface migrates onto it.

---

## 3. Per-surface choreography spec

### 3.1 Surprise reveal — `/surprise/[slug]` (HIGHEST IMPACT)
The product's reason to exist. Reframe the stage machine from *crossfade slideshow* → *gift being unwrapped*.

- **Landing → open:** replace the opacity dissolve with an **unwrap**. On tap: the reveal icon scales with `springWeighty`, a soft mask/iris or envelope-flap opens revealing the next stage *behind* it (spatial continuity, not a dissolve). Add anticipation: 80ms of slight scale-down resistance before release. Keep `vibrate(50)` on tap; add a softer `vibrate(20)` on settle.
- **Stage transitions:** shared-element continuity where possible (title persists and reflows between stages rather than fading out/in). Where a true cut is needed, use directional slide + scale on `--ease-entrance`, not flat opacity.
- **Photos:** PolaroidCarousel already nails it — keep. Tune the *entrance* of the first polaroid to arrive with `springWeighty` so it feels placed by hand.
- **Message reveal:** reuse the word-by-word blur (from PolaroidCarousel captions) for the headline; body fades in line-by-line on `--ease-entrance` with `detail` stagger.
- **Celebration/RSVP:** keep canvas-confetti but tie burst intensity to the "yes" moment; consider one custom Lottie burst (Canva/Lottie asset) over emoji for the hero pop.
- **Particles:** replace ambient emoji with a quieter custom particle (Canva-generated petal/spark sprite or subtle CSS) — and **guard with reduced-motion** (current gap).
- **a11y:** add `useReducedMotion` to `TapToReveal` + `FloatingParticles` (currently missing); reduced path = instant stage swaps, no looping particles.

### 3.2 Landing — kill the uniform fade-up
- **Hero:** differentiate by role. Eyebrow badge: quick scale-in. Headline: word-by-word blur reveal (rhyme with the reveal page). Subcopy: single `--ease-entrance` rise. CTA: arrives on `springSoft` with a magnetic pull (MagneticButton exists). Stats: count-up already good — stagger entrance with `support`/`detail`.
- **Floating cards:** keep ambient `y` loops but de-uniform the timing (already varied) and add subtle parallax on pointer move (desktop only, reduced-motion off).
- **Scroll choreography:** HowItWorks bento reveals on scroll with directional intent (cards rise *toward* their position), not a blanket fade. Use `react-intersection-observer` (installed).
- **a11y:** add `useReducedMotion` to Hero/Navbar/Testimonials (currently missing).

### 3.3 Create wizard — make building feel alive
- **Step transitions:** slide steps horizontally on `--ease-entrance` with depth (outgoing scales back 0.96, incoming rises) — directional, matching forward/back. StepIndicator bar already animates; sync step content to it.
- **Occasion select:** tactile press (`springSoft` scale-down) + selected card lifts with a glow ring.
- **Photo uploader:** drag-over already highlights — add a spring "accept" pop when a file lands, and a gentle settle as the polaroid thumbnail takes its tilt.
- **Publish:** build anticipation on the final CTA → confetti/sparkle payoff that previews the recipient's reveal (a tiny taste of 3.1).

### 3.4 Dashboard — repeat-use polish
- **Invite cards:** stagger-in on load with `support` cadence; hover = `springSoft` lift + spotlight (SpotlightCard exists). Add `useReducedMotion` (currently missing).
- **Command palette:** spring open/close, list items stagger; arrow-nav selection slides on `--ease-entrance`.
- **Onboarding modal:** spring entrance, content stagger; add reduced-motion (missing).
- **Empty/loading:** skeletons already shimmer — ensure they cross-fade to content, not pop.

---

## 4. Standards (apply to all surfaces)
- **Perf:** transforms + opacity only on hot paths; no layout animation during the reveal; lazy-load Lottie/Remotion/heavy variants; verify 60fps on a throttled mid-tier mobile CPU profile; no reveal-route bundle regression.
- **a11y:** `prefers-reduced-motion` honored everywhere; focus order intact; motion never the only signal; contrast preserved.
- **Quality:** vitest green, `tsc` clean, lint not worsened.
- **Tooling:** Chrome (agent-browser/Playwright) to benchmark references + screen-record real mobile feel · Figma MCP for visual specs/variables · Canva MCP for custom particle/asset art · Magic MCP for component inspiration.

---

## 5. Phased rollout

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0 — Foundation** | `src/lib/motion.ts` + globals.css tokens; migrate StepIndicator/PolaroidCarousel to reference tokens (no visual change) | Tokens shipped; gems unchanged visually; tests green |
| **P1 — Reveal** | §3.1 — unwrap, continuity, message reveal, particle + reduced-motion fixes | Reveal feels like unwrapping; 60fps mobile; reduced-motion clean; no TTI regression |
| **P2 — Landing** | §3.2 — de-uniform Hero, scroll choreography, a11y | No uniform fade-up remains; reduced-motion clean |
| **P3 — Create** | §3.3 — step transitions, tactile inputs, publish payoff | Wizard feels alive; reduced-motion clean |
| **P4 — Dashboard** | §3.4 — card stagger/hover, palette, modal a11y | Polished repeat-use; reduced-motion clean |
| **P5 — Hardening** | cross-surface review, perf pass, `security-review`, diary | Full DoD met; CEO ship sign-off |

Surfaces P2–P4 can parallelize after P0/P1 land. P0 blocks all.

### 5.1 Per-phase gate — MANDATORY at every phase boundary
No phase is "done" until BOTH happen (CEO enforces, never skip):
1. **HANDOFF update** — append to `surprise-invite/HANDOFF.md`: what shipped, files touched, test/tsc/lint state, reduced-motion verified, mobile-fps note, open risks, next phase entry point.
2. **MEMORY update** — append to `surprise-invite/memory/diary.md` (session entry) + update/add the relevant `surprise-invite/memory/project_*.md`; update root `~/.claude/.../memory/MEMORY.md` index if a new memory file is created. Use `mem-search` first to avoid dup.

Gate order each phase: implement → **`tadaaaa-qa-test` full QA pass (must PASS)** → `verification-before-completion` → `requesting-code-review` → HANDOFF write → MEMORY write → `caveman-commit`. CEO signs off only after all seven. Any QA FAIL → back to principal-dev, re-test before proceeding.

---

## 6. Skill & tool matrix — what fires, by phase and owner

Every relevant CLAUDE.md skill mapped. "/" prefix optional — fire on context. Irrelevant skills (HuggingFace, PowerShell, blockchain, etc.) excluded by design.

### Always-on (every phase, every agent)
- **Communication:** `/caveman` (full) on ALL agent output — terse. Code/commits/docs written normal. (caveman-always memory.)
- **Process spine:** `brainstorming` → `writing-plans` (done) → `executing-plans` per phase · `verification-before-completion` before any "done" · `caveman-commit` for commits · `session-report` at session end.
- **Memory spine:** `mem-search` (recall before work) · `learn-codebase`/`smart-explore`/`pathfinder` (code nav) · `graphify` (architecture claims) · claude-mem auto-capture · diary + HANDOFF every phase.
- **Library truth:** `context7` — resolve `framer-motion` 12.38 + `next` 16 docs BEFORE asserting any API (training data stale). `serena` for semantic code edits.

### Design owner — `tadaaaa-uiux-motion`
| Skill | Used for |
|---|---|
| `impeccable` (`animate` `critique` `audit` `polish` `typeset` `colorize`) | primary design system — spec + adversarial review per surface |
| `emil-design-eng` | easing/spring/duration feel, hover/press/gesture "does this feel right" |
| `framer-motion` | correct 12.38 API for every variant/spring/AnimatePresence |
| `taste-skill` + `hallmark` | anti-slop audit — kill template seams, the AI-made tells |
| `ui-ux-pro-max` | palette/pairing/component intelligence, glassmorphism/bento |
| `web-design-guidelines` + `design:accessibility-review` + `accessibility-tester` | a11y + contrast + focus + motion review |
| `design:ux-copy` + `ai-writing-auditor` | human, non-AI microcopy on every beat |
| `design:design-critique` | structured per-surface critique pass |
| `design:design-system` + `design:design-handoff` | token architecture (P0) + spec handoff to dev |
| `design:research-synthesis` + `design:user-research` + `ux-researcher` | synthesize reference findings into intent |
| `canvas-design` + Canva MCP | custom particle/petal/spark sprite art (replace emoji) |
| `remotion-best-practices` | reveal video stage (Remotion) motion |
| Figma MCP | visual spec, variables, reference screenshots |
| Magic MCP (21st.dev) | component inspiration/refinement |
| `agent-browser-core` + `gstack`/`browse` | study best-in-class refs (Apple/Linear/Family/Partiful), screen-record live app on throttled mobile |

### Dev owner — `tadaaaa-principal-dev`
| Skill | Used for |
|---|---|
| `karpathy-guidelines` | surgical changes, no overengineering, smallest correct diff |
| `tdd` / `test-driven-development` | test-first; keep 190+ vitest suite green |
| `vercel-react-best-practices` | React 19 / Next 16 perf, RSC/CC boundary, bundle, SSR/SSG |
| `framer-motion` + `context7` | leanest correct 12.38 import, verified API |
| `backend-dev` | only if a beat touches API/Supabase (RSVP intensity, etc.) |
| `simplify` / `code-simplifier` | after writing, before handback |
| `review` / `code-review` / `pr-review-toolkit` + `code-reviewer` | quality + silent-failure + type review |
| `security-review` / `security-guidance` | any data/auth/storage/input path, pre-deploy |
| `diagnose` / `systematic-debugging` | bugs before guessing |
| `webapp-testing` + `playwright` + `agent-browser-dogfood` | verify golden path + edges in real browser |
| `benchmark` / `gstack` | web-vitals, 60fps mobile profile, reveal-route bundle/TTI |
| `performance-engineer` | deep frame-drop profiling on reveal/dashboard scroll |
| `ui-ux-tester` | usability + functional sweep per surface |
| `using-git-worktrees` + `finishing-a-development-branch` | isolate phase work, clean integrate |
| `react-specialist` / `nextjs-developer` | dispatch for impl-heavy surface work |

### CEO owner — `tadaaaa-ceo`
| Skill | Used for |
|---|---|
| `plan-ceo-review` + `plan-design-review` + `plan-eng-review` | QA this plan + each phase spec before dev starts |
| `plan-tune` | refine phase scope on new info |
| `agent-organizer` / `multi-agent-coordinator` | parallelize P2–P4, serialize P0→P1 |
| `requesting-code-review` / `receiving-code-review` | adversarial review loop |
| `verification-before-completion` | gate every phase exit |
| `graphify` | architecture claims before deciding |
| `competitive-analyst` / `trend-analyst` (Chrome) | benchmark outside world, name what makes refs premium |

### QA owner — `tadaaaa-qa-test`
| Skill | Used for |
|---|---|
| `webapp-testing` + `playwright` + `agent-browser-dogfood` | golden-path + edge-case verification in real browser, screen-record mobile |
| `qa` / `qa-only` | full QA flow vs tests-only run |
| `ui-ux-tester` | exhaustive functional UI/UX sweep per documented flow |
| `accessibility-tester` + `design:accessibility-review` + `web-design-guidelines` | WCAG, focus, ARIA, contrast, reduced-motion |
| `benchmark` / `gstack` + `performance-engineer` | web-vitals, 60fps mobile profile, reveal bundle/TTI, frame drops |
| `diagnose` / `systematic-debugging` | minimal repro before filing |
| `security-review` / `pr-review-toolkit` (silent-failure-hunter) | regression + silent-failure audit on touched paths |
| `verification-before-completion` | sign-off ritual — nothing passes without it |
| `context7` + `mem-search` | confirm framer-motion/Next behavior; recall prior bugs |

Test matrix (miss nothing): tsc 0 · vitest 190+ green · lint clean · per-beat token correctness · no flat-crossfade/uniform-fade-up left · gems intact · reduced-motion on every animated component · 60fps mobile transforms/opacity-only · no reveal bundle/TTI regression · cross-device/browser (Chrome+WebKit, mobile+desktop) · edge cases (no/1/many photos, RSVP-no, back-nav, double-tap, offline, slow net) · focus order + a11y · no service-role on public path. Output: PASS/FAIL per surface, each FAIL = exact repro + file:line + severity.

---

## 7. Definition of Done (CEO gate)
Motion is intentional + emotional · one token system, zero scattered magic numbers · `prefers-reduced-motion` everywhere · 60fps mid-tier mobile, transforms/opacity only, no reveal jank · no reveal-route bundle/TTI regression · vitest green, tsc clean, lint not worsened · copy human (`design:ux-copy`) · gems preserved · diary updated.

**A recipient should feel the care, and a designer should not be able to find the template seams.**
