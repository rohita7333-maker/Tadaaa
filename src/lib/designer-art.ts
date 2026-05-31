import type { Tier } from "./tier";

export function canUseDesignerArt(tier: Tier): boolean {
  return tier === "plus" || tier === "unlimited";
}

export interface DesignerTemplate {
  label: string;
  background: string; // CSS gradient string usable by Satori
  accent: string;
  emoji: string;
}

export type StyleVariant = "classic" | "bold" | "minimal";

export const STYLE_VARIANTS: StyleVariant[] = ["classic", "bold", "minimal"];

/**
 * Returns true when the given string is a valid StyleVariant.
 * Unknown/empty → caller should default to "classic".
 */
export function isValidStyle(s: string | null | undefined): s is StyleVariant {
  return STYLE_VARIANTS.includes(s as StyleVariant);
}

/**
 * Normalize a raw style query param to a valid StyleVariant.
 * Unknown or missing values → "classic".
 */
export function resolveStyle(raw: string | null | undefined): StyleVariant {
  return isValidStyle(raw) ? raw : "classic";
}

/**
 * Per-occasion, per-style template bank.
 * classic — warm, pastel, the original D1 palette.
 * bold — high-contrast, saturated, punchy.
 * minimal — near-white, typographic, quiet.
 */
const TEMPLATE_BANK: Record<string, Record<StyleVariant, DesignerTemplate>> = {
  birthday: {
    classic: {
      label: "Birthday Surprise",
      background: "linear-gradient(135deg, #FFE7D9 0%, #F8B4B8 60%, #E88891 100%)",
      accent: "#C4686D",
      emoji: "🎂",
    },
    bold: {
      label: "Birthday Surprise",
      background: "linear-gradient(135deg, #FF4E6A 0%, #FF8C42 100%)",
      accent: "#FFFFFF",
      emoji: "🎉",
    },
    minimal: {
      label: "Birthday Surprise",
      background: "linear-gradient(135deg, #FFFAF8 0%, #FFF0EC 100%)",
      accent: "#C4686D",
      emoji: "🎂",
    },
  },
  date: {
    classic: {
      label: "A Special Invitation",
      background: "linear-gradient(135deg, #FDE2E4 0%, #E2B5C2 100%)",
      accent: "#B05C7A",
      emoji: "🌹",
    },
    bold: {
      label: "A Special Invitation",
      background: "linear-gradient(135deg, #8B0000 0%, #C2185B 100%)",
      accent: "#FFFFFF",
      emoji: "💋",
    },
    minimal: {
      label: "A Special Invitation",
      background: "linear-gradient(135deg, #FFF5F7 0%, #FDE8EE 100%)",
      accent: "#B05C7A",
      emoji: "🌹",
    },
  },
  festival: {
    classic: {
      label: "Festival Greetings",
      background: "linear-gradient(135deg, #FFF3D6 0%, #F5C77E 100%)",
      accent: "#C98A2B",
      emoji: "✨",
    },
    bold: {
      label: "Festival Greetings",
      background: "linear-gradient(135deg, #FF6F00 0%, #FFD600 100%)",
      accent: "#1A0500",
      emoji: "🎆",
    },
    minimal: {
      label: "Festival Greetings",
      background: "linear-gradient(135deg, #FFFDF4 0%, #FFF6DC 100%)",
      accent: "#C98A2B",
      emoji: "✨",
    },
  },
  mothers_day: {
    classic: {
      label: "For You, Mom",
      background: "linear-gradient(135deg, #FCE4EC 0%, #F1A7C1 100%)",
      accent: "#B05C7A",
      emoji: "💐",
    },
    bold: {
      label: "For You, Mom",
      background: "linear-gradient(135deg, #AD1457 0%, #F06292 100%)",
      accent: "#FFFFFF",
      emoji: "🌸",
    },
    minimal: {
      label: "For You, Mom",
      background: "linear-gradient(135deg, #FFF0F6 0%, #FDE8F0 100%)",
      accent: "#B05C7A",
      emoji: "💐",
    },
  },
  apology: {
    classic: {
      label: "A Heartfelt Message",
      background: "linear-gradient(135deg, #EAEFF5 0%, #B9C7D6 100%)",
      accent: "#5E708A",
      emoji: "🙏",
    },
    bold: {
      label: "A Heartfelt Message",
      background: "linear-gradient(135deg, #1A237E 0%, #3949AB 100%)",
      accent: "#FFFFFF",
      emoji: "💙",
    },
    minimal: {
      label: "A Heartfelt Message",
      background: "linear-gradient(135deg, #F5F8FB 0%, #EBF0F7 100%)",
      accent: "#5E708A",
      emoji: "🙏",
    },
  },
  custom: {
    classic: {
      label: "A Surprise For You",
      background: "linear-gradient(135deg, #FFF8F0 0%, #F5E6E0 100%)",
      accent: "#C4686D",
      emoji: "💌",
    },
    bold: {
      label: "A Surprise For You",
      background: "linear-gradient(135deg, #C4686D 0%, #9B3D42 100%)",
      accent: "#FFFFFF",
      emoji: "🎁",
    },
    minimal: {
      label: "A Surprise For You",
      background: "linear-gradient(135deg, #FFFBF9 0%, #FFF3EE 100%)",
      accent: "#C4686D",
      emoji: "💌",
    },
  },
};

export function getTemplate(
  occasion: string | null | undefined,
  style: StyleVariant = "classic"
): DesignerTemplate {
  const bank = TEMPLATE_BANK[occasion ?? "custom"] ?? TEMPLATE_BANK.custom;
  return bank[style] ?? bank.classic;
}
