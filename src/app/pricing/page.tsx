import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PricingTiers from "@/components/pricing/PricingTiers";
import PricingFAQ from "@/components/pricing/PricingFAQ";
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
    <div className="min-h-screen bg-paper">
      {/* Header */}
      {isAuthed ? (
        <DashboardNavServer activeRoute="pricing" />
      ) : (
        /* Mockup `.topnav` — paper ground, single mist hairline, serif logo. */
        <header className="sticky top-0 z-40 bg-paper border-b border-mist">
          <div className="max-w-[1080px] mx-auto flex items-center justify-between gap-[18px] px-5 py-3.5">
            <Link href="/" className="font-heading text-xl text-ink">
              TaDaaaa<span className="text-coral not-italic">.</span>
            </Link>
            <Link
              href="/auth/signin"
              className="text-[13px] font-semibold uppercase tracking-[0.06em] text-stone hover:text-ink transition-colors"
            >
              Sign in
            </Link>
          </div>
        </header>
      )}

      <main className="max-w-[1080px] mx-auto px-6 pt-12 pb-28">
        {/* Mockup pricing head — centred, 34px serif, 15px sub capped at 520px. */}
        <div className="text-center mb-12">
          <h1 className="text-[34px]">Simple, honest pricing</h1>
          <p className="text-[15px] max-w-[520px] mx-auto mt-3">
            Start free. Upgrade when you want to do more. No subscriptions
            unless you want them.
          </p>
        </div>

        <PricingTiers plans={pricingPlans} isAuthed={isAuthed} />

        <PricingFAQ />

        <p className="text-sm text-stone text-center mt-10">
          Still stuck?{" "}
          <a
            href="mailto:hello@tadaaaa.app"
            className="text-coral-deep font-semibold hover:underline"
          >
            hello@tadaaaa.app
          </a>
        </p>
      </main>
    </div>
  );
}
