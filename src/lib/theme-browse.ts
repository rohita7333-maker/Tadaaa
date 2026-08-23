/**
 * Frame B3 — theme browsing.
 *
 * The frame is one search field, ONE chip row (All / occasions / Free /
 * Premium), a result count and a 2-up grid. The pre-handoff `/templates`
 * screen has three chip rows and a featured rail; that screen stays as the
 * deep-link marketplace, and this module backs the tab the frame specifies.
 *
 * The catalogue itself is `templates.ts` — parity-locked with web, so a
 * surprise created on either platform renders identically. There is no `themes`
 * table and no `theme_id` FK, whatever the handoff's data model says.
 */
import { getOccasionById } from "./themes";
import { occasionLabel } from "./occasions";
import { templates, type Template } from "./templates";

export interface ThemeFilter {
  id: string;
  label: string;
}

/** Occasions that actually have themes, in catalogue order. */
function occasionsWithThemes(): ThemeFilter[] {
  const seen: string[] = [];
  for (const t of templates) {
    if (!seen.includes(t.occasionId)) seen.push(t.occasionId);
  }
  return seen.map((id) => ({
    id,
    // Prefer the handoff's short noun ("Birthday"), fall back to the legacy
    // catalogue label ("Birthday Wish") for an occasion C1 does not offer.
    label: occasionLabel(id) || getOccasionById(id)?.label || id,
  }));
}

/**
 * The chip row. Every chip is proved non-empty by the test suite — a filter
 * that always yields nothing reads as a broken screen, not a narrow catalogue.
 */
export const THEME_FILTERS: ThemeFilter[] = [
  { id: "all", label: "All" },
  ...occasionsWithThemes(),
  { id: "free", label: "Free" },
  { id: "premium", label: "Premium" },
];

export interface BrowseInput {
  query: string;
  filter: string;
}

function matchesQuery(t: Template, q: string): boolean {
  if (q === "") return true;
  const haystack = [
    t.name,
    t.tagline,
    t.occasionId,
    occasionLabel(t.occasionId),
    getOccasionById(t.occasionId)?.label ?? "",
    ...t.styleTags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function matchesFilter(t: Template, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "free") return t.tier === "free";
  if (filter === "premium") return t.tier === "premium";
  return t.occasionId === filter;
}

/** Query AND filter — neither overrides the other. */
export function browseThemes(input: BrowseInput): Template[] {
  const q = input.query.trim().toLowerCase();
  return templates.filter((t) => matchesFilter(t, input.filter) && matchesQuery(t, q));
}

export function resultCountLabel(n: number): string {
  if (n === 0) return "Nothing matches that yet";
  return `${n} ${n === 1 ? "theme" : "themes"}`;
}

/**
 * Frame B3's price cell: stone "Free" or coral "$4.99".
 *
 * A premium theme with no price falls back to the word "Premium" rather than
 * "$0.00" or "Free" — the card already carries a PREMIUM badge, and the two
 * disagreeing is how a paywall gets reported as a bug.
 */
export function themePriceLabel(tier: "free" | "premium", price: number): string {
  if (tier === "free") return "Free";
  if (!price || price <= 0) return "Premium";
  return `$${price.toFixed(2)}`;
}
