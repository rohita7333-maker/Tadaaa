/// <reference types="jest" />
import {
  templates,
  getTemplate,
  templatesByOccasion,
  filterTemplates,
  allStyleTags,
  REVEAL_STYLE_LABELS,
  type PaletteTag,
} from "../templates";
import { themes, occasions, getThemeById } from "../themes";

const VALID_PALETTE_TAGS: PaletteTag[] = ["warm", "pastel", "dark", "cool"];

describe("templates data", () => {
  it("has exactly 12 templates", () => {
    expect(templates).toHaveLength(12);
  });

  it("has unique ids", () => {
    const ids = templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(templates.length);
  });

  it("every occasionId exists in occasions", () => {
    const occasionIds = new Set(occasions.map((o) => o.id));
    for (const template of templates) {
      expect(occasionIds.has(template.occasionId)).toBe(true);
    }
  });

  it("every themeId exists in themes", () => {
    const themeIds = new Set(themes.map((t) => t.id));
    for (const template of templates) {
      expect(themeIds.has(template.themeId)).toBe(true);
    }
  });

  it("tier matches the referenced theme's isPremium", () => {
    for (const template of templates) {
      const theme = getThemeById(template.themeId);
      expect(theme).toBeDefined();
      expect(template.tier).toBe(theme!.isPremium ? "premium" : "free");
    }
  });

  it("mixes reveal types (>=4 scroll_story, >=3 countdown, rest tap)", () => {
    const count = (reveal: string) =>
      templates.filter((t) => t.revealType === reveal).length;
    expect(count("scroll_story")).toBeGreaterThanOrEqual(4);
    expect(count("countdown")).toBeGreaterThanOrEqual(3);
    expect(count("tap")).toBe(
      templates.length - count("scroll_story") - count("countdown")
    );
  });

  it("every template has 1-3 non-empty style tags", () => {
    for (const template of templates) {
      expect(template.styleTags.length).toBeGreaterThan(0);
      expect(template.styleTags.length).toBeLessThanOrEqual(3);
      for (const tag of template.styleTags) {
        expect(tag.trim()).toBe(tag);
        expect(tag.length).toBeGreaterThan(0);
      }
    }
  });

  it("every template has a valid paletteTag", () => {
    for (const template of templates) {
      expect(VALID_PALETTE_TAGS).toContain(template.paletteTag);
    }
  });

  it("golden-hour reads as a birthday template, not a date-invite one", () => {
    const goldenHour = getTemplate("golden-hour");
    expect(goldenHour?.occasionId).toBe("birthday");
    expect(goldenHour?.tagline.toLowerCase()).toContain("birthday");
  });
});

describe("templatesByOccasion", () => {
  it('returns every template for "all"', () => {
    expect(templatesByOccasion("all")).toEqual(templates);
  });

  it("filters to a single occasion", () => {
    const birthday = templatesByOccasion("birthday");
    expect(birthday.length).toBeGreaterThan(0);
    for (const template of birthday) {
      expect(template.occasionId).toBe("birthday");
    }
  });

  it("returns [] for an unknown occasion", () => {
    expect(templatesByOccasion("graduation")).toEqual([]);
  });
});

describe("filterTemplates", () => {
  it("returns every template with no filters", () => {
    expect(filterTemplates()).toEqual(templates);
    expect(filterTemplates({})).toEqual(templates);
  });

  it("filters by occasion alone", () => {
    const result = filterTemplates({ occasionId: "birthday" });
    expect(result.length).toBeGreaterThan(0);
    for (const t of result) expect(t.occasionId).toBe("birthday");
  });

  it("filters by tier alone", () => {
    const result = filterTemplates({ tier: "free" });
    expect(result.length).toBeGreaterThan(0);
    for (const t of result) expect(t.tier).toBe("free");
  });

  it("filters by a single style tag", () => {
    const result = filterTemplates({ styleTags: ["moody"] });
    expect(result.length).toBeGreaterThan(0);
    for (const t of result) expect(t.styleTags).toContain("moody");
  });

  it("ORs multiple style tags together", () => {
    const result = filterTemplates({ styleTags: ["moody", "coastal"] });
    const ids = result.map((t) => t.id);
    expect(ids).toContain("after-dark");
    expect(ids).toContain("shoreline");
  });

  it("ANDs facets together (occasion + tier + style)", () => {
    const result = filterTemplates({
      occasionId: "birthday",
      tier: "premium",
      styleTags: ["neon"],
    });
    expect(result).toEqual([getTemplate("cake-o-clock")]);
  });

  it("returns [] when a facet combination matches nothing", () => {
    expect(
      filterTemplates({ occasionId: "birthday", styleTags: ["coastal"] })
    ).toEqual([]);
  });
});

describe("allStyleTags", () => {
  it("returns every style tag used across the catalog, deduped", () => {
    const tags = allStyleTags();
    expect(new Set(tags).size).toBe(tags.length);
    for (const template of templates) {
      for (const tag of template.styleTags) {
        expect(tags).toContain(tag);
      }
    }
  });
});

describe("getTemplate", () => {
  it("round-trips every template by id", () => {
    for (const template of templates) {
      expect(getTemplate(template.id)).toBe(template);
    }
  });

  it("returns undefined for an unknown id", () => {
    expect(getTemplate("does-not-exist")).toBeUndefined();
  });
});

describe("REVEAL_STYLE_LABELS", () => {
  it("labels every reveal style", () => {
    expect(REVEAL_STYLE_LABELS).toEqual({
      tap: "Tap reveal",
      countdown: "Countdown",
      scroll_story: "Scroll story",
    });
  });
});
