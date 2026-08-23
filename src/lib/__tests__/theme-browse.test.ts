import {
  THEME_FILTERS,
  browseThemes,
  resultCountLabel,
  themePriceLabel,
} from "../theme-browse";
import { templates } from "../templates";

describe("THEME_FILTERS", () => {
  it("opens with All and ends with the two price facets — frame B3's chip row", () => {
    expect(THEME_FILTERS[0]).toEqual({ id: "all", label: "All" });
    const tail = THEME_FILTERS.slice(-2).map((f) => f.label);
    expect(tail).toEqual(["Free", "Premium"]);
  });

  it("offers an occasion chip for every occasion that has at least one theme", () => {
    const occasionChips = THEME_FILTERS.filter(
      (f) => f.id !== "all" && f.id !== "free" && f.id !== "premium"
    );
    for (const chip of occasionChips) {
      expect(browseThemes({ query: "", filter: chip.id }).length).toBeGreaterThan(0);
    }
  });

  it("does not offer a chip that would always show an empty grid", () => {
    // A dead filter chip is worse than a missing one: it reads as a broken
    // screen rather than a narrower catalogue.
    for (const chip of THEME_FILTERS) {
      expect({ chip: chip.id, count: browseThemes({ query: "", filter: chip.id }).length })
        .not.toEqual({ chip: chip.id, count: 0 });
    }
  });
});

describe("browseThemes", () => {
  it("returns everything with no query and the All filter", () => {
    expect(browseThemes({ query: "", filter: "all" })).toHaveLength(templates.length);
  });

  it("filters to free and to premium, and the two partition the catalogue", () => {
    const free = browseThemes({ query: "", filter: "free" });
    const premium = browseThemes({ query: "", filter: "premium" });
    expect(free.every((t) => t.tier === "free")).toBe(true);
    expect(premium.every((t) => t.tier === "premium")).toBe(true);
    expect(free.length + premium.length).toBe(templates.length);
  });

  it("matches a theme name case-insensitively", () => {
    const hit = browseThemes({ query: "golden", filter: "all" });
    expect(hit.map((t) => t.id)).toContain("golden-hour");
    expect(browseThemes({ query: "GOLDEN HOUR", filter: "all" }).map((t) => t.id)).toContain(
      "golden-hour"
    );
  });

  it("searches occasions too — the placeholder promises themes AND occasions", () => {
    const byOccasion = browseThemes({ query: "birthday", filter: "all" });
    expect(byOccasion.length).toBeGreaterThan(0);
    expect(byOccasion.every((t) => t.occasionId === "birthday")).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(browseThemes({ query: "   golden   ", filter: "all" }).map((t) => t.id)).toContain(
      "golden-hour"
    );
  });

  it("combines a query with a filter rather than letting either win", () => {
    const all = browseThemes({ query: "birthday", filter: "all" });
    const free = browseThemes({ query: "birthday", filter: "free" });
    expect(free.length).toBeLessThanOrEqual(all.length);
    expect(free.every((t) => t.tier === "free")).toBe(true);
  });

  it("returns an empty list for a query nothing matches", () => {
    expect(browseThemes({ query: "zzzznothing", filter: "all" })).toEqual([]);
  });
});

describe("resultCountLabel", () => {
  it("reads as the frame's count line", () => {
    expect(resultCountLabel(32)).toBe("32 themes");
  });

  it("singularises one", () => {
    expect(resultCountLabel(1)).toBe("1 theme");
  });

  it("says nothing matched instead of 0 themes", () => {
    expect(resultCountLabel(0)).toBe("Nothing matches that yet");
  });
});

describe("themePriceLabel", () => {
  it("prints Free or the price, per the frame", () => {
    expect(themePriceLabel("free", 0)).toBe("Free");
    expect(themePriceLabel("premium", 4.99)).toBe("$4.99");
  });

  it("still prints a price for a premium theme whose price is missing", () => {
    // `price` is app-layer data; a zero on a premium row must not read "Free"
    // next to a PREMIUM badge.
    expect(themePriceLabel("premium", 0)).toBe("Premium");
  });
});
