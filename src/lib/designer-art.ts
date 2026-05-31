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

const TEMPLATES: Record<string, DesignerTemplate> = {
  birthday: {
    label: "Birthday Surprise",
    background: "linear-gradient(135deg, #FFE7D9 0%, #F8B4B8 60%, #E88891 100%)",
    accent: "#C4686D",
    emoji: "🎂",
  },
  date: {
    label: "A Special Invitation",
    background: "linear-gradient(135deg, #FDE2E4 0%, #E2B5C2 100%)",
    accent: "#B05C7A",
    emoji: "🌹",
  },
  festival: {
    label: "Festival Greetings",
    background: "linear-gradient(135deg, #FFF3D6 0%, #F5C77E 100%)",
    accent: "#C98A2B",
    emoji: "✨",
  },
  mothers_day: {
    label: "For You, Mom",
    background: "linear-gradient(135deg, #FCE4EC 0%, #F1A7C1 100%)",
    accent: "#B05C7A",
    emoji: "💐",
  },
  apology: {
    label: "A Heartfelt Message",
    background: "linear-gradient(135deg, #EAEFF5 0%, #B9C7D6 100%)",
    accent: "#5E708A",
    emoji: "🙏",
  },
  custom: {
    label: "A Surprise For You",
    background: "linear-gradient(135deg, #FFF8F0 0%, #F5E6E0 100%)",
    accent: "#C4686D",
    emoji: "💌",
  },
};

export function getTemplate(occasion: string | null | undefined): DesignerTemplate {
  return TEMPLATES[occasion ?? "custom"] ?? TEMPLATES.custom;
}
