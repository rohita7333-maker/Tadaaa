import Link from "next/link";
import { Heart, Zap, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PricingTiers from "@/components/pricing/PricingTiers";
import DashboardNavServer from "@/components/dashboard/DashboardNavServer";
import { pricingPlans } from "@/lib/pricing";

export const metadata = { title: "Pricing — TaDaaaa" };

// Chrome adapts to session: signed-in visitors get the same authenticated bar
// they see everywhere else in the product; signed-out visitors keep the
// marketing header with its "Sign in" link.

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Header */}
      {isAuthed ? (
        <DashboardNavServer activeRoute="pricing" />
      ) : (
        <header className="bg-white/80 backdrop-blur-md border-b border-[#E9E6DF]/40 px-6 py-4 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Heart className="w-4 h-4 fill-white text-white" />
              </div>
              <span className="font-heading text-lg text-[#1A1B18]">TaDaaaa</span>
            </Link>
            <Link
              href="/auth/signin"
              className="text-sm text-[#6F6E68] hover:text-[#3E6B5C] transition-colors font-medium"
            >
              Sign in
            </Link>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 bg-white text-[#3E6B5C] text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-[#A8C3B4]/40 shadow-sm uppercase tracking-widest">
            <Zap className="w-3 h-3 fill-current" />
            Pricing
          </span>
          <h1 className="font-heading text-5xl md:text-6xl text-[#1A1B18] mb-5">
            Simple, honest pricing
          </h1>
          <p className="text-[#6F6E68] text-lg max-w-xl mx-auto leading-relaxed">
            Start free. Upgrade when you want to do more. No subscriptions unless you want them.
          </p>
        </div>

        <PricingTiers plans={pricingPlans} isAuthed={isAuthed} />


        {/* Social proof */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#8A6F35] text-[#8A6F35]" />)}
          </div>
          <p className="text-[#6F6E68] text-sm text-center max-w-md">
            Loved by 12,400+ people who made someone&apos;s day unforgettable.
          </p>
          <p className="text-sm text-[#6F6E68]">
            Questions?{" "}
            <a href="mailto:hello@tadaaaa.app" className="text-[#3E6B5C] hover:underline font-medium">
              hello@tadaaaa.app
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
