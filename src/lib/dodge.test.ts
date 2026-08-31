import { describe, it, expect } from "vitest";
import {
  UNLIMITED_DODGES,
  DEFAULT_DODGE_LIMIT,
  MAX_DODGE_LIMIT,
  normalizeDodgeLimit,
  isDodgeFrozen,
  dodgeHint,
} from "./dodge";

describe("normalizeDodgeLimit", () => {
  it("keeps a plain count", () => {
    expect(normalizeDodgeLimit(3)).toBe(3);
    expect(normalizeDodgeLimit(1)).toBe(1);
  });

  it("keeps 0 — the No button never runs away", () => {
    expect(normalizeDodgeLimit(0)).toBe(0);
  });

  it("keeps the unlimited sentinel", () => {
    expect(normalizeDodgeLimit(UNLIMITED_DODGES)).toBe(UNLIMITED_DODGES);
  });

  it("falls back to the default for null or undefined", () => {
    expect(normalizeDodgeLimit(null)).toBe(DEFAULT_DODGE_LIMIT);
    expect(normalizeDodgeLimit(undefined)).toBe(DEFAULT_DODGE_LIMIT);
  });

  it("falls back to the default for junk", () => {
    expect(normalizeDodgeLimit("lots" as unknown)).toBe(DEFAULT_DODGE_LIMIT);
    expect(normalizeDodgeLimit(NaN)).toBe(DEFAULT_DODGE_LIMIT);
  });

  it("clamps an absurd count so one invite cannot hang the reveal", () => {
    expect(normalizeDodgeLimit(9999)).toBe(MAX_DODGE_LIMIT);
  });

  it("treats any other negative as unlimited rather than nonsense", () => {
    expect(normalizeDodgeLimit(-7)).toBe(UNLIMITED_DODGES);
  });

  it("floors a fractional count", () => {
    expect(normalizeDodgeLimit(3.8)).toBe(3);
  });
});

describe("isDodgeFrozen", () => {
  it("is frozen from the start when dodging is off", () => {
    expect(isDodgeFrozen(0, 0)).toBe(true);
  });

  it("freezes once the count is reached", () => {
    expect(isDodgeFrozen(3, 2)).toBe(false);
    expect(isDodgeFrozen(3, 3)).toBe(true);
    expect(isDodgeFrozen(3, 4)).toBe(true);
  });

  it("never freezes when unlimited", () => {
    expect(isDodgeFrozen(UNLIMITED_DODGES, 0)).toBe(false);
    expect(isDodgeFrozen(UNLIMITED_DODGES, 500)).toBe(false);
  });
});

describe("dodgeHint", () => {
  it("invites the first click before anything has happened", () => {
    expect(dodgeHint(3, 0, "Nope")).toContain("Nope");
  });

  it("counts down the remaining dodges", () => {
    expect(dodgeHint(5, 2, "No")).toContain("3 left");
  });

  it("never leaks a countdown in unlimited mode", () => {
    const hint = dodgeHint(UNLIMITED_DODGES, 12, "No");
    expect(hint).not.toMatch(/\d+\s*left/);
    expect(hint).toBeTruthy();
  });

  it("says it gave up once frozen", () => {
    expect(dodgeHint(3, 3, "No")).toMatch(/still/i);
  });

  it("shows nothing at all when dodging is switched off", () => {
    expect(dodgeHint(0, 0, "No")).toBeNull();
  });
});
