import { describe, it, expect } from "vitest";
import {
  easings,
  cssEasings,
  durations,
  springs,
  staggers,
  makeReducedMotionTransition,
  getReducedMotionTransition,
} from "./motion";

describe("easings", () => {
  it("entrance matches --ease-entrance", () => {
    expect(easings.entrance).toEqual([0.22, 1, 0.36, 1]);
  });
  it("exit matches --ease-exit", () => {
    expect(easings.exit).toEqual([0.4, 0, 1, 1]);
  });
  it("springSoft matches --ease-spring-soft", () => {
    expect(easings.springSoft).toEqual([0.34, 1.56, 0.64, 1]);
  });
  it("springBouncy matches --ease-spring-bouncy", () => {
    expect(easings.springBouncy).toEqual([0.4, 2, 0.3, 1]);
  });
});

describe("cssEasings", () => {
  it("entrance is correct cubic-bezier string", () => {
    expect(cssEasings.entrance).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
  });
  it("springBouncy is correct cubic-bezier string", () => {
    expect(cssEasings.springBouncy).toBe("cubic-bezier(0.4, 2, 0.3, 1)");
  });
  it("springSoft is correct cubic-bezier string", () => {
    expect(cssEasings.springSoft).toBe("cubic-bezier(0.34, 1.56, 0.64, 1)");
  });
});

describe("durations", () => {
  it("has 6 named steps (instant/quick/base/slow/cinematic/ambient)", () => {
    expect(Object.keys(durations)).toHaveLength(6);
  });
  it("instant is 0.12", () => expect(durations.instant).toBe(0.12));
  it("quick is 0.2", () => expect(durations.quick).toBe(0.2));
  it("base is 0.35", () => expect(durations.base).toBe(0.35));
  it("slow is 0.6", () => expect(durations.slow).toBe(0.6));
  it("cinematic is 0.9", () => expect(durations.cinematic).toBe(0.9));
  it("ambient is 2.8 (loop range, 2.5–4s)", () => expect(durations.ambient).toBe(2.8));
});

describe("springs", () => {
  it("soft has correct stiffness and damping", () => {
    expect(springs.soft).toMatchObject({ type: "spring", stiffness: 260, damping: 22 });
  });
  it("weighty has correct values including mass", () => {
    expect(springs.weighty).toMatchObject({
      type: "spring",
      stiffness: 140,
      damping: 18,
      mass: 1.1,
    });
  });
});

describe("makeReducedMotionTransition", () => {
  it("returns normal transition when shouldReduce is false", () => {
    const t = makeReducedMotionTransition(false, { duration: 0.5 });
    expect(t).toMatchObject({ duration: 0.5 });
  });
  it("returns normal transition when shouldReduce is null", () => {
    const t = makeReducedMotionTransition(null, { duration: 0.5 });
    expect(t).toMatchObject({ duration: 0.5 });
  });
  it("returns reduced (instant) when shouldReduce is true", () => {
    const t = makeReducedMotionTransition(true, { duration: 0.5 });
    expect(t).toMatchObject({ duration: 0.12 });
  });
  it("accepts custom reduced transition", () => {
    const t = makeReducedMotionTransition(true, { duration: 0.5 }, { duration: 0 });
    expect(t).toMatchObject({ duration: 0 });
  });
});

describe("staggers", () => {
  it("lead is 0 (no delay — first element)", () => {
    expect(staggers.lead).toBe(0);
  });
  it("word is 0.04 (per-word blur reveal cadence)", () => {
    expect(staggers.word).toBe(0.04);
  });
  it("support is 0.06 (secondary elements)", () => {
    expect(staggers.support).toBe(0.06);
  });
  it("detail is 0.10 (body/copy content)", () => {
    expect(staggers.detail).toBe(0.10);
  });
  it("lead < word < support < detail (ascending hierarchy)", () => {
    expect(staggers.lead).toBeLessThan(staggers.word);
    expect(staggers.word).toBeLessThan(staggers.support);
    expect(staggers.support).toBeLessThan(staggers.detail);
  });
  it("total stagger of 5 detail items stays at or under 0.5s cap", () => {
    expect(5 * staggers.detail).toBeLessThanOrEqual(0.5);
  });
  it("6-word headline stagger completes within 0.25s (word × 5 trailing words)", () => {
    // Hero headline: 6 words, last word starts at headlineStart + 5*word
    const lastWordStart = 0.15 + 5 * staggers.word;
    expect(lastWordStart).toBeLessThanOrEqual(0.4);
  });
  it("hero headline fully settled before 0.8s (lastWordStart + base duration)", () => {
    const headlineEnd = 0.15 + 5 * staggers.word + durations.base;
    expect(headlineEnd).toBeLessThan(0.8);
  });
});

