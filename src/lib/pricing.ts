/**
 * Ported 1:1 from web `src/lib/pricing.ts` — the pricing source of truth.
 *
 * Every field, every price, every feature string and their order are identical
 * to web. `surprise-invite/src/lib/cross-platform-parity.test.ts` reads this
 * file from the web suite and fails if a single value drifts. Do not "adapt"
 * copy here: change web first, then copy it across.
 *
 * `monthlyPrice`/`yearlyPrice` are numbers on both platforms so web's NumberFlow
 * can animate between them. `periodOverride` pins the "/x" suffix for plans
 * whose cadence isn't simply monthly/yearly (one-off, per-surprise, gift).
 */

export type PlanKey = "free" | "plus" | "unlimited" | "gift";

export interface ClientPlan {
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  /** Override "/period" suffix (e.g. "per surprise", "one invite"). */
  periodOverride: string | null;
  description: string;
  cta: string;
  planKey: PlanKey;
  highlight: boolean;
  badge: string | null;
  features: string[];
  isOneTime?: boolean;
}

export const pricingPlans: ClientPlan[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    periodOverride: "forever",
    description: "Try it out. No card needed, ever.",
    cta: "Get started free",
    planKey: "free",
    highlight: false,
    badge: null,
    features: [
      "2 surprises per month",
      "8 photos per surprise",
      "7-day photo links",
      "Basic themes",
      "Custom questions",
      "Dodge button",
    ],
  },
  {
    name: "Plus",
    monthlyPrice: 4.99,
    yearlyPrice: 4.99,
    periodOverride: "per surprise",
    description: "Pay only when you create something special.",
    cta: "Create a surprise",
    planKey: "plus",
    highlight: true,
    badge: "Most popular",
    features: [
      "Unlimited surprises",
      "8 photos per surprise",
      "30-day photo links",
      "All premium themes",
      "Custom yes/no labels",
      "Dodge button",
      "Priority link delivery",
    ],
  },
  {
    // Unlimited — monthly vs yearly is the live toggle in PricingTiers.
    // yearlyPrice derived as 10x monthly (2 months free).
    name: "Unlimited",
    monthlyPrice: 1.99,
    yearlyPrice: 19.99,
    periodOverride: null,
    description: "For the person who loves to celebrate everyone.",
    cta: "Go unlimited",
    planKey: "unlimited",
    highlight: false,
    badge: "Best value",
    features: [
      "Unlimited surprises",
      "8 photos per surprise",
      "30-day photo links",
      "All premium themes",
      "Custom yes/no labels",
      "Dodge button",
      "Priority link delivery",
      "Priority support",
    ],
  },
  {
    name: "Gift",
    monthlyPrice: 5,
    yearlyPrice: 5,
    periodOverride: "one invite",
    description: "Send someone the gift of making a surprise.",
    cta: "Buy as a gift",
    planKey: "gift",
    highlight: false,
    badge: null,
    features: [
      "One full TaDaaaa invite",
      "Delivered by email",
      "Recipient redeems anytime",
      "90-day redemption window",
      "All premium themes included",
      "No account needed to buy",
    ],
  },
];

/**
 * Web renders the amount through NumberFlow with
 * `minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2`
 * and a "$" prefix. React Native has no NumberFlow, but the rendered STRING
 * must be byte-identical, so the same rule is applied here.
 */
export function formatPlanPrice(value: number): string {
  return `$${Number.isInteger(value) ? String(value) : value.toFixed(2)}`;
}

/**
 * The period suffix under the amount. Web falls back to the billing-cadence
 * toggle label; mobile has no cadence toggle (see `src/app/pricing.tsx`), so
 * the fallback is the yearly label mobile actually charges.
 */
export function planPeriodLabel(plan: ClientPlan, isYearly: boolean): string {
  return plan.periodOverride ?? (isYearly ? "per year" : "per month");
}
