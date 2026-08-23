"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { filterTemplates } from "@/lib/templates";
import { pricingPlans } from "@/lib/pricing";
import type { ClientPlan } from "@/components/pricing/PricingTiers";
import {
  durations,
  easings,
  staggers,
  makeReducedMotionTransition,
} from "@/lib/motion";
import CoverflowFan from "./CoverflowFan";
import FilterChips from "./FilterChips";
import PriceChips, { type PriceFilterValue } from "./PriceChips";
import StyleTagChips from "./StyleTagChips";
import TemplateGrid from "./TemplateGrid";

const PAGE_SIZE = 8;

const HOW_IT_WORKS_STEPS = [
  {
    title: "Pick the occasion",
    body: "Birthday, proposal, anniversary — or just because. Each template sets the scene.",
  },
  {
    title: "Make it yours",
    body: "Their name, your words, your photos. A reveal page in under 3 minutes.",
  },
  {
    title: "Choose the reveal",
    body: "Tap, countdown, or a scroll story. You control the moment.",
  },
  {
    title: "Send one link",
    body: "They open it anywhere. You get their reaction — replies, photos, happy tears.",
  },
];

function formatAmount(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

/** Price line straight from pricing.ts — no invented numbers. */
function planPriceLines(plan: ClientPlan): { main: string; sub: string | null } {
  if (plan.monthlyPrice === null) return { main: "—", sub: null };
  const amount = formatAmount(plan.monthlyPrice);
  if (plan.periodOverride) return { main: `${amount} ${plan.periodOverride}`, sub: null };
  const sub =
    plan.yearlyPrice !== null && plan.yearlyPrice !== plan.monthlyPrice
      ? `or ${formatAmount(plan.yearlyPrice)}/yr`
      : null;
  return { main: `${amount}/mo`, sub };
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E6B5C] focus-visible:ring-offset-2";

interface TemplatesPageClientProps {
  /** Signed-in rendering. Two effects:
   * 1. The page renders the in-flow (sticky) dashboard header instead of the
   *    fixed marketing navbar, so the hero drops its big top padding.
   * 2. The marketing-only sections (how it works, pricing panel) are omitted —
   *    a signed-in user browsing templates is shopping, not being sold to. */
  authedChrome?: boolean;
}

export default function TemplatesPageClient({
  authedChrome = false,
}: TemplatesPageClientProps) {
  const reducedMotion = useReducedMotion();
  const [activeOccasion, setActiveOccasion] = useState("all");
  const [activeTier, setActiveTier] = useState<PriceFilterValue>("all");
  const [activeStyleTags, setActiveStyleTags] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () =>
      filterTemplates({
        occasionId: activeOccasion,
        tier: activeTier,
        styleTags: activeStyleTags,
      }),
    [activeOccasion, activeTier, activeStyleTags]
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const resultLabel = `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`;

  function handleOccasionChange(occasionId: string) {
    setActiveOccasion(occasionId);
    setVisibleCount(PAGE_SIZE);
  }

  function handleTierChange(tier: PriceFilterValue) {
    setActiveTier(tier);
    setVisibleCount(PAGE_SIZE);
  }

  function handleStyleTagToggle(tag: string) {
    setActiveStyleTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
    );
    setVisibleCount(PAGE_SIZE);
  }

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: makeReducedMotionTransition(reducedMotion, {
      duration: durations.slow,
      ease: easings.entrance,
      delay,
    }),
  });

  return (
    <div className="overflow-x-clip">
      {/* HERO */}
      <section
        aria-labelledby="templates-hero-heading"
        className={`px-6 pb-8 text-center ${authedChrome ? "pt-12" : "pt-32"}`}
      >
        {/* Hero renders statically visible: JS-gated entrance animation here delayed
            LCP by ~5s on throttled devices (H1 held at opacity 0 until hydration).
            Motion stays on below-fold sections only. */}
        <p className="mb-3 font-handwritten text-2xl text-[#3E6B5C]">
          psst… they have no idea
        </p>
        <h1
          id="templates-hero-heading"
          className="mx-auto max-w-3xl font-heading text-5xl leading-[1.05] text-[#1A1B18] md:text-6xl"
        >
          Reveal templates for <em className="text-[#3E6B5C]">every occasion</em>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#6F6E68]">
          Pick a template, add your words and photos, send one link. They open it —
          and the moment unfolds like a tiny film.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#collection"
            className={`rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] px-7 py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(62, 107, 92,0.35)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(62, 107, 92,0.5)] ${FOCUS_RING} focus-visible:ring-offset-[#FAF9F6]`}
          >
            Choose a template
          </a>
          <Link
            href="/surprise/demo"
            className={`rounded-full border border-[#1A1B18]/25 px-7 py-3 text-sm font-semibold text-[#1A1B18] transition-colors duration-300 hover:border-[#3E6B5C] hover:text-[#3E6B5C] ${FOCUS_RING} focus-visible:ring-offset-[#FAF9F6]`}
          >
            Watch a live reveal
          </Link>
        </div>
      </section>

      {/* COVERFLOW FAN */}
      <section aria-label="Featured templates" className="px-6 pb-20 pt-6">
        <div className="mx-auto max-w-6xl">
          <CoverflowFan />
        </div>
      </section>

      {/* COLLECTION */}
      <section
        id="collection"
        aria-labelledby="collection-heading"
        className="scroll-mt-24 px-6 pb-24"
      >
        <div className="mx-auto max-w-6xl">
          <motion.div {...enter(staggers.lead)} className="mb-8">
            <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-[#3E6B5C]">
              The Collection
            </span>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <h2 id="collection-heading" className="font-heading text-4xl text-[#1A1B18] md:text-5xl">
                Find their moment
              </h2>
              <p aria-hidden="true" className="pb-1 font-handwritten text-xl text-[#8A6F35]">
                every one animates ✨
              </p>
            </div>
          </motion.div>

          <div className="mb-6 flex flex-col gap-4">
            <FilterChips active={activeOccasion} onChange={handleOccasionChange} />
            <PriceChips active={activeTier} onChange={handleTierChange} />
            <StyleTagChips active={activeStyleTags} onToggle={handleStyleTagToggle} />
          </div>

          <p
            aria-live="polite"
            className="mb-6 text-sm font-medium text-[#6F6E68]"
          >
            {resultLabel}
          </p>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E9E6DF] bg-white/60 px-6 py-12 text-center text-[#6F6E68]">
              No templates match those filters yet — try clearing one.
            </p>
          ) : (
            <TemplateGrid items={visible} />
          )}

          {hasMore && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className={`rounded-full border border-[#E9E6DF] bg-white px-6 py-2.5 text-sm font-semibold text-[#1A1B18] transition-colors duration-300 hover:border-[#3E6B5C] hover:text-[#3E6B5C] ${FOCUS_RING} focus-visible:ring-offset-[#FAF9F6]`}
              >
                Load more templates
              </button>
            </div>
          )}
        </div>
      </section>

      {/* MARKETING-ONLY SECTIONS — a signed-in visitor already bought in, so the
          explainer band and the pricing panel are dropped for them. */}
      {!authedChrome && (
        <>
      {/* HOW IT WORKS */}
      <section aria-labelledby="templates-how-heading" className="px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-[#F6EADB] px-6 py-14 md:px-14 md:py-16">
          <motion.div {...enter(staggers.lead)} className="mb-12 text-center">
            <p className="mb-2 font-handwritten text-2xl text-[#3E6B5C]">easy, promise</p>
            <h2 id="templates-how-heading" className="font-heading text-4xl text-[#1A1B18] md:text-5xl">
              Four steps to a happy cry
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                {...enter(staggers.support + index * staggers.detail)}
                className="rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(26, 27, 24,0.05)]"
              >
                <span aria-hidden="true" className="block font-handwritten text-4xl text-[#8A6F35]">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-heading text-lg text-[#1A1B18]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6F6E68]">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING PANEL */}
      <section aria-labelledby="templates-pricing-heading" className="px-6 pb-24">
        <motion.div
          {...enter(staggers.lead)}
          className="mx-auto grid max-w-6xl gap-10 rounded-[32px] bg-[#1A1B18] px-6 py-14 min-[760px]:grid-cols-2 md:px-14 md:py-16"
        >
          <div>
            <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-[#8A6F35]">
              Simple, Honest Pricing
            </span>
            <h2 id="templates-pricing-heading" className="font-heading text-4xl leading-tight text-white md:text-5xl">
              Free to start. No credit card.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/70">
              2 free surprises a month. Go premium when the moment deserves it.
            </p>
            <Link
              href="/create"
              className={`mt-8 inline-block rounded-full bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] px-7 py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(62, 107, 92,0.35)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(62, 107, 92,0.5)] ${FOCUS_RING} focus-visible:ring-offset-[#1A1B18]`}
            >
              Make someone&apos;s day
            </Link>
          </div>
          <ul className="m-0 list-none divide-y divide-white/10 self-center p-0">
            {pricingPlans.map((plan) => {
              const price = planPriceLines(plan);
              return (
                <li key={plan.planKey} className="flex items-start justify-between gap-6 py-5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                    <p className="mt-1 text-sm leading-snug text-white/60">{plan.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-heading text-lg text-[#8A6F35]">{price.main}</span>
                    {price.sub && (
                      <span className="block text-xs text-[#E8D9BD]/80">{price.sub}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </section>
        </>
      )}
    </div>
  );
}
