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
