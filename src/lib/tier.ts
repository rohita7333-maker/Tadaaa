import {
  SIGNED_URL_EXPIRY_FREE,
  SIGNED_URL_EXPIRY_PAID,
  FREE_INVITE_MONTHLY_LIMIT,
} from "./constants";

export type Tier = "free" | "plus" | "unlimited";

export interface TierProfile {
  subscription_tier: string | null;
  subscription_expires_at: string | null;
}

const VALID_TIERS = new Set<string>(["free", "plus", "unlimited"]);

export function getActiveTier(profile: TierProfile | null): Tier {
  if (!profile?.subscription_tier) return "free";
  const raw = profile.subscription_tier;
  if (!VALID_TIERS.has(raw)) return "free";
  const tier = raw as Tier;
  if (tier === "free") return "free";
  if (profile.subscription_expires_at) {
    const expired = new Date(profile.subscription_expires_at) < new Date();
    if (expired) return "free";
  }
  return tier;
}

export function canCreateInvite(
  tier: Tier,
  monthlyCount: number
): { allowed: boolean; reason?: string } {
  if (tier === "plus" || tier === "unlimited") return { allowed: true };
  const limit = FREE_INVITE_MONTHLY_LIMIT;
  if (monthlyCount >= limit) {
    return {
      allowed: false,
      reason: `Monthly limit reached. Free plan allows ${limit} surprises per month. Upgrade for more!`,
    };
  }
  return { allowed: true };
}

export function canUsePremiumTheme(tier: Tier, isPaid: boolean): boolean {
  if (tier === "plus" || tier === "unlimited") return true;
  return isPaid;
}

export function canGenerateVideo(tier: Tier, isPaid: boolean): boolean {
  if (tier === "plus" || tier === "unlimited") return true;
  return isPaid;
}

export function getSignedUrlExpiry(tier: Tier): number {
  return tier === "free" ? SIGNED_URL_EXPIRY_FREE : SIGNED_URL_EXPIRY_PAID;
}

export function monthlyInviteLimit(tier: Tier): number | null {
  return tier === "free" ? FREE_INVITE_MONTHLY_LIMIT : null;
}
