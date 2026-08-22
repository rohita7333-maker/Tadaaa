"use client";

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
    // Mockup `.sumcard` anatomy in a single plaque: mist hairline, r-md, paper.
    <div className="rounded-[var(--r-md)] border border-mist bg-paper p-[18px] shadow-[var(--sh)]">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="font-heading text-[19px] leading-tight text-ink">
              {template.name}
            </p>
            <span
              className={
                isPremium
                  ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-coral-deep"
                  : "text-[10px] font-semibold uppercase tracking-[0.12em] text-stone"
              }
            >
              {isPremium ? "Premium" : "Free"}
            </span>
          </div>

          <p className="mt-1.5 text-[13px] leading-snug text-stone">
            {occasionLabel} · {themeName}
            <br />
            {REVEAL_STYLE_LABELS[template.revealType]}
          </p>
          <p className="mt-2 font-heading italic text-[15px] leading-snug text-stone">
            {template.tagline}
          </p>
        </div>

        <button
          type="button"
          onClick={onChange}
          className="ed-btn ed-btn-line ed-btn-sm shrink-0"
        >
          Change
        </button>
      </div>
    </div>
  );
}