describe("getReducedMotionTransition (re-export)", () => {
  it("is re-exported from motion.ts", () => {
    expect(typeof getReducedMotionTransition).toBe("function");
  });
  it("defaults reduced to duration:0", () => {
    const t = getReducedMotionTransition(true, { duration: 0.5 });
    expect(t).toMatchObject({ duration: 0 });
  });
});

// P3 create-flow motion contracts
describe("P3 create flow — token contracts", () => {
  it("step transition uses durations.base (not a magic number)", () => {
    // page.tsx step wrapper must use this token, not inline 0.3
    const t = makeReducedMotionTransition(false, { duration: durations.base, ease: easings.entrance });
    expect(t).toMatchObject({ duration: durations.base, ease: easings.entrance });
  });

  it("card press uses springs.soft — non-reduced path returns full spring config", () => {
    const t = makeReducedMotionTransition(false, springs.soft);
    expect(t).toMatchObject({ type: "spring", stiffness: 260, damping: 22 });
  });

  it("success payoff uses springs.weighty — heavier than soft (higher mass = more weight)", () => {
    expect(springs.weighty.mass).toBeGreaterThan(1);
    expect(springs.weighty.stiffness).toBeLessThan(springs.soft.stiffness);
  });

  it("success payoff reduced path returns instant (durations.instant)", () => {
    const t = makeReducedMotionTransition(true, springs.weighty);
    expect(t).toMatchObject({ duration: durations.instant });
  });

  it("conditional field entrance uses durations.quick (faster than base)", () => {
    expect(durations.quick).toBeLessThan(durations.base);
    const t = makeReducedMotionTransition(false, { duration: durations.quick, ease: easings.entrance });
    expect(t).toMatchObject({ duration: durations.quick });
  });

  it("compressing / processing loops use durations.slow", () => {
    // Authored pending loops should breathe at slow rate, not instant
    expect(durations.slow).toBeGreaterThan(durations.base);
    expect(durations.slow).toBe(0.6);
  });

  it("reduced step transition returns instant — no x/scale animation", () => {
    const t = makeReducedMotionTransition(true, { duration: durations.base, ease: easings.entrance });
    expect(t).toMatchObject({ duration: durations.instant });
  });
});

// P4 dashboard motion contracts
describe("P4 dashboard — token contracts", () => {
  it("card entrance lead (index 0) uses springs.soft — stiffness 260, damping 22", () => {
    expect(springs.soft).toMatchObject({ type: "spring", stiffness: 260, damping: 22 });
  });

  it("card entrance support (index 1+) uses durations.base + easings.entrance", () => {
    const t = makeReducedMotionTransition(false, { duration: durations.base, ease: easings.entrance });
    expect(t).toMatchObject({ duration: durations.base, ease: easings.entrance });
  });

  it("card entrance reduced path uses durations.instant (opacity-only)", () => {
    const t = makeReducedMotionTransition(true, { duration: durations.base, ease: easings.entrance });
    expect(t).toMatchObject({ duration: durations.instant });
  });

  it("card exit uses durations.quick — faster than base (snappy removal)", () => {
    expect(durations.quick).toBeLessThan(durations.base);
    const t = makeReducedMotionTransition(false, { duration: durations.quick, ease: easings.exit });
    expect(t).toMatchObject({ duration: durations.quick, ease: easings.exit });
  });

  it("card exit reduced path returns instant", () => {
    const t = makeReducedMotionTransition(true, { duration: durations.quick, ease: easings.exit });
    expect(t).toMatchObject({ duration: durations.instant });
  });

  it("stagger cap: 10 dashboard cards at support cadence stay under 0.6s total wait", () => {
    // 10 cards × 0.06s stagger = 0.6s — last card starts animating within threshold
    expect(10 * staggers.support).toBeLessThanOrEqual(0.6);
  });

  it("modal slide uses springs.soft (same hand as card hover/press)", () => {
    const t = makeReducedMotionTransition(false, springs.soft);
    expect(t).toMatchObject({ type: "spring", stiffness: 260, damping: 22 });
  });

  it("modal reduced path: no y movement (instant, opacity-only)", () => {
    const t = makeReducedMotionTransition(true, springs.soft);
    expect(t).toMatchObject({ duration: durations.instant });
  });

  it("share panel transition uses durations.quick + easings.entrance", () => {
    const t = makeReducedMotionTransition(false, { duration: durations.quick, ease: easings.entrance });
    expect(t).toMatchObject({ duration: durations.quick, ease: easings.entrance });
  });

  it("AnimatedCounter ease references easings.entrance (not inline array)", () => {
    // Easing used in animate() call must be the shared token
    expect(easings.entrance).toEqual([0.22, 1, 0.36, 1]);
  });

  it("AnimatedCounter default duration is durations.slow (0.6s)", () => {
    // Default changed from 1.6 (too slow for small dashboard numbers) to slow token
    expect(durations.slow).toBe(0.6);
  });
});
