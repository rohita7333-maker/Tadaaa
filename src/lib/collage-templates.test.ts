import { describe, it, expect } from "vitest";
import {
  getCollageTemplate,
  getCollageTemplatesForCount,
  pickCollageTemplateForCount,
  COLLAGE_TEMPLATES,
} from "./collage-templates";

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

  it("polaroid-scrapbook has exactly 8 photo slots", () => {
    const t = getCollageTemplate("polaroid-scrapbook")!;
    const photoSlots = t.slots.filter((s) => !s.caption);
    expect(photoSlots).toHaveLength(8);
  });

  it("heroSlotIndex is a valid slot index", () => {
    const t = getCollageTemplate("polaroid-scrapbook")!;
    const heroIdx = t.heroSlotIndex ?? 0;
    expect(heroIdx).toBeGreaterThanOrEqual(0);
    expect(heroIdx).toBeLessThan(t.slots.length);
  });

  it("COLLAGE_TEMPLATES contains polaroid-scrapbook", () => {
    expect("polaroid-scrapbook" in COLLAGE_TEMPLATES).toBe(true);
  });
});

describe("template data integrity (all templates)", () => {
  const all = Object.values(COLLAGE_TEMPLATES);

  it("has at least one template", () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it("every template id matches its registry key", () => {
    for (const [key, t] of Object.entries(COLLAGE_TEMPLATES)) {
      expect(t.id).toBe(key);
    }
  });

  it("every slot percentage is within 0..100", () => {
    for (const t of all) {
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
    }
  });

  it("no slot overflows the canvas (x+w <= 100, y+h <= 100)", () => {
    for (const t of all) {
      for (const slot of t.slots) {
        expect(slot.xPct + slot.wPct).toBeLessThanOrEqual(100.001);
        expect(slot.yPct + slot.hPct).toBeLessThanOrEqual(100.001);
      }
    }
  });

  it("photoCount equals the number of non-caption slots", () => {
    for (const t of all) {
      const photoSlots = t.slots.filter((s) => !s.caption);
      expect(photoSlots.length).toBe(t.photoCount);
    }
  });

  it("every template has a positive photoCount and canvas size", () => {
    for (const t of all) {
      expect(t.photoCount).toBeGreaterThan(0);
      expect(t.width).toBeGreaterThan(0);
      expect(t.height).toBeGreaterThan(0);
    }
  });
});

describe("getCollageTemplatesForCount", () => {
  it("returns only templates whose photoCount matches", () => {
    for (let n = 1; n <= 9; n++) {
      const list = getCollageTemplatesForCount(n);
      for (const t of list) {
        expect(t.photoCount).toBe(n);
      }
    }
  });

  it("covers every photo count 1..9 with at least one template", () => {
    for (let n = 1; n <= 9; n++) {
      expect(getCollageTemplatesForCount(n).length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for counts with no template", () => {
    expect(getCollageTemplatesForCount(0)).toEqual([]);
    expect(getCollageTemplatesForCount(99)).toEqual([]);
  });
});

describe("pickCollageTemplateForCount", () => {
  it("returns a template whose photoCount matches the requested count", () => {
    for (let n = 1; n <= 9; n++) {
      const t = pickCollageTemplateForCount(n);
      expect(t).not.toBeNull();
      expect(t!.photoCount).toBe(n);
    }
  });

  it("returns null for a count with no templates", () => {
    expect(pickCollageTemplateForCount(0)).toBeNull();
    expect(pickCollageTemplateForCount(50)).toBeNull();
  });

  it("uses the injected rng to select deterministically", () => {
    const list = getCollageTemplatesForCount(2);
    // rng returning 0 → first template; rng near 1 → last template
    const first = pickCollageTemplateForCount(2, () => 0);
    const last = pickCollageTemplateForCount(2, () => 0.999999);
    expect(first!.id).toBe(list[0].id);
    expect(last!.id).toBe(list[list.length - 1].id);
  });
});
