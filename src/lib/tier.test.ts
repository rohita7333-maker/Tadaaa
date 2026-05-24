import { describe, it, expect } from "vitest";
import {
  getActiveTier,
  canCreateInvite,
  canUsePremiumTheme,
  canGenerateVideo,
  getSignedUrlExpiry,
  monthlyInviteLimit,
} from "./tier";

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();

describe("getActiveTier", () => {
  it("returns free when profile is null", () => {
    expect(getActiveTier(null)).toBe("free");
  });

  it("returns free when tier is null", () => {
    expect(getActiveTier({ subscription_tier: null, subscription_expires_at: null })).toBe("free");
  });

  it("returns unlimited when tier is unlimited and no expiry", () => {
    expect(getActiveTier({ subscription_tier: "unlimited", subscription_expires_at: null })).toBe("unlimited");
  });

  it("returns unlimited when tier is unlimited and expiry is in future", () => {
    expect(getActiveTier({ subscription_tier: "unlimited", subscription_expires_at: FUTURE })).toBe("unlimited");
  });

  it("returns free when unlimited but expiry is in past", () => {
    expect(getActiveTier({ subscription_tier: "unlimited", subscription_expires_at: PAST })).toBe("free");
  });

  it("returns plus when tier is plus and no expiry", () => {
    expect(getActiveTier({ subscription_tier: "plus", subscription_expires_at: null })).toBe("plus");
  });

  it("returns free when plus but expiry is in past", () => {
    expect(getActiveTier({ subscription_tier: "plus", subscription_expires_at: PAST })).toBe("free");
  });

  it("returns free for unknown tier string", () => {
    expect(getActiveTier({ subscription_tier: "legacy", subscription_expires_at: null })).toBe("free");
  });
});

describe("canCreateInvite", () => {
  it("free tier allows invite when under monthly limit", () => {
    expect(canCreateInvite("free", 1).allowed).toBe(true);
  });

  it("free tier blocks invite at monthly limit", () => {
    const result = canCreateInvite("free", 2);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("limit");
  });

  it("free tier blocks invite over monthly limit", () => {
    expect(canCreateInvite("free", 5).allowed).toBe(false);
  });

  it("plus tier always allows invite creation", () => {
    expect(canCreateInvite("plus", 0).allowed).toBe(true);
    expect(canCreateInvite("plus", 100).allowed).toBe(true);
  });

  it("unlimited tier always allows invite creation", () => {
    expect(canCreateInvite("unlimited", 0).allowed).toBe(true);
    expect(canCreateInvite("unlimited", 999).allowed).toBe(true);
  });
});

describe("canUsePremiumTheme", () => {
  it("free user with unpaid invite cannot use premium theme", () => {
    expect(canUsePremiumTheme("free", false)).toBe(false);
  });

  it("free user with paid invite can use premium theme", () => {
    expect(canUsePremiumTheme("free", true)).toBe(true);
  });

  it("plus user can always use premium theme", () => {
    expect(canUsePremiumTheme("plus", false)).toBe(true);
    expect(canUsePremiumTheme("plus", true)).toBe(true);
  });

  it("unlimited user can always use premium theme", () => {
    expect(canUsePremiumTheme("unlimited", false)).toBe(true);
  });
});

describe("canGenerateVideo", () => {
  it("free user with unpaid invite cannot generate video", () => {
    expect(canGenerateVideo("free", false)).toBe(false);
  });

  it("free user with paid invite can generate video", () => {
    expect(canGenerateVideo("free", true)).toBe(true);
  });

  it("plus user can generate video", () => {
    expect(canGenerateVideo("plus", false)).toBe(true);
  });

  it("unlimited user can generate video", () => {
    expect(canGenerateVideo("unlimited", false)).toBe(true);
  });
});

describe("getSignedUrlExpiry", () => {
  it("free tier gets 7-day expiry", () => {
    expect(getSignedUrlExpiry("free")).toBe(60 * 60 * 24 * 7);
  });

  it("plus tier gets 30-day expiry", () => {
    expect(getSignedUrlExpiry("plus")).toBe(60 * 60 * 24 * 30);
  });

  it("unlimited tier gets 30-day expiry", () => {
    expect(getSignedUrlExpiry("unlimited")).toBe(60 * 60 * 24 * 30);
  });
});

describe("monthlyInviteLimit", () => {
  it("free tier has a limit of 2", () => {
    expect(monthlyInviteLimit("free")).toBe(2);
  });

  it("plus tier has no limit", () => {
    expect(monthlyInviteLimit("plus")).toBeNull();
  });

  it("unlimited tier has no limit", () => {
    expect(monthlyInviteLimit("unlimited")).toBeNull();
  });
});
