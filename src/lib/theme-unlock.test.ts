import { describe, it, expect } from "vitest";
import { verifyThemeUnlockSession } from "./theme-unlock";

const EXPECT = { userId: "user-1", themeId: "midnight-bloom" };

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    payment_status: "paid",
    metadata: {
      theme_id: "midnight-bloom",
      user_id: "user-1",
      subscription_type: "plus",
    },
    ...overrides,
  };
}

describe("verifyThemeUnlockSession", () => {
  it("accepts a paid plus session matching user and theme", () => {
    expect(verifyThemeUnlockSession(makeSession(), EXPECT)).toEqual({ valid: true });
  });

  it("rejects a session that is not paid", () => {
    const result = verifyThemeUnlockSession(
      makeSession({ payment_status: "unpaid" }),
      EXPECT
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/payment/i);
  });

  it("rejects a session for a different purchase type", () => {
    const result = verifyThemeUnlockSession(
      makeSession({
        metadata: { theme_id: "midnight-bloom", user_id: "user-1", subscription_type: "gift" },
      }),
      EXPECT
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/purchase/i);
  });

  it("rejects a session paid for by another user", () => {
    const result = verifyThemeUnlockSession(
      makeSession({
        metadata: { theme_id: "midnight-bloom", user_id: "user-2", subscription_type: "plus" },
      }),
      EXPECT
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/another account/i);
  });

  it("rejects a session paid for a different theme", () => {
    const result = verifyThemeUnlockSession(
      makeSession({
        metadata: { theme_id: "other-theme", user_id: "user-1", subscription_type: "plus" },
      }),
      EXPECT
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/different theme/i);
  });

  it("rejects a session with no metadata", () => {
    const result = verifyThemeUnlockSession(makeSession({ metadata: null }), EXPECT);
    expect(result.valid).toBe(false);
  });

  it("rejects a null session", () => {
    const result = verifyThemeUnlockSession(null, EXPECT);
    expect(result.valid).toBe(false);
  });
});
