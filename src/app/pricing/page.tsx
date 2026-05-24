import Link from "next/link";
import { Heart, Zap, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PricingTiers, { type ClientPlan } from "@/components/pricing/PricingTiers";

export const metadata = { title: "Pricing — TaDaaaa" };

// Pricing source of truth. monthlyPrice/yearlyPrice are numbers so NumberFlow
// can animate transitions. periodOverride pins the "/x" suffix for plans whose
// cadence isn't simply monthly/yearly (one-off, per-surprise, gift).
const plans: ClientPlan[] = [
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
      "Dodge button 😏",
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
      "Dodge button 😏",
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
      "Dodge button 😏",
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
    badge: "Gift 🎁",
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

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#D4CBC3]/40 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="font-heading text-lg text-[#2D2926]">TaDaaaa</span>
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm text-[#6B5E57] hover:text-[#C4686D] transition-colors font-medium"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 bg-white text-[#C4686D] text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-[#E8A5A8]/40 shadow-sm uppercase tracking-widest">
            <Zap className="w-3 h-3 fill-current" />
            Pricing
          </span>
          <h1 className="font-heading text-5xl md:text-6xl text-[#2D2926] mb-5">
            Simple, honest pricing
          </h1>
          <p className="text-[#6B5E57] text-lg max-w-xl mx-auto leading-relaxed">
            Start free. Upgrade when you want to do more. No subscriptions unless you want them.
          </p>
        </div>

        <PricingTiers plans={plans} isAuthed={isAuthed} />


        {/* Social proof */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#C9A96E] text-[#C9A96E]" />)}
          </div>
          <p className="text-[#6B5E57] text-sm text-center max-w-md">
            Loved by 12,400+ people who made someone&apos;s day unforgettable.
          </p>
          <p className="text-sm text-[#6B5E57]">
            Questions?{" "}
            <a href="mailto:hello@tadaaaa.app" className="text-[#C4686D] hover:underline font-medium">
              hello@tadaaaa.app
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
