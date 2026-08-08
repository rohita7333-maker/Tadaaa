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
  | "settings";

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
