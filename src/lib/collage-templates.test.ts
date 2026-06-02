import { describe, it, expect } from "vitest";
import { getCollageTemplate, COLLAGE_TEMPLATES } from "./collage-templates";

describe("getCollageTemplate", () => {
  it("returns null for null input", () => {
    expect(getCollageTemplate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getCollageTemplate(undefined)).toBeNull();
  });

  it("returns null for unknown id", () => {
    expect(getCollageTemplate("does-not-exist")).toBeNull();
  });

  it("returns template for polaroid-scrapbook", () => {
    const t = getCollageTemplate("polaroid-scrapbook");
    expect(t).not.toBeNull();
    expect(t!.id).toBe("polaroid-scrapbook");
  });

  it("polaroid-scrapbook has exactly 8 slots", () => {
    const t = getCollageTemplate("polaroid-scrapbook")!;
    expect(t.slots).toHaveLength(8);
  });

  it("heroSlotIndex is a valid slot index", () => {
    const t = getCollageTemplate("polaroid-scrapbook")!;
    const heroIdx = t.heroSlotIndex ?? 0;
    expect(heroIdx).toBeGreaterThanOrEqual(0);
    expect(heroIdx).toBeLessThan(t.slots.length);
  });

  it("all slot percentages are in 0..100", () => {
    const t = getCollageTemplate("polaroid-scrapbook")!;
    for (const slot of t.slots) {
      expect(slot.xPct).toBeGreaterThanOrEqual(0);
      expect(slot.xPct).toBeLessThanOrEqual(100);
      expect(slot.yPct).toBeGreaterThanOrEqual(0);
      expect(slot.yPct).toBeLessThanOrEqual(100);
      expect(slot.wPct).toBeGreaterThanOrEqual(0);
      expect(slot.wPct).toBeLessThanOrEqual(100);
      expect(slot.hPct).toBeGreaterThanOrEqual(0);
      expect(slot.hPct).toBeLessThanOrEqual(100);
    }
  });

  it("COLLAGE_TEMPLATES contains polaroid-scrapbook", () => {
    expect("polaroid-scrapbook" in COLLAGE_TEMPLATES).toBe(true);
  });
});
