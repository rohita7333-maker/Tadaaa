"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { filterTemplates } from "@/lib/templates";
import { pricingPlans } from "@/lib/pricing";
import type { ClientPlan } from "@/components/pricing/PricingTiers";
import CoverflowFan from "./CoverflowFan";
import FilterChips from "./FilterChips";
import PriceChips, { type PriceFilterValue } from "./PriceChips";
import StyleTagChips from "./StyleTagChips";
import TemplateGrid from "./TemplateGrid";

const PAGE_SIZE = 8;

const HOW_IT_WORKS_STEPS = [
  {
    title: "Pick the occasion",
    body: "Birthday, proposal, anniversary, or just because. Each template sets the scene.",
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
    body: "They open it anywhere. You get their reaction: replies, photos, happy tears.",
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

interface TemplatesPageClientProps {
  /** Signed-in rendering. Two effects:
   * 1. The page opens on the mockup's `.ed-phead` (title + one-line sub)
   *    instead of the marketing hero, under the in-flow dashboard header.
   * 2. The marketing-only sections (how it works, pricing panel) are omitted —
   *    a signed-in user browsing templates is shopping, not being sold to. */
  authedChrome?: boolean;
}

export default function TemplatesPageClient({
  authedChrome = false,
}: TemplatesPageClientProps) {
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

  return (
    <div className="overflow-x-clip">
      {authedChrome ? (
        /* IN-APP HEAD — mockup templates screen (tadaaaa-editorial.html:690-691) */
        <section
          aria-labelledby="templates-hero-heading"
          className="mx-auto max-w-6xl px-6 pt-10"
        >
          <div className="ed-phead !mb-0">
            <div>
              <h1 id="templates-hero-heading" className="font-heading">
                Templates
              </h1>
              <p className="ed-sub">Start from a look. Make it yours.</p>
            </div>
            <Link href="/surprise/demo" className="ed-btn ed-btn-line ed-btn-sm">
              Watch a live reveal
            </Link>
          </div>
        </section>
      ) : (
        /* MARKETING HERO — editorial voice: uppercase label, roman display,
           one measured paragraph, two buttons. No italic emphasis word. */
        <section
          aria-labelledby="templates-hero-heading"
          className="mx-auto max-w-3xl px-6 pb-8 pt-32 text-center"
        >
          {/* Hero renders statically visible: JS-gated entrance animation here delayed
              LCP by ~5s on throttled devices (H1 held at opacity 0 until hydration).
              Motion stays on below-fold sections only. */}
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone">
            The template collection
          </p>
          <h1
            id="templates-hero-heading"
            className="mt-4 font-heading text-5xl leading-[1.05] text-ink md:text-6xl"
          >
            A reveal for <span className="text-coral-deep">every occasion</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-stone">
            Pick a template, add your words and photos, send one link. They open
            it, and the moment unfolds like a tiny film.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#collection" className="ed-btn ed-btn-coral">
              Choose a template
            </a>
            <Link href="/surprise/demo" className="ed-btn ed-btn-line">
              Watch a live reveal
            </Link>
          </div>
        </section>
      )}

      {/* COVERFLOW FAN */}
      <section aria-label="Featured templates" className="px-6 pb-20 pt-8">
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
          <div className="mb-7">
            <h2
              id="collection-heading"
              className="font-heading text-4xl text-ink md:text-5xl"
            >
              Find their moment
            </h2>
          </div>

          {/* Facet rail — three chip rows, one visual family (.ed-chip). */}
          <div className="mb-6 flex flex-col gap-3">
            <FilterChips active={activeOccasion} onChange={handleOccasionChange} />
            <PriceChips active={activeTier} onChange={handleTierChange} />
            <StyleTagChips active={activeStyleTags} onToggle={handleStyleTagToggle} />
          </div>

          {/* Result count — mockup `.rescount` (tadaaaa-editorial.html:285) */}
          <p aria-live="polite" className="mb-[18px] text-[13px] text-stone">
            {resultLabel}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-[var(--r-md)] border border-mist bg-paper">
              <p className="ed-empty">
                No templates match those filters yet. Try clearing one.
              </p>
            </div>
          ) : (
            <TemplateGrid items={visible} />
          )}

          {hasMore && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="ed-btn ed-btn-line"
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
            <div className="mx-auto max-w-6xl rounded-[var(--r-md)] border border-mist bg-pebble px-6 py-14 md:px-14 md:py-16">
              <h2
                id="templates-how-heading"
                className="mb-12 font-heading text-4xl text-ink md:text-5xl"
              >
                Four steps to a happy cry
              </h2>
              <ol className="m-0 grid list-none grid-cols-1 gap-x-10 gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
                {HOW_IT_WORKS_STEPS.map((step, index) => (
                  <li key={step.title} className="border-t border-sand pt-5">
                    <span
                      aria-hidden="true"
                      className="block font-heading text-2xl text-sand-deep"
                    >
                      {index + 1}
                    </span>
                    <h3 className="mt-2 font-heading text-lg text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone">
                      {step.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* PRICING PANEL */}
          <section aria-labelledby="templates-pricing-heading" className="px-6 pb-24">
            <div className="mx-auto grid max-w-6xl gap-10 rounded-[var(--r-md)] bg-ink px-6 py-14 min-[760px]:grid-cols-2 md:px-14 md:py-16">
              <div>
                <h2
                  id="templates-pricing-heading"
                  className="font-heading text-4xl leading-tight !text-paper md:text-5xl"
                >
                  Free to start. No credit card.
                </h2>
                <p className="mt-4 max-w-md leading-relaxed !text-sand-light">
                  2 free surprises a month. Go premium when the moment deserves it.
                </p>
                <Link href="/create" className="ed-btn ed-btn-coral mt-8">
                  Make someone&apos;s day
                </Link>
              </div>
              <ul className="m-0 list-none divide-y divide-stone self-center p-0">
                {pricingPlans.map((plan) => {
                  const price = planPriceLines(plan);
                  return (
                    <li
                      key={plan.planKey}
                      className="flex items-start justify-between gap-6 py-5"
                    >
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold !text-paper">
                          {plan.name}
                        </h3>
                        <p className="mt-1 text-sm leading-snug !text-sand-light">
                          {plan.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-heading text-lg !text-sand">
                          {price.main}
                        </span>
                        {price.sub && (
                          <span className="block text-xs !text-sand-light">
                            {price.sub}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
