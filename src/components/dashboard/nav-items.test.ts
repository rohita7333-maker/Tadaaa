import { describe, it, expect } from "vitest";
import {
  PRODUCT_NAV_ITEMS,
  resolveAppBarNav,
  resolveProductNav,
} from "./nav-items";

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

describe("resolveAppBarNav", () => {
  it("carries every product route, in the same order, plus an account tab", () => {
    const appBarKeys = resolveAppBarNav().map((item) => item.key);
    const productKeys = PRODUCT_NAV_ITEMS.map((item) => item.key);

    expect(appBarKeys.slice(0, productKeys.length)).toEqual(productKeys);
    expect(appBarKeys.at(-1)).toBe("settings");
    expect(appBarKeys).toHaveLength(productKeys.length + 1);
  });

  it("cannot drift from the top nav — every product href is identical", () => {
    const appBar = resolveAppBarNav();
    for (const item of PRODUCT_NAV_ITEMS) {
      expect(appBar.find((tab) => tab.key === item.key)?.href).toBe(item.href);
    }
  });

  it("points the account tab at settings", () => {
    expect(resolveAppBarNav().at(-1)?.href).toBe("/settings");
  });

  it("shortens Dashboard to Home so a 5-up strip fits at 320px", () => {
    expect(resolveAppBarNav().map((item) => item.label)).toEqual([
      "Home",
      "Templates",
      "Create",
      "You",
    ]);
  });

  it("keeps every label short enough for a 10px uppercase tab", () => {
    for (const item of resolveAppBarNav()) {
      expect(item.label.length).toBeLessThanOrEqual(9);
    }
  });

  it("marks exactly one tab active for each route it carries", () => {
    for (const key of [...PRODUCT_NAV_ITEMS.map((i) => i.key), "settings"] as const) {
      const active = resolveAppBarNav(key).filter((i) => i.isActive);
      expect(active).toHaveLength(1);
      expect(active[0].key).toBe(key);
    }
  });

  it("marks nothing active for a route with no tab, and for no route", () => {
    expect(resolveAppBarNav("pricing").some((i) => i.isActive)).toBe(false);
    expect(resolveAppBarNav().some((i) => i.isActive)).toBe(false);
  });

  it("does not mutate PRODUCT_NAV_ITEMS when shortening labels", () => {
    resolveAppBarNav("dashboard");
    expect(PRODUCT_NAV_ITEMS.map((i) => i.label)).toEqual([
      "Dashboard",
      "Templates",
      "Create",
    ]);
  });
});
