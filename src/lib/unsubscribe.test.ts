import { describe, expect, it, beforeAll } from "vitest";
import { unsubscribeUrl, verifyUnsubscribe } from "./unsubscribe";

beforeAll(() => {
  process.env.CRON_SECRET = "test-secret-do-not-use-in-prod";
});

describe("unsubscribe token", () => {
  it("verifies a freshly minted token", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const u = new URL(url);
    const userId = u.searchParams.get("u")!;
    const list = u.searchParams.get("k")!;
    const token = u.searchParams.get("t")!;
    expect(verifyUnsubscribe(userId, list, token)).toBe(true);
  });

  it("rejects tampered token", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const u = new URL(url);
    const token = u.searchParams.get("t")!;
    const tampered = token.slice(0, -1) + (token.slice(-1) === "a" ? "b" : "a");
    expect(verifyUnsubscribe("user-1", "monthly", tampered)).toBe(false);
  });

  it("rejects token issued for a different list", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const u = new URL(url);
    const token = u.searchParams.get("t")!;
    expect(verifyUnsubscribe("user-1", "view", token)).toBe(false);
  });

  it("rejects token issued for a different user", () => {
    const url = unsubscribeUrl("https://example.com", "user-1", "monthly");
    const u = new URL(url);
    const token = u.searchParams.get("t")!;
    expect(verifyUnsubscribe("user-2", "monthly", token)).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(verifyUnsubscribe("", "", "")).toBe(false);
  });
});
