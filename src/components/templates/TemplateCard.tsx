import Link from "next/link";
import type { Template } from "@/lib/templates";
import { REVEAL_STYLE_LABELS } from "@/lib/templates";
import { getThemeById } from "@/lib/themes";
import { coverBackground } from "./cover-style";

interface Props {
  template: Template;
}

export default function TemplateCard({ template }: Props) {
  const theme = getThemeById(template.themeId);
  const isPremium = template.tier === "premium";
  const tierLabel = isPremium ? "Premium" : "Free";

  return (
    <Link
      href={`/create?template=${template.id}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C4686D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8F0]"
    >
      <article className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(45,41,38,0.06)] transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_16px_40px_rgba(45,41,38,0.15)]">
        <div
          className="relative flex items-center justify-center bg-cover bg-center"
          style={{
            aspectRatio: "3 / 3.4",
            backgroundImage: template.art?.cover
              ? `url(${template.art.cover})`
              : undefined,
            background: !template.art?.cover
              ? theme
                ? coverBackground(theme)
                : "#FFF8F0"
              : undefined,
          }}
        >
          <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-[#2D2926] backdrop-blur-sm">
            {REVEAL_STYLE_LABELS[template.revealType]}
          </span>
          {/* Cover art replaces the emoji glyph — it already carries the mood. */}
          {!template.art?.cover && (
            <span
              aria-hidden="true"
              className="text-6xl transition-transform duration-300 ease-out group-hover:rotate-6 group-hover:scale-110"
            >
              {template.emoji}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="font-heading text-lg leading-tight text-[#2D2926]">
              {template.name}
            </h3>
            {/* rose-deep: 4.5:1 small-text contrast on white (a11y) */}
            <p className="mt-0.5 font-handwritten text-base leading-snug text-[#9B3D42]">
              {template.tagline}
            </p>
          </div>
          {/* #8A6F35 not #C9A96E: the lighter gold fails WCAG AA (2.24:1) at this
              text-xs weight — same darker gold already used for the premium
              badge text in TemplateSummaryChip (5.87:1). */}
          <span
            className={`shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wider ${
              isPremium ? "text-[#8A6F35]" : "text-[#6B5E57]"
            }`}
          >
            {tierLabel}
          </span>
        </div>
      </article>
    </Link>
  );
}
