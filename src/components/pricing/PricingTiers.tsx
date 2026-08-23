"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { MagneticButton } from "@/components/ui/magnetic-button";
import GiftCTA from "@/components/pricing/GiftCTA";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getReducedMotionTransition } from "@/lib/a11y";

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

export default function PricingTiers({ plans, isAuthed }: Props) {
  const shouldReduce = useReducedMotion();
  const [isYearly, setIsYearly] = useState(true);

  return (
    <>
      {/* Billing cadence toggle — only meaningful for the Unlimited tier today,
          but surfaced globally so future plus/year plans can hook in. */}
      <div className="flex justify-center mb-10">
        <div
          role="radiogroup"
          aria-label="Billing cadence"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-[#E9E6DF]/40 shadow-sm"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isYearly}
            onClick={() => setIsYearly(false)}
            className={`px-5 py-2 text-xs font-semibold rounded-full transition-colors ${
              !isYearly
                ? "bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white shadow"
                : "text-[#6F6E68] hover:text-[#1A1B18]"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isYearly}
            onClick={() => setIsYearly(true)}
            className={`px-5 py-2 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 ${
              isYearly
                ? "bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] text-white shadow"
                : "text-[#6F6E68] hover:text-[#1A1B18]"
            }`}
          >
            Yearly
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isYearly ? "bg-white/25 text-white" : "bg-[#8A6F35]/15 text-[#8A6F35]"
              }`}
            >
              2 mo free
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {plans.map((plan) => {
          const showNumeric = plan.monthlyPrice !== null;
          const price = isYearly
            ? plan.yearlyPrice ?? plan.monthlyPrice
            : plan.monthlyPrice;
          const periodLabel =
            plan.periodOverride ?? (isYearly ? "per year" : "per month");

          return (
            <SpotlightCard
              key={plan.name}
              bare
              className={`rounded-3xl flex flex-col relative overflow-hidden ${
                plan.highlight
                  ? "bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] text-white shadow-[0_12px_48px_rgba(62, 107, 92,0.35)]"
                  : "bg-white shadow-[0_4px_24px_rgba(26, 27, 24,0.06)] border border-[#E9E6DF]/30"
              }`}
              spotlightColor={
                plan.highlight
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(244, 213, 215, 0.55)"
              }
            >
              <div className="p-8 flex flex-col h-full">
                {plan.badge && (
                  <motion.div
                    initial={shouldReduce ? false : { scale: 1 }}
                    animate={
                      shouldReduce
                        ? undefined
                        : { scale: [1, 1.05, 1] }
                    }
                    transition={
                      shouldReduce
                        ? undefined
                        : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }
                    className={`absolute top-5 right-5 text-xs font-bold px-2.5 py-1 rounded-full ${
                      plan.highlight
                        ? "bg-white/20 text-white"
                        : "bg-[#8A6F35]/15 text-[#8A6F35]"
                    }`}
                  >
                    {plan.badge}
                  </motion.div>
                )}

                <div className="mb-7">
                  <h2
                    className={`font-heading text-xl mb-3 ${
                      plan.highlight ? "text-white" : "text-[#1A1B18]"
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <div className="flex items-end gap-1 mb-2">
                    {showNumeric && price !== null ? (
                      <span
                        className={`font-heading text-5xl font-bold leading-none ${
                          plan.highlight ? "text-white" : "text-[#1A1B18]"
                        }`}
                      >
                        <NumberFlow
                          value={price}
                          prefix="$"
                          format={{
                            minimumFractionDigits:
                              Number.isInteger(price) ? 0 : 2,
                            maximumFractionDigits: 2,
                          }}
                        />
                      </span>
                    ) : (
                      <span
                        className={`font-heading text-5xl font-bold leading-none ${
                          plan.highlight ? "text-white" : "text-[#1A1B18]"
                        }`}
                      >
                        $0
                      </span>
                    )}
                    <span
                      className={`text-sm mb-1.5 ${
                        plan.highlight ? "opacity-60" : "text-[#6F6E68]"
                      }`}
                    >
                      /{periodLabel}
                    </span>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      plan.highlight ? "opacity-70" : "text-[#6F6E68]"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: shouldReduce ? 0 : -4 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={getReducedMotionTransition(shouldReduce, {
                        duration: 0.35,
                        delay: i * 0.05,
                      })}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          plan.highlight ? "text-white/80" : "text-[#3E6B5C]"
                        }`}
                      />
                      <span
                        className={
                          plan.highlight ? "text-white/90" : "text-[#1A1B18]"
                        }
                      >
                        {f}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <PlanCTA plan={plan} isAuthed={isAuthed} isYearly={isYearly} />
              </div>
            </SpotlightCard>
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

  // Preserve light/dark CTA variant. Highlight card uses inverted (white bg / rose text).
  const className = plan.highlight
    ? "w-full bg-white text-[#3E6B5C] hover:bg-[#FFF0E8] shadow-lg from-white to-white"
    : "w-full";

  // Gift needs a recipient email before checkout can start — GiftCTA owns
  // that modal + its own submit; it isn't the same one-click flow as the
  // other tiers.
  if (plan.planKey === "gift") {
    return <GiftCTA label={plan.cta} className={className} />;
  }

  return (
    <MagneticButton
      type="button"
      onClick={handle}
      disabled={loading}
      className={className}
    >
      {loading ? "Loading…" : plan.cta}
    </MagneticButton>
  );
}
