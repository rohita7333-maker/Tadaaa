import Link from "next/link";
import { Heart, Check, Zap, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PricingCTA from "@/components/pricing/PricingCTA";

export const metadata = { title: "Pricing — TaDaaaa" };

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  planKey: "free" | "plus" | "unlimited";
  highlight: boolean;
  badge: string | null;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
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
    price: "$4.99",
    period: "per surprise",
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
    name: "Unlimited",
    price: "$19.99",
    period: "per year",
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

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl p-8 flex flex-col relative overflow-hidden ${
                plan.highlight
                  ? "bg-gradient-to-br from-[#C4686D] to-[#9B3D42] text-white shadow-[0_12px_48px_rgba(196,104,109,0.35)]"
                  : "bg-white shadow-[0_4px_24px_rgba(45,41,38,0.06)] border border-[#D4CBC3]/30"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute top-5 right-5 text-xs font-bold px-2.5 py-1 rounded-full ${
                    plan.highlight
                      ? "bg-white/20 text-white"
                      : "bg-[#C9A96E]/15 text-[#C9A96E]"
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan info */}
              <div className="mb-7">
                <h2 className={`font-heading text-xl mb-3 ${plan.highlight ? "text-white" : "text-[#2D2926]"}`}>
                  {plan.name}
                </h2>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`font-heading text-5xl font-bold leading-none ${plan.highlight ? "text-white" : "text-[#2D2926]"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1.5 ${plan.highlight ? "opacity-60" : "text-[#6B5E57]"}`}>
                    /{plan.period}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${plan.highlight ? "opacity-70" : "text-[#6B5E57]"}`}>
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        plan.highlight ? "text-white/80" : "text-[#C4686D]"
                      }`}
                    />
                    <span className={plan.highlight ? "text-white/90" : "text-[#2D2926]"}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <PricingCTA
                plan={plan.planKey}
                label={plan.cta}
                isAuthed={isAuthed}
                className={`h-12 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 ${
                  plan.highlight
                    ? "bg-white text-[#C4686D] hover:bg-[#FFF0E8] shadow-lg"
                    : "bg-gradient-to-r from-[#C4686D] to-[#9B3D42] text-white hover:from-[#9B3D42] hover:to-[#C4686D] shadow-md shadow-[#C4686D]/20"
                }`}
              />
            </div>
          ))}
        </div>

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
