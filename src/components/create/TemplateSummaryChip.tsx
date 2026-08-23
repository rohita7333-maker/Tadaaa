"use client";

import { Sparkles, SlidersHorizontal } from "lucide-react";
import { occasions, getThemeById } from "@/lib/themes";
import { REVEAL_STYLE_LABELS, type Template } from "@/lib/templates";

interface Props {
  template: Template;
  /** Leaves template mode and reveals the full occasion + theme pickers. */
  onChange: () => void;
}

/**
 * Template mode collapses step 1 into one plaque: the template already decided
 * the occasion, theme and reveal style, so the wizard never re-asks. "Change"
 * is the escape hatch back to the full pickers, prefilled with these values.
 */
export default function TemplateSummaryChip({ template, onChange }: Props) {
  const occasionLabel =
    occasions.find((o) => o.id === template.occasionId)?.label ?? "Custom";
  const themeName = getThemeById(template.themeId)?.name ?? template.themeId;
  const isPremium = template.tier === "premium";

  return (
    <div className="relative rounded-2xl border border-[#8A6F35]/35 bg-gradient-to-br from-[#FAF9F6] to-[#FDF1E3] p-5 shadow-[0_2px_12px_rgba(26,27,24,0.06)]">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="shrink-0 grid place-items-center w-12 h-12 rounded-xl bg-white/70 border border-[#8A6F35]/25 text-2xl"
        >
          {template.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-heading text-lg text-[#1A1B18] leading-tight">
              {template.name}
            </p>
            <span
              className={
                isPremium
                  ? "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#8A6F35]/12 text-[#8A6F35] border border-[#8A6F35]/30"
                  : "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#6B8F71]/10 text-[#4a6b50] border border-[#6B8F71]/25"
              }
            >
              {isPremium && <Sparkles className="w-2.5 h-2.5" />}
              {isPremium ? "Premium" : "Free"}
            </span>
          </div>

          <p className="mt-1 text-sm text-[#6F6E68] leading-snug">
            {occasionLabel} · {themeName} ·{" "}
            {REVEAL_STYLE_LABELS[template.revealType]}
          </p>
          <p className="mt-2 text-xs text-[#9B8E87] italic leading-snug">
            {template.tagline}
          </p>
        </div>

        <button
          type="button"
          onClick={onChange}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-[#E9E6DF] bg-white/80 text-xs font-medium text-[#1A1B18] hover:border-[#3E6B5C] hover:text-[#3E6B5C] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E6B5C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF9F6]"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Change
        </button>
      </div>
    </div>
  );
}
