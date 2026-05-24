import { describe, expect, it, beforeAll } from "vitest";
import { unsubscribeUrl, verifyUnsubscribe } from "./unsubscribe";

beforeAll(() => {
  process.env.CRON_SECRET = "test-secret-do-not-use-in-prod";
});

function paramsFromUrl(raw: string) {
  const u = new URL(raw);
  return {
    userId: u.searchParams.get("u")!,
    list:   u.searchParams.get("k")!,
    token:  u.searchParams.get("t")!,
    day:    u.searchParams.get("d")!,
  };
}

describe("unsubscribe token", () => {
  it("verifies a freshly minted token", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const { userId, list, token, day } = paramsFromUrl(url);
    expect(verifyUnsubscribe(userId, list, token, day)).toBe(true);
  });

  it("rejects tampered token", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const { day, token } = paramsFromUrl(url);
    const tampered = token.slice(0, -1) + (token.slice(-1) === "a" ? "b" : "a");
    expect(verifyUnsubscribe("user-1", "monthly", tampered, day)).toBe(false);
  });

  it("rejects token issued for a different list", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const { token, day } = paramsFromUrl(url);
    expect(verifyUnsubscribe("user-1", "view", token, day)).toBe(false);
  });

  it("rejects token issued for a different user", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const { token, day } = paramsFromUrl(url);
    expect(verifyUnsubscribe("user-2", "monthly", token, day)).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(verifyUnsubscribe("", "", "", "")).toBe(false);
  });

  it("rejects token with missing day param", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const { userId, list, token } = paramsFromUrl(url);
    expect(verifyUnsubscribe(userId, list, token, "")).toBe(false);
  });

  it("rejects expired token (> 90 days old)", () => {
    const staleDay = String(Math.floor(Date.now() / 86_400_000) - 91);
    expect(verifyUnsubscribe("user-1", "monthly", "anytoken", staleDay)).toBe(false);
  });
});
