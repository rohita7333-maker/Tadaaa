import { describe, it, expect } from "vitest";
import {
  easings,
  cssEasings,
  durations,
  springs,
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
  it("has 5 named steps", () => {
    expect(Object.keys(durations)).toHaveLength(5);
  });
  it("instant is 0.12", () => expect(durations.instant).toBe(0.12));
  it("quick is 0.2", () => expect(durations.quick).toBe(0.2));
  it("base is 0.35", () => expect(durations.base).toBe(0.35));
  it("slow is 0.6", () => expect(durations.slow).toBe(0.6));
  it("cinematic is 0.9", () => expect(durations.cinematic).toBe(0.9));
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

describe("getReducedMotionTransition (re-export)", () => {
  it("is re-exported from motion.ts", () => {
    expect(typeof getReducedMotionTransition).toBe("function");
  });
  it("defaults reduced to duration:0", () => {
    const t = getReducedMotionTransition(true, { duration: 0.5 });
    expect(t).toMatchObject({ duration: 0 });
  });
});
