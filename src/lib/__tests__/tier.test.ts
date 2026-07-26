/// <reference types="jest" />
import {
  getActiveTier,
  canCreateInvite,
  canUsePremiumTheme,
  monthlyInviteLimit,
} from "../tier";
import { FREE_INVITE_MONTHLY_LIMIT } from "../constants";

describe("getActiveTier", () => {
  it("defaults to free when no tier", () => {
    expect(getActiveTier(null)).toBe("free");
    expect(getActiveTier({ subscription_tier: null, subscription_expires_at: null })).toBe("free");
  });

  it("returns plus/unlimited when active", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(getActiveTier({ subscription_tier: "plus", subscription_expires_at: future })).toBe("plus");
    expect(getActiveTier({ subscription_tier: "unlimited", subscription_expires_at: null })).toBe("unlimited");
  });

  it("downgrades to free when expired", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(getActiveTier({ subscription_tier: "plus", subscription_expires_at: past })).toBe("free");
  });

  it("rejects unknown tier strings", () => {
    expect(getActiveTier({ subscription_tier: "hacker", subscription_expires_at: null })).toBe("free");
  });
});

describe("canCreateInvite", () => {
  it("blocks free users at the monthly limit", () => {
    const res = canCreateInvite("free", FREE_INVITE_MONTHLY_LIMIT);
    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/free plan limit/i);
  });
  it("allows free users under the limit", () => {
    expect(canCreateInvite("free", FREE_INVITE_MONTHLY_LIMIT - 1).allowed).toBe(true);
  });
  it("always allows paid tiers", () => {
    expect(canCreateInvite("plus", 999).allowed).toBe(true);
    expect(canCreateInvite("unlimited", 999).allowed).toBe(true);
  });
});

describe("premium theme gating", () => {
  it("free users need the theme purchased", () => {
    expect(canUsePremiumTheme("free", false)).toBe(false);
    expect(canUsePremiumTheme("free", true)).toBe(true);
  });
  it("paid tiers unlock all themes", () => {
    expect(canUsePremiumTheme("plus", false)).toBe(true);
    expect(canUsePremiumTheme("unlimited", false)).toBe(true);
  });
});

describe("monthlyInviteLimit", () => {
  it("is finite for free, unlimited for paid", () => {
    expect(monthlyInviteLimit("free")).toBe(FREE_INVITE_MONTHLY_LIMIT);
    expect(monthlyInviteLimit("plus")).toBeNull();
    expect(monthlyInviteLimit("unlimited")).toBeNull();
  });
});
