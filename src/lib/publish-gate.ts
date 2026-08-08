import { PREMIUM_THEME_PRICE } from "./constants";
import { canUsePremiumTheme, type Tier } from "./tier";

/**
 * The single price moment. Picking a premium theme is free — paying for it
 * happens once, at publish. This is the pure decision behind that gate; the
 * server (createInviteShell) stays the authoritative check.
 */
export interface PublishGateInput {
  /** Whether the selected theme is a premium (paid) theme. */
  isPremium: boolean;
  /** Theme was unlocked by a one-off checkout earlier in this session. */
  sessionUnlocked: boolean;
  /** Raw subscription tier string — unknown values are treated as free. */
  tier: string;
}

export interface PublishGateResult {
  allowed: boolean;
  reason?: string;
}

const VALID_TIERS = new Set<Tier>(["free", "plus", "unlimited"]);

function normalizeTier(tier: string): Tier {
  return VALID_TIERS.has(tier as Tier) ? (tier as Tier) : "free";
}

export function canPublishTheme({
  isPremium,
  sessionUnlocked,
  tier,
}: PublishGateInput): PublishGateResult {
  if (!isPremium) return { allowed: true };
  if (canUsePremiumTheme(normalizeTier(tier), sessionUnlocked)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Premium surprise — $${PREMIUM_THEME_PRICE.toFixed(2)}, or included with Unlimited.`,
  };
}
