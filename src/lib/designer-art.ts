import type { Tier } from "./tier";

export function canUseDesignerArt(tier: Tier): boolean {
  return tier === "plus" || tier === "unlimited";
}

export interface DesignerTemplate {
  label: string;
  background: string; // CSS gradient string usable by Satori
  accent: string;
  emoji: string;
  /** Optional: radial glow color layered on top of `background` (editorial mode). */
  glow?: string;
  /** Optional: the deepened background used for the layered composite render. */
  bgDeep?: string;
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
 * Returns a short human-readable eyebrow label for the occasion type.
 * Used as the uppercase eyebrow in the editorial/modern card layouts.
 */
export function occasionEyebrow(occasion: string | null | undefined): string {
  switch (occasion) {
    case "birthday":
      return "BIRTHDAY";
    case "mothers_day":
      return "MOTHER'S DAY";
    case "date":
      return "AN INVITATION";
    case "festival":
      return "CELEBRATION";
    case "apology":
      return "FROM THE HEART";
    case "custom":
    default:
      return "A SURPRISE";
  }
}

/**
 * Per-occasion, per-style template bank.
 * classic — rich, saturated editorial palette.
 * bold — high-contrast, punchy diagonal.
 * minimal — near-white, quiet typographic.
 */
const TEMPLATE_BANK: Record<string, Record<StyleVariant, DesignerTemplate>> = {
  birthday: {
    classic: {
      label: "Birthday Surprise",
      background:
        "linear-gradient(150deg, #B5294E 0%, #D4547A 35%, #E8856F 70%, #F2A86B 100%)",
      bgDeep:
        "linear-gradient(150deg, #8C1D3C 0%, #B5294E 40%, #D4547A 75%, #E8856F 100%)",
      accent: "#FFE8DC",
      glow: "rgba(255,180,120,0.30)",
      emoji: "🎂",
    },
    bold: {
      label: "Birthday Surprise",
      background: "linear-gradient(135deg, #FF1744 0%, #FF6D00 100%)",
      accent: "#FFFFFF",
      emoji: "🎉",
    },
    minimal: {
      label: "Birthday Surprise",
      background: "linear-gradient(150deg, #FDF0EA 0%, #F7D8CE 100%)",
      bgDeep: "linear-gradient(150deg, #F5E0D4 0%, #EBBCAE 100%)",
      accent: "#9B3050",
      glow: "rgba(200,100,100,0.12)",
      emoji: "🎂",
    },
  },
  date: {
    classic: {
      label: "A Special Invitation",
      background:
        "linear-gradient(150deg, #4A0E2B 0%, #8B1A4A 35%, #C2487A 70%, #D97FAA 100%)",
      bgDeep:
        "linear-gradient(150deg, #35081F 0%, #6B1238 40%, #A03565 100%)",
      accent: "#FFD6E7",
      glow: "rgba(220,130,170,0.28)",
      emoji: "🌹",
    },
    bold: {
      label: "A Special Invitation",
      background: "linear-gradient(135deg, #6D0025 0%, #C2185B 100%)",
      accent: "#FFFFFF",
      emoji: "💋",
    },
    minimal: {
      label: "A Special Invitation",
      background: "linear-gradient(150deg, #FEF5F8 0%, #F8DCE8 100%)",
      bgDeep: "linear-gradient(150deg, #F8E4EE 0%, #EEC0D4 100%)",
      accent: "#8B1A4A",
      glow: "rgba(180,60,110,0.12)",
      emoji: "🌹",
    },
  },
  festival: {
    classic: {
      label: "Festival Greetings",
      background:
        "linear-gradient(150deg, #7B3F00 0%, #C47A1E 35%, #E8AC3C 65%, #F5CC70 100%)",
      bgDeep:
        "linear-gradient(150deg, #5C2E00 0%, #9E6210 40%, #C88A2A 100%)",
      accent: "#FFF3D0",
      glow: "rgba(240,200,80,0.28)",
      emoji: "✨",
    },
    bold: {
      label: "Festival Greetings",
      background: "linear-gradient(135deg, #E65100 0%, #FFD600 100%)",
      accent: "#1A0500",
      emoji: "🎆",
    },
    minimal: {
      label: "Festival Greetings",
      background: "linear-gradient(150deg, #FEFBF0 0%, #F7EAC4 100%)",
      bgDeep: "linear-gradient(150deg, #F8F0D6 0%, #EDD89A 100%)",
      accent: "#7B3F00",
      glow: "rgba(200,160,40,0.14)",
      emoji: "✨",
    },
  },
  mothers_day: {
    classic: {
      label: "For You, Mom",
      background:
        "linear-gradient(150deg, #5C0A35 0%, #9E2964 35%, #CC5C8A 65%, #E891B6 100%)",
      bgDeep:
        "linear-gradient(150deg, #420727 0%, #7D1A4E 40%, #AA3D72 100%)",
      accent: "#FFE4F0",
      glow: "rgba(230,150,190,0.30)",
      emoji: "💐",
    },
    bold: {
      label: "For You, Mom",
      background: "linear-gradient(135deg, #880E4F 0%, #EC407A 100%)",
      accent: "#FFFFFF",
      emoji: "🌸",
    },
    minimal: {
      label: "For You, Mom",
      background: "linear-gradient(150deg, #FFF3F8 0%, #F9D6EA 100%)",
      bgDeep: "linear-gradient(150deg, #F8E4F0 0%, #EFBCD7 100%)",
      accent: "#7B1A4A",
      glow: "rgba(200,80,140,0.12)",
      emoji: "💐",
    },
  },
  apology: {
    classic: {
      label: "A Heartfelt Message",
      background:
        "linear-gradient(150deg, #0D1B3E 0%, #1C3466 35%, #2E5898 65%, #5080C0 100%)",
      bgDeep:
        "linear-gradient(150deg, #07112A 0%, #142852 40%, #244A88 100%)",
      accent: "#D0E4FF",
      glow: "rgba(90,160,255,0.22)",
      emoji: "🙏",
    },
    bold: {
      label: "A Heartfelt Message",
      background: "linear-gradient(135deg, #0D1B3E 0%, #283593 100%)",
      accent: "#FFFFFF",
      emoji: "💙",
    },
    minimal: {
      label: "A Heartfelt Message",
      background: "linear-gradient(150deg, #F4F7FC 0%, #DDEAF8 100%)",
      bgDeep: "linear-gradient(150deg, #E4EDF8 0%, #C4D8EE 100%)",
      accent: "#1C3466",
      glow: "rgba(60,100,200,0.12)",
      emoji: "🙏",
    },
  },
  custom: {
    classic: {
      label: "A Surprise For You",
      background:
        "linear-gradient(150deg, #5C1A20 0%, #9B3D42 35%, #C4686D 65%, #D99090 100%)",
      bgDeep:
        "linear-gradient(150deg, #420F14 0%, #7A2B2F 40%, #A85055 100%)",
      accent: "#FFE4E5",
      glow: "rgba(220,140,140,0.28)",
      emoji: "💌",
    },
    bold: {
      label: "A Surprise For You",
      background: "linear-gradient(135deg, #8B0000 0%, #C4686D 100%)",
      accent: "#FFFFFF",
      emoji: "🎁",
    },
    minimal: {
      label: "A Surprise For You",
      background: "linear-gradient(150deg, #FFF6F6 0%, #F5DEDE 100%)",
      bgDeep: "linear-gradient(150deg, #FEEEEE 0%, #EEC8C8 100%)",
      accent: "#7A2B2F",
      glow: "rgba(180,80,80,0.12)",
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
