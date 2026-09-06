import { describe, it, expect } from "vitest";
import { contrastRatio, readableTextOn, INK, PAPER_WHITE } from "./contrast";

describe("contrastRatio", () => {
  it("gives 21 for black on white", () => {
    expect(Math.round(contrastRatio("#000000", "#FFFFFF"))).toBe(21);
  });

  it("gives 1 for a colour against itself", () => {
    expect(contrastRatio("#3E6B5C", "#3E6B5C")).toBeCloseTo(1, 2);
  });

  it("is order independent", () => {
    expect(contrastRatio("#B6802A", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#B6802A"), 5);
  });

  it("accepts shorthand hex", () => {
    expect(Math.round(contrastRatio("#000", "#fff"))).toBe(21);
  });
});

describe("readableTextOn", () => {
  it("picks ink on the mid-tone gold that failed the audit", () => {
    // rgb(182,128,42) with white text measured 3.44:1 in the browser — a fail.
    expect(readableTextOn("#B6802A")).toBe(INK);
    expect(contrastRatio(readableTextOn("#B6802A"), "#B6802A")).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps white on deep pine, where white already wins", () => {
    expect(readableTextOn("#3E6B5C")).toBe(PAPER_WHITE);
  });

  it("picks ink on very light accents", () => {
    expect(readableTextOn("#FFE9C2")).toBe(INK);
  });

  it("picks white on near-black accents", () => {
    expect(readableTextOn("#101010")).toBe(PAPER_WHITE);
  });

  it("always returns whichever side has more contrast", () => {
    for (const accent of ["#B6802A", "#3E6B5C", "#E88891", "#7A3550", "#FFD8CC", "#2E5145"]) {
      const chosen = readableTextOn(accent);
      const other = chosen === INK ? PAPER_WHITE : INK;
      expect(contrastRatio(chosen, accent)).toBeGreaterThanOrEqual(contrastRatio(other, accent));
    }
  });

  it("falls back to ink for an unparseable colour instead of throwing", () => {
    expect(readableTextOn("not-a-colour")).toBe(INK);
  });
});
