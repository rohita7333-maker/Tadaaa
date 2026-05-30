---
name: tadaaaa-motion-p1
description: P1 reveal surface motion — unwrap choreography, a11y fixes, stagger-with-intent — commit 1f143c0 on feat/sophistication
metadata:
  type: project
---

# TaDaaaa Motion P1 — Reveal Surface

**Status:** DONE (2026-05-30). Commit `1f143c0` on `feat/sophistication`.

**Why:** Reveal surface was a flat crossfade slideshow — every stage just opacity 0→1. FloatingParticles + reveal icon had no `prefers-reduced-motion` guard (vestibular hazard). MessageReveal used uniform word-drip on entire body (uniform staggerChildren:0.08 — the #1 AI-slop tell).

**What shipped:**
- `src/lib/motion.ts`: `durations.ambient = 2.8`, `staggers = { lead:0, support:0.06, detail:0.10 }`
- `src/components/surprise/TapToReveal.tsx`: unwrap choreography; 6 stage transitions now directional; FloatingParticles + reveal icon reduced-motion fixed; all tokens from `@/lib/motion`
- `src/components/surprise/MessageReveal.tsx`: title = word-by-word blur reveal; body = line-by-line (`\n`-split); imports from `@/lib/motion`

**Gate:** tsc 0 · vitest 217/217 · lint 0 new errors · gems untouched

**How to apply:** P2 (Landing) can start from `src/components/home/Hero.tsx`. See MOTION_MASTERPLAN §3.2.

**Open:** 60fps real-device profile not yet done (no Playwright in this session). Do before P2 ships.

---

# TaDaaaa Motion P2 — Landing Surface

**Status:** DONE (2026-05-30). Commits `54ab8c7` (P1 fix) + P2 commit (pending) on `feat/sophistication`.

**What shipped:**
- Hero.tsx: word-by-word blur headline, role-differentiated entrances (scale/spring/slide/blur), ambient loops guarded
- HowItWorks.tsx: directional card entrances (x:-24 dominant, y:20 subordinate), `makeReducedMotionTransition` everywhere
- Testimonials.tsx: reading cadence stagger (`staggers.support`), shorter y travel (20 not 32)
- Navbar.tsx: removed height animation, opacity+y transforms only, `useReducedMotion` added
- motion.test.ts: +3 tests (staggers.word, hierarchy ordering, timing ladder invariant)

**Gate:** tsc 0 · vitest 220/220 · lint 0 new · reduced-motion verified Hero+HowItWorks+Testimonials+Navbar · gems untouched · no uniform fade-up remaining.

**P3 entry:** `src/components/create/` — step transitions, tactile inputs, publish confetti payoff.

---

# TaDaaaa Motion P3 — Create Wizard

**Status:** DONE (2026-05-30). Commit `7049e40` + fix `cd99331` on `feat/sophistication`.

**What shipped:** Full motion layer on 9 create components. Directional step transitions (x:±60+scale:0.96). Spring card press (OccasionSelector, ThemeSelector). Spatial photo list AnimatePresence. Authored loading states (Sparkles rotate, Film breathe, ✨ pulse). AnimatePresence mode=wait on AIDraftButton panel + VideoGenerator status states. PreviewPublish springs.weighty payoff. RevealSettings conditional fields animated. QuestionBuilder add/remove list. All components: useReducedMotion(). Zero inline magic numbers.

**Gate:** tsc 0 · vitest 227/227 · lint 0 new · reduced-motion all 7 create components ✓ · transforms+opacity only ✓ · StepIndicator gem untouched ✓

**P4 entry:** `src/components/dashboard/` — card stagger, hover spring, OnboardingModal a11y.

---

# TaDaaaa Motion P4 — Dashboard Surface

**Status:** DONE (2026-05-30). Commit `188ada6` on `feat/sophistication`.

**What shipped:**
- `InviteList.tsx` (new): client wrapper, AnimatePresence mode=popLayout, role-differentiated entrance (lead=springs.soft from y:12/scale:0.97; support=ease from y:6), staggerChildren=staggers.support, spring whileHover/whileTap, optimistic delete, reduced-motion all disabled.
- `InviteCard.tsx`: removed imperative hover mutations, onDelete callback, tokenized share panel, useReducedMotion().
- `OnboardingModal.tsx`: added useReducedMotion() (was missing). springs.soft modal slide. AnimatePresence step content (directional x:±12 or opacity-only reduced).
- `animated-counter.tsx`: easings.entrance token, durations.slow default, SSR hydration fix.
- `motion.test.ts`: +11 P4 contract tests.

**Gate:** tsc 0 · vitest 238/238 · lint 0 new · reduced-motion all dashboard components ✓ · no uniform fade-up ✓ · RSC boundary clean ✓

**P5 entry:** Cross-surface hardening — Hero.tsx ambient loop inline durations (lines 320/348/356), spatial offset tokens, security-review, CEO ship sign-off. See MOTION_MASTERPLAN §5 P5.
