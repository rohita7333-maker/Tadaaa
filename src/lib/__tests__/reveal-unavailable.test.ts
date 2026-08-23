import { classifyReveal, REVEAL_UNAVAILABLE_COPY } from "../reveal-unavailable";

/**
 * Web branches three ways before rendering a reveal. Mobile collapsed all three
 * into one wrong message, so a guest with a deleted link was told the creator
 * had closed it. These pin the branch order and the copy.
 */
describe("classifyReveal", () => {
  it("reports a missing row as missing", () => {
    expect(classifyReveal(null)).toBe("missing");
  });

  it("reports a deactivated invite as inactive", () => {
    expect(classifyReveal({ is_active: false, expires_at: null })).toBe("inactive");
  });

  it("prefers inactive over expired, matching web's branch order", () => {
    const longPast = new Date(Date.now() - 86_400_000).toISOString();
    expect(classifyReveal({ is_active: false, expires_at: longPast })).toBe("inactive");
  });

  it("reports a past expires_at on a live invite as expired", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(classifyReveal({ is_active: true, expires_at: yesterday })).toBe("expired");
  });

  it("treats a future expiry on a live invite as still usable", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(classifyReveal({ is_active: true, expires_at: tomorrow })).toBe("missing");
  });

  it("treats a null is_active as inactive rather than showing the reveal", () => {
    expect(classifyReveal({ is_active: null, expires_at: null })).toBe("inactive");
  });
});

describe("REVEAL_UNAVAILABLE_COPY", () => {
  it("carries web's wording for each branch", () => {
    expect(REVEAL_UNAVAILABLE_COPY.missing.heading).toBe("This surprise doesn't exist");
    expect(REVEAL_UNAVAILABLE_COPY.inactive.heading).toBe("This surprise is no longer available");
    expect(REVEAL_UNAVAILABLE_COPY.expired.heading).toBe("This surprise has expired");
  });

  it("offers a CTA on exactly the two branches web offers one", () => {
    expect(REVEAL_UNAVAILABLE_COPY.missing.cta).toBe("Create your own surprise");
    expect(REVEAL_UNAVAILABLE_COPY.expired.cta).toBe("Create a new surprise");
    expect(REVEAL_UNAVAILABLE_COPY.inactive.cta).toBeNull();
  });

  it("never reuses the retired single-state message", () => {
    for (const entry of Object.values(REVEAL_UNAVAILABLE_COPY)) {
      expect(entry.heading).not.toBe("This surprise has closed");
    }
  });
});
