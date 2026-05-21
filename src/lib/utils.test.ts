import { describe, expect, it } from "vitest";
import {
  generateInviteSlug,
  formatViewCount,
  truncate,
  isExpired,
  isCountdownComplete,
} from "./utils";

describe("generateInviteSlug", () => {
  it("prefixes with the theme id", () => {
    const slug = generateInviteSlug("warm-embrace");
    expect(slug.startsWith("warm-embrace-")).toBe(true);
  });

  it("is lowercase", () => {
    const slug = generateInviteSlug("warm-embrace");
    expect(slug).toBe(slug.toLowerCase());
  });

  it("produces collision-resistant suffixes", () => {
    const slugs = new Set(Array.from({ length: 200 }, () => generateInviteSlug("t")));
    expect(slugs.size).toBe(200);
  });
});

describe("formatViewCount", () => {
  it("formats < 1000 as raw", () => {
    expect(formatViewCount(0)).toBe("0");
    expect(formatViewCount(999)).toBe("999");
  });

  it("formats >= 1000 with k suffix", () => {
    expect(formatViewCount(1000)).toBe("1.0k");
    expect(formatViewCount(2500)).toBe("2.5k");
  });
});

describe("truncate", () => {
  it("returns input unchanged when under length", () => {
    expect(truncate("hi", 10)).toBe("hi");
  });

  it("truncates with ellipsis when over length", () => {
    expect(truncate("hello world", 5)).toBe("hello…");
  });
});

describe("isExpired", () => {
  it("returns false for null/undefined", () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
  });

  it("returns true for past dates", () => {
    expect(isExpired("2000-01-01T00:00:00Z")).toBe(true);
  });

  it("returns false for future dates", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isExpired(future)).toBe(false);
  });
});

describe("isCountdownComplete", () => {
  it("returns true when no date set", () => {
    expect(isCountdownComplete(null)).toBe(true);
    expect(isCountdownComplete(undefined)).toBe(true);
  });

  it("returns false for future dates", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isCountdownComplete(future)).toBe(false);
  });

  it("returns true for past dates", () => {
    expect(isCountdownComplete("2000-01-01T00:00:00Z")).toBe(true);
  });
});
