import { describe, it, expect } from "vitest";
import { canUseDesignerArt, getTemplate, resolveStyle, isValidStyle } from "./designer-art";

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
  it("returns bold variant when requested", () => {
    const classic = getTemplate("birthday", "classic");
    const bold = getTemplate("birthday", "bold");
    expect(bold.background).not.toEqual(classic.background);
  });
  it("returns minimal variant when requested", () => {
    const classic = getTemplate("birthday", "classic");
    const minimal = getTemplate("birthday", "minimal");
    expect(minimal.background).not.toEqual(classic.background);
  });
  it("defaults to classic when style is omitted", () => {
    expect(getTemplate("birthday")).toEqual(getTemplate("birthday", "classic"));
  });
});

describe("resolveStyle", () => {
  it("returns classic for null", () => {
    expect(resolveStyle(null)).toBe("classic");
  });
  it("returns classic for undefined", () => {
    expect(resolveStyle(undefined)).toBe("classic");
  });
  it("returns classic for unknown string", () => {
    expect(resolveStyle("funky")).toBe("classic");
  });
  it("returns bold for 'bold'", () => {
    expect(resolveStyle("bold")).toBe("bold");
  });
  it("returns minimal for 'minimal'", () => {
    expect(resolveStyle("minimal")).toBe("minimal");
  });
  it("returns classic for 'classic'", () => {
    expect(resolveStyle("classic")).toBe("classic");
  });
});

describe("isValidStyle", () => {
  it("accepts known variants", () => {
    expect(isValidStyle("classic")).toBe(true);
    expect(isValidStyle("bold")).toBe(true);
    expect(isValidStyle("minimal")).toBe(true);
  });
  it("rejects unknown strings", () => {
    expect(isValidStyle("neon")).toBe(false);
    expect(isValidStyle("")).toBe(false);
    expect(isValidStyle(null)).toBe(false);
    expect(isValidStyle(undefined)).toBe(false);
  });
});
