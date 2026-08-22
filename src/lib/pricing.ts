import type { ClientPlan } from "@/components/pricing/PricingTiers";

// Pricing source of truth. monthlyPrice/yearlyPrice are numbers so NumberFlow
// can animate transitions. periodOverride pins the "/x" suffix for plans whose
// cadence isn't simply monthly/yearly (one-off, per-surprise, gift).
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
