import { describe, it, expect } from "vitest";
import { PRODUCT_NAV_ITEMS, resolveProductNav } from "./nav-items";

describe("resolveProductNav", () => {
  it("keeps the Dashboard · Templates · Create order", () => {
    expect(resolveProductNav().map((item) => item.label)).toEqual([
      "Dashboard",
      "Templates",
      "Create",
    ]);
  });

  it("marks exactly one item active for a route that has a nav entry", () => {
    for (const item of PRODUCT_NAV_ITEMS) {
      const active = resolveProductNav(item.key).filter((i) => i.isActive);
      expect(active).toHaveLength(1);
      expect(active[0].key).toBe(item.key);
    }
  });

  it("marks nothing active for routes without a nav entry", () => {
    expect(resolveProductNav("pricing").some((i) => i.isActive)).toBe(false);
    expect(resolveProductNav("settings").some((i) => i.isActive)).toBe(false);
  });

  it("marks nothing active when no route is given", () => {
    expect(resolveProductNav().some((i) => i.isActive)).toBe(false);
  });

  it("points each item at its own route", () => {
    expect(resolveProductNav().map((item) => item.href)).toEqual([
      "/dashboard",
      "/templates",
      "/create",
    ]);
  });
});
