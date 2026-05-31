import { describe, it, expect } from "vitest";
import { canUseDesignerArt, getTemplate } from "./designer-art";

describe("canUseDesignerArt", () => {
  it("blocks free tier", () => {
    expect(canUseDesignerArt("free")).toBe(false);
  });
  it("allows plus and unlimited", () => {
    expect(canUseDesignerArt("plus")).toBe(true);
    expect(canUseDesignerArt("unlimited")).toBe(true);
  });
});

describe("getTemplate", () => {
  it("returns a template for a known occasion", () => {
    const t = getTemplate("birthday");
    expect(t.label).toBeTruthy();
    expect(t.background).toContain("gradient");
  });
  it("falls back to custom for unknown occasion", () => {
    expect(getTemplate("not_real")).toEqual(getTemplate("custom"));
  });
  it("falls back to custom for null", () => {
    expect(getTemplate(null)).toEqual(getTemplate("custom"));
  });
});
