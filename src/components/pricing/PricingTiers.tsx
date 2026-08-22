"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import GiftCTA from "@/components/pricing/GiftCTA";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type ClientPlan = {
  name: string;
  monthlyPrice: number | null; // null = price not shown numerically (e.g. Free=$0 handled; gift uses one-time)
  yearlyPrice: number | null;
  /** Override "/period" suffix (e.g. "per surprise", "one invite"). If null, uses month/year toggle label. */
  periodOverride: string | null;
  description: string;
  cta: string;
  planKey: "free" | "plus" | "unlimited" | "gift";
  highlight: boolean;
  badge: string | null;
  features: string[];
  /** Optional checkout target — null lets the component infer */
  isOneTime?: boolean;
};

interface Props {
  plans: ClientPlan[];
  isAuthed: boolean;
}

// Mockup `.btn` — pill, 13px/600/.08em uppercase, 44px tap target,
// transform+shadow+background over 180ms, scale(.98) on press. Horizontal
// padding is 12px rather than the mockup's 30px: these are full-width block
// buttons inside a ~243px column, where the pill's own padding is invisible
// but 30px of it forces the real CTA labels onto two lines.
const BTN =
  "inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-3 py-[14px] rounded-full text-[13px] font-semibold uppercase tracking-[0.08em] transition-[transform,box-shadow,background-color] duration-[180ms] ease-out active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_CORAL = `${BTN} bg-coral text-white hover:bg-coral-deep hover:shadow-[var(--sh-card)]`;
const BTN_LINE = `${BTN} bg-paper border border-mist text-ink hover:border-ink`;

// Mockup `.authtabs` segmented control, reused for billing cadence.
const SEG_ON = "bg-paper text-ink shadow-[var(--sh)]";
const SEG_OFF = "text-stone hover:text-ink";

export default function PricingTiers({ plans, isAuthed }: Props) {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <>
      {/* Billing cadence — only the Unlimited tier prices differ today, but the
          control is global so future per-year plans hook in unchanged. */}
      <div className="flex justify-center mb-8">
        <div
          role="radiogroup"
          aria-label="Billing cadence"
          className="inline-flex gap-1.5 p-[5px] rounded-[12px] bg-pebble"
        >
          {(
            [
              ["Monthly", false],
              ["Yearly", true],
            ] as const
          ).map(([label, yearly]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={isYearly === yearly}
              onClick={() => setIsYearly(yearly)}
              className={`min-h-[44px] px-6 rounded-[9px] text-sm font-semibold transition-colors duration-150 ease-out ${
                isYearly === yearly ? SEG_ON : SEG_OFF
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-[18px] max-w-[1080px] mx-auto grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-stretch">
        {plans.map((plan) => {
          const price = isYearly
            ? plan.yearlyPrice ?? plan.monthlyPrice
            : plan.monthlyPrice;
          const shownPrice = price ?? 0;
          const periodLabel =
            plan.periodOverride ?? (isYearly ? "per year" : "per month");

          return (
            <div
              key={plan.name}
              className={`flex flex-col text-left bg-paper rounded-[var(--r-md)] px-7 py-8 ${
                plan.highlight ? "border-2 border-coral" : "border border-mist"
              }`}
            >
              {/* Mockup `.label` eyebrow, written as utilities so the highlight
                  colour can win — globals.css `.label` is unlayered and would
                  otherwise beat a Tailwind colour utility. */}
              <p
                className={`text-xs font-semibold uppercase tracking-[0.12em] mb-2 ${
                  plan.highlight ? "text-coral-deep" : "text-stone"
                }`}
              >
                {plan.badge ?? " "}
              </p>

              <h2 className="text-[19px]">{plan.name}</h2>

              {/* Every figure comes from src/lib/pricing.ts — no price literal
                  is ever written into this markup. */}
              <div className="font-heading text-[38px] leading-none mt-2.5 mb-0.5 text-ink">
                <NumberFlow
                  value={shownPrice}
                  prefix="$"
                  format={{
                    minimumFractionDigits: Number.isInteger(shownPrice) ? 0 : 2,
                    maximumFractionDigits: 2,
                  }}
                />
              </div>
              <p className="text-[13px] text-stone mb-[18px]">{periodLabel}</p>

              <ul className="list-none flex-1 mb-[22px]">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="text-sm text-stone py-1.5 border-b border-pebble"
                  >
                    {f}
                  </li>
                ))}
              </ul>

              <PlanCTA plan={plan} isAuthed={isAuthed} isYearly={isYearly} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function PlanCTA({
  plan,
  isAuthed,
  isYearly,
}: {
  plan: ClientPlan;
  isAuthed: boolean;
  isYearly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (plan.planKey === "free") {
      router.push(isAuthed ? "/dashboard" : "/auth/signup");
      return;
    }
    if (plan.planKey === "plus") {
      router.push(isAuthed ? "/create" : "/auth/signup?next=/create");
      return;
    }
    // unlimited
    if (!isAuthed) {
      router.push("/auth/signup?next=/pricing");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "unlimited",
          cadence: isYearly ? "yearly" : "monthly",
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(data.error || "Checkout failed");
    } catch {
      toast.error("Could not start checkout — try again");
    } finally {
      setLoading(false);
    }
  }

  const className = plan.highlight ? BTN_CORAL : BTN_LINE;

  // Gift needs a recipient email before checkout can start — GiftCTA owns
  // that modal + its own submit; it isn't the same one-click flow as the
  // other tiers.
  if (plan.planKey === "gift") {
    return <GiftCTA label={plan.cta} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className={className}
    >
      {loading ? "Loading…" : plan.cta}
    </button>
  );
}
