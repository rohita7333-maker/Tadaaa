/**
 * The product nav shown in the authenticated bar.
 *
 * Every signed-in surface (dashboard, templates, create, pricing, settings)
 * renders the same cluster so the app never reads as "logged out inside the
 * product". Routes without their own nav entry (pricing, settings) simply
 * highlight nothing.
 */
export type ProductRoute =
  | "dashboard"
  | "templates"
  | "create"
  | "pricing"
  | "settings"
  /**
   * A dashboard-context surface, not a top-level destination — deliberately
   * absent from PRODUCT_NAV_ITEMS. Adding it would push the bottom app bar to
   * five product tabs plus the account tab, which cannot hold 44pt targets at
   * 320px. It is in the union so the route can still declare itself and pick
   * up `aria-current` on whichever nav is showing.
   */
  | "analytics";

export interface ProductNavItem {
  readonly key: ProductRoute;
  readonly label: string;
  readonly href: string;
}

/** Order is fixed and intentional: where you are → what you browse → what you make. */
export const PRODUCT_NAV_ITEMS: readonly ProductNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "templates", label: "Templates", href: "/templates" },
  { key: "create", label: "Create", href: "/create" },
];

export interface ResolvedProductNavItem extends ProductNavItem {
  readonly isActive: boolean;
}

export function resolveProductNav(
  activeRoute?: ProductRoute,
): ResolvedProductNavItem[] {
  return PRODUCT_NAV_ITEMS.map((item) => ({
    ...item,
    isActive: item.key === activeRoute,
  }));
}

/**
 * The mobile bottom app bar (mockup `.appbar`, tadaaaa-editorial.html:727).
 *
 * It is PRODUCT_NAV_ITEMS plus an account tab, so the desktop cluster and the
 * mobile bar can never drift apart: adding a product route adds it to both.
 * Labels are shortened for a 10px uppercase 5-up strip — "Dashboard" does not
 * fit a 44pt target at 320px, "Home" does.
 */
const APP_BAR_SHORT_LABEL: Partial<Record<ProductRoute, string>> = {
  dashboard: "Home",
};

/** The account tab. Not in PRODUCT_NAV_ITEMS because the top bar reaches
 *  settings through the avatar dropdown instead of a nav link. */
const APP_BAR_ACCOUNT_ITEM: ProductNavItem = {
  key: "settings",
  label: "You",
  href: "/settings",
};

export function resolveAppBarNav(
  activeRoute?: ProductRoute,
): ResolvedProductNavItem[] {
  const productTabs = PRODUCT_NAV_ITEMS.map((item) => ({
    ...item,
    label: APP_BAR_SHORT_LABEL[item.key] ?? item.label,
  }));

  return [...productTabs, APP_BAR_ACCOUNT_ITEM].map((item) => ({
    ...item,
    isActive: item.key === activeRoute,
  }));
}
