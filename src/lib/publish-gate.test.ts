import { describe, it, expect } from "vitest";
import { canPublishTheme } from "./publish-gate";

describe("canPublishTheme", () => {
  it("allows a free theme on the free tier", () => {
    expect(
      canPublishTheme({ isPremium: false, sessionUnlocked: false, tier: "free" })
    ).toEqual({ allowed: true });
  });

  it("blocks a premium theme on the free tier with a reason", () => {
    const result = canPublishTheme({
      isPremium: true,
      sessionUnlocked: false,
      tier: "free",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("allows a premium theme unlocked in this session on the free tier", () => {
    expect(
      canPublishTheme({ isPremium: true, sessionUnlocked: true, tier: "free" })
    ).toEqual({ allowed: true });
  });

  it("allows a premium theme on the plus tier", () => {
    expect(
      canPublishTheme({ isPremium: true, sessionUnlocked: false, tier: "plus" })
    ).toEqual({ allowed: true });
  });

  it("allows a premium theme on the unlimited tier", () => {
    expect(
      canPublishTheme({
        isPremium: true,
        sessionUnlocked: false,
        tier: "unlimited",
      })
    ).toEqual({ allowed: true });
  });

  it("treats an unknown tier string as free", () => {
    expect(
      canPublishTheme({ isPremium: true, sessionUnlocked: false, tier: "gold" })
        .allowed
    ).toBe(false);
  });
});
