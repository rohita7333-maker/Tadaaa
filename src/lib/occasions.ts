/**
 * Occasions — the handoff's C1 list, verbatim.
 *
 * `design_handoff_tadaaaa_mobile/README.md` (C1) fixes six rows and their
 * descriptions word for word, and the C1 frame confirms them. This module is
 * the source of truth for that list.
 *
 * WHY THIS IS NOT `themes.ts → occasions`
 *
 * The pre-handoff list is a different set built for a different screen: seven
 * entries including Mother's Day and Father's Day, no Anniversary, and labels
 * written as prompts ("Birthday Wish", "Date Invite") rather than the short
 * nouns the frames show. Repointing it would silently change the legacy create
 * flow's copy, so both coexist: `HANDOFF_OCCASIONS` drives C1 and every frame
 * that names an occasion; `themes.ts → occasions` retires with its last caller.
 *
 * `invites.occasion_type` is TEXT with no CHECK, so ids are chosen to MATCH the
 * values already in the column (`date`, not `date_invite`) — an existing row
 * must keep rendering a label after this ships. `anniversary` is genuinely new.
 */

export interface HandoffOccasion {
  id: string;
  /** Short noun, as printed in the C1 rows and the B2 eyebrow. */
  label: string;
  /** C1's 13px stone description. Copy is verbatim from the handoff. */
  description: string;
}

export const HANDOFF_OCCASIONS: readonly HandoffOccasion[] = [
  { id: "birthday", label: "Birthday", description: "Cake, candles, everyone in on it." },
  { id: "anniversary", label: "Anniversary", description: "Years of you two, in one page." },
  { id: "date", label: "Date invite", description: "Make the ask impossible to refuse." },
  { id: "festival", label: "Festival", description: "Lights, family, the whole crew." },
  { id: "apology", label: "Apology", description: "Say it properly this time." },
  { id: "custom", label: "Custom", description: "Any moment worth a reveal." },
] as const;

/**
 * Occasion ids that exist in production rows but are not offered by C1. They
 * still need a label — an invite created before this list shipped must not
 * render its raw id in the B2 header.
 */
const LEGACY_LABELS: Record<string, string> = {
  mothers_day: "Mother's Day",
  fathers_day: "Father's Day",
  wedding: "Wedding",
};

/** Title-case an unknown id so it reads as prose rather than a column value. */
function humanise(id: string): string {
  const words = id.replace(/[_-]+/g, " ").trim();
  if (words === "") return "";
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * Label for any `occasion_type` value, offered or not. Returns "" for null so
 * callers can drop the segment instead of printing a placeholder.
 */
export function occasionLabel(id: string | null | undefined): string {
  if (!id) return "";
  const known = HANDOFF_OCCASIONS.find((o) => o.id === id);
  if (known) return known.label;
  return LEGACY_LABELS[id] ?? humanise(id);
}

export function getHandoffOccasion(id: string): HandoffOccasion | undefined {
  return HANDOFF_OCCASIONS.find((o) => o.id === id);
}

/** Longest id a custom occasion may become. Comfortably under any index limit. */
const CUSTOM_OCCASION_MAX = 60;

/**
 * Turn a typed custom occasion into an `occasion_type` value.
 *
 * C1's "Custom" row never asked what the occasion actually was, so it published
 * `occasion_type = 'custom'` and every screen downstream printed the literal
 * word "Custom". The column is TEXT with no CHECK constraint and
 * `occasionLabel()` already title-cases ids it does not recognise — that path
 * exists for pre-handoff rows like `mothers_day` — so a custom occasion can
 * simply travel as its own id and render correctly with no migration at all.
 *
 * Underscores, not hyphens: the ids already in the column are `mothers_day`.
 */
export function toOccasionId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, CUSTOM_OCCASION_MAX)
    // Slicing can land mid-separator; a trailing underscore would humanise
    // back with a dangling space.
    .replace(/_+$/, "");
}

/**
 * C1's "Not sure? Let AI pick →" sheet. Four vibes, each biasing the occasion
 * and theme suggestions that follow. The handoff names the four; the mapping
 * onto occasion ids is ours, and is ordering only — nothing is auto-selected.
 */
export const AI_VIBES = [
  { id: "warm", label: "Warm & cosy", occasions: ["birthday", "festival", "custom"] },
  { id: "romantic", label: "Romantic", occasions: ["anniversary", "date", "custom"] },
  { id: "fun", label: "Fun & loud", occasions: ["birthday", "festival", "date"] },
  { id: "elegant", label: "Elegant", occasions: ["anniversary", "custom", "festival"] },
] as const;

export type VibeId = (typeof AI_VIBES)[number]["id"];

/** Occasions reordered so a vibe's picks come first. Never filters any out. */
export function occasionsForVibe(vibe: VibeId): HandoffOccasion[] {
  const preferred: readonly string[] = AI_VIBES.find((v) => v.id === vibe)?.occasions ?? [];
  const rank = (id: string) => {
    const i = preferred.indexOf(id);
    return i === -1 ? preferred.length : i;
  };
  return [...HANDOFF_OCCASIONS].sort((a, b) => rank(a.id) - rank(b.id));
}
