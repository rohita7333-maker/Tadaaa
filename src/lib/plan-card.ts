/**
 * Frame B6's plan card — the only ink-filled block in the shell.
 *
 * Copy comes from the handoff's Plans table (Free / Premium Surprise $4.99 /
 * Unlimited $1.99 a month). Production carries three tiers where the handoff's
 * card shows two, so `plus` gets its own line rather than being flattened into
 * "unlimited" — a user who paid $4.99 for one surprise should not be told they
 * have unlimited ones.
 */
import type { Tier } from "./tier";

export interface PlanCard {
  tierName: string;
  summary: string;
  /** Null once there is nothing left to sell. */
  ctaLabel: string | null;
}

const CARDS: Record<Tier, PlanCard> = {
  free: {
    tierName: "Free",
    summary: "2 surprises a month · 8 photos · 7-day links. Unlimited is $1.99/mo.",
    ctaLabel: "Go Unlimited",
  },
  plus: {
    tierName: "Premium Surprise",
    summary:
      "All themes · 20 photos · 30-day links on your unlocked surprise. Unlimited is $1.99/mo.",
    ctaLabel: "Go Unlimited",
  },
  unlimited: {
    tierName: "Unlimited",
    summary: "Unlimited surprises · unlimited media · every theme · full analytics.",
    ctaLabel: null,
  },
};

export function planCard(tier: Tier): PlanCard {
  return CARDS[tier];
}
