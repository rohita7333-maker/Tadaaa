import { describe, expect, it } from "vitest";
import { getReducedMotionTransition } from "./a11y";

/**
 * getReducedMotionTransition is a pure function (not a React hook) so it
 * can be tested without renderHook or jsdom. The caller passes the result
 * of framer-motion's useReducedMotion() as the first argument.
 */
describe("getReducedMotionTransition", () => {
  const normal = { duration: 0.6, ease: "easeOut" };
  const reduced = { duration: 0, type: "tween" };

  it("returns the normal transition when reduced-motion is not preferred (false)", () => {
    const result = getReducedMotionTransition(false, normal);
    expect(result).toEqual(normal);
  });

  it("returns { duration: 0 } by default when reduced-motion is preferred", () => {
    const result = getReducedMotionTransition(true, normal);
    expect(result).toEqual({ duration: 0 });
  });

  it("returns the custom reduced transition when provided and reduced-motion is preferred", () => {
    const result = getReducedMotionTransition(true, normal, reduced);
    expect(result).toEqual(reduced);
  });

  it("returns the normal transition when useReducedMotion returns null (preference unknown)", () => {
    // null means the browser hasn't resolved the media query — fall back to normal.
    const result = getReducedMotionTransition(null, normal);
    expect(result).toEqual(normal);
  });

  it("returns the normal transition when shouldReduce is undefined", () => {
    const result = getReducedMotionTransition(undefined, normal);
    expect(result).toEqual(normal);
  });

  it("the reduced default is { duration: 0 } — exactly zero, not a fraction", () => {
    const result = getReducedMotionTransition(true, { duration: 0.5 }) as { duration: number };
    expect(result.duration).toBe(0);
  });
});
