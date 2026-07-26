/// <reference types="jest" />
import { themes, occasions, getThemeById, getOccasionById, gradientStops } from "../themes";

describe("theme registry", () => {
  it("has the 3 free themes and premium set matching the web app", () => {
    const free = themes.filter((t) => !t.isPremium).map((t) => t.id);
    expect(free).toEqual(["warm-embrace", "golden-hour", "midnight-romance"]);
    expect(themes.length).toBe(14);
  });

  it("every premium theme is priced 4.99", () => {
    themes.filter((t) => t.isPremium).forEach((t) => expect(t.price).toBe(4.99));
  });

  it("getThemeById resolves + returns undefined for unknown", () => {
    expect(getThemeById("warm-embrace")?.name).toBe("Warm Embrace");
    expect(getThemeById("nope")).toBeUndefined();
  });
});

describe("gradientStops", () => {
  it("extracts every hex stop from the CSS gradient string", () => {
    const warm = getThemeById("warm-embrace")!;
    expect(gradientStops(warm)).toEqual(["#FFE7D9", "#F8B4B8", "#E88891"]);
  });
  it("returns at least two stops for a simple 2-stop theme", () => {
    const stops = gradientStops(getThemeById("midnight-romance")!);
    expect(stops.length).toBeGreaterThanOrEqual(2);
  });
});

describe("occasions", () => {
  it("includes the custom occasion with no prompts", () => {
    const custom = getOccasionById("custom");
    expect(custom?.prompts).toEqual([]);
  });
  it("non-custom occasions carry starter prompts", () => {
    occasions
      .filter((o) => o.id !== "custom")
      .forEach((o) => expect(o.prompts.length).toBeGreaterThan(0));
  });
});
