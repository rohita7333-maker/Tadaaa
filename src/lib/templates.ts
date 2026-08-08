// Ported 1:1 from web src/lib/templates.ts — curated invite templates bundling
// an occasion, a theme and a reveal style. Ids in the data must stay valid
// against themes.ts (occasions + themes); templates.test.ts enforces the
// cross-references, including tier === theme.isPremium.

export type RevealStyle = "tap" | "countdown" | "scroll_story";

export interface TemplateArt {
  cover?: string;
  heroBg?: string;
  frame?: string;
  texture?: string;
}

export type PaletteTag = "warm" | "pastel" | "dark" | "cool";

export interface Template {
  id: string;
  name: string;
  occasionId: string;
  themeId: string;
  revealType: RevealStyle;
  tier: "free" | "premium";
  emoji: string;
  tagline: string;
  /** Aesthetic descriptors for the style filter — not occasion labels. */
  styleTags: string[];
  /** Coarse background-color family, mirrors the theme's dominant tone. */
  paletteTag: PaletteTag;
  /** Absent for v1 — cards fall back to the theme's gradient. */
  art?: TemplateArt;
}

export const REVEAL_STYLE_LABELS: Record<RevealStyle, string> = {
  tap: "Tap reveal",
  countdown: "Countdown",
  scroll_story: "Scroll story",
};

export const templates: Template[] = [
  {
    id: "golden-hour",
    name: "Golden Hour",
    // Was "date" — the tagline is a birthday reveal, not a date ask; moved to
    // match the copy instead of leaving a proposal-flavored tagline on a
    // date-invite occasion. See templates.test.ts occasion-sanity checks.
    occasionId: "birthday",
    themeId: "golden-hour",
    revealType: "scroll_story",
    tier: "free",
    emoji: "🌇",
    tagline: "sunset light for the birthday they didn't see coming",
    styleTags: ["sunset", "golden"],
    paletteTag: "warm",
  },
  {
    id: "after-dark",
    name: "After Dark",
    occasionId: "date",
    themeId: "midnight-romance",
    revealType: "countdown",
    tier: "free",
    emoji: "🌙",
    tagline: "counting down to a night they'll replay forever",
    styleTags: ["moody", "starlit"],
    paletteTag: "dark",
  },
  {
    id: "petal-drop",
    name: "Petal Drop",
    occasionId: "date",
    themeId: "cherry-blossom",
    revealType: "tap",
    tier: "premium",
    emoji: "🌸",
    tagline: "soft-launch your feelings, one petal at a time",
    styleTags: ["floral", "soft"],
    paletteTag: "pastel",
  },
  {
    id: "tiny-wonder",
    name: "Tiny Wonder",
    occasionId: "birthday",
    themeId: "cotton-candy",
    revealType: "tap",
    tier: "premium",
    emoji: "🎈",
    tagline: "sweet, silly, and entirely their day",
    styleTags: ["playful", "sweet"],
    paletteTag: "pastel",
  },
  {
    id: "cake-o-clock",
    name: "Cake O'Clock",
    occasionId: "birthday",
    themeId: "neon-party",
    revealType: "countdown",
    tier: "premium",
    emoji: "🎂",
    tagline: "the party starts the second this hits zero",
    styleTags: ["neon", "party"],
    paletteTag: "dark",
  },
  {
    id: "first-bloom",
    name: "First Bloom",
    occasionId: "mothers_day",
    themeId: "warm-embrace",
    revealType: "tap",
    tier: "free",
    emoji: "💐",
    tagline: "because she always knows — except this time",
    styleTags: ["tender", "classic"],
    paletteTag: "warm",
  },
  {
    id: "top-shelf",
    name: "Top Shelf",
    occasionId: "fathers_day",
    themeId: "velvet-night",
    revealType: "tap",
    tier: "premium",
    emoji: "🥃",
    tagline: "for the man who insists he doesn't want a fuss",
    styleTags: ["luxe", "moody"],
    paletteTag: "dark",
  },
  {
    id: "diya-nights",
    name: "Diya Nights",
    occasionId: "festival",
    themeId: "diwali-glow",
    revealType: "scroll_story",
    tier: "premium",
    emoji: "🪔",
    tagline: "light by light, the story unfolds",
    styleTags: ["festive", "glowing"],
    paletteTag: "dark",
  },
  {
    id: "cocoa-eve",
    name: "Cocoa Eve",
    occasionId: "festival",
    themeId: "christmas-eve",
    revealType: "countdown",
    tier: "premium",
    emoji: "🎄",
    tagline: "unwraps at midnight — no peeking",
    styleTags: ["cozy", "festive"],
    paletteTag: "dark",
  },
  {
    id: "still-us",
    name: "Still Us",
    occasionId: "apology",
    themeId: "farewell-skies",
    revealType: "scroll_story",
    tier: "premium",
    emoji: "🕊️",
    tagline: "when sorry needs more than a text",
    styleTags: ["wistful", "calm"],
    paletteTag: "pastel",
  },
  {
    id: "the-big-ask",
    name: "The Big Ask",
    occasionId: "custom",
    themeId: "sunset-proposal",
    revealType: "scroll_story",
    tier: "premium",
    emoji: "💍",
    tagline: "four words, one page, zero backing out",
    styleTags: ["romantic", "sunset"],
    paletteTag: "warm",
  },
  {
    id: "shoreline",
    name: "Shoreline",
    occasionId: "custom",
    themeId: "ocean-breeze",
    revealType: "tap",
    tier: "premium",
    emoji: "🌊",
    tagline: "calm on the outside, big feelings inside",
    styleTags: ["breezy", "coastal"],
    paletteTag: "cool",
  },
];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function templatesByOccasion(occasionId: string): Template[] {
  if (occasionId === "all") return templates;
  return templates.filter((t) => t.occasionId === occasionId);
}

export interface TemplateFilters {
  /** "all" (default) or a specific occasion id. */
  occasionId?: string;
  /** "all" (default), "free", or "premium". */
  tier?: "all" | "free" | "premium";
  /** Selected style tags — OR'd together; empty/omitted skips the facet. */
  styleTags?: string[];
}

/**
 * Pure facet filter for the templates catalog. Facets AND together
 * (occasion AND price AND style); values within the styleTags facet OR
 * together — matching any one selected tag is enough.
 */
export function filterTemplates(filters: TemplateFilters = {}): Template[] {
  const { occasionId = "all", tier = "all", styleTags = [] } = filters;
  return templates.filter((t) => {
    if (occasionId !== "all" && t.occasionId !== occasionId) return false;
    if (tier !== "all" && t.tier !== tier) return false;
    if (
      styleTags.length > 0 &&
      !t.styleTags.some((tag) => styleTags.includes(tag))
    ) {
      return false;
    }
    return true;
  });
}

/** Every style tag used across the catalog, in first-seen registry order. */
export function allStyleTags(): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const t of templates) {
    for (const tag of t.styleTags) {
      if (!seen.has(tag)) {
        seen.add(tag);
        tags.push(tag);
      }
    }
  }
  return tags;
}
