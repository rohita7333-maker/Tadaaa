import Link from "next/link";
import type { Template } from "@/lib/templates";
import { REVEAL_STYLE_LABELS } from "@/lib/templates";
import { getThemeById } from "@/lib/themes";
import { palette } from "@/lib/design-tokens";
import { coverBackground } from "./cover-style";

interface Props {
  template: Template;
}

/**
 * Template card, editorial layer.
 *
 * The mockup's `.tgrid` cards (tadaaaa-editorial.html:286) are paper on a
 * hairline mist border with a 12px radius — no drop shadow, no lift. Hover is
 * a border darkening, matching `.ed-stat` and `.ed-chip`. Focus is the global
 * coral `:focus-visible` outline, so no per-card ring class.
 *
 * The `?template=` handoff to /create is unchanged.
 */
export default function TemplateCard({ template }: Props) {
  const theme = getThemeById(template.themeId);
  const isPremium = template.tier === "premium";
  const tierLabel = isPremium ? "Premium" : "Free";

  return (
    <Link
      href={`/create?template=${template.id}`}
      className="group block rounded-[var(--r-md)]"
    >
      <article className="overflow-hidden rounded-[var(--r-md)] border border-mist bg-paper transition-colors duration-200 group-hover:border-ink">
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
                : palette.pebble
              : undefined,
          }}
        >
          <span
            className="ed-pill absolute left-3 top-3 backdrop-blur-sm"
            style={{
              background: `color-mix(in srgb, ${palette.paper} 85%, transparent)`,
              borderColor: palette.mist,
              color: palette.ink,
            }}
          >
            {REVEAL_STYLE_LABELS[template.revealType]}
          </span>
          {/* Cover art replaces the emoji glyph — it already carries the mood. */}
          {!template.art?.cover && (
            <span
              aria-hidden="true"
              className="text-6xl transition-transform duration-300 ease-out group-hover:scale-105"
            >
              {template.emoji}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-mist p-4">
          <div className="min-w-0">
            <h3 className="font-heading text-lg leading-tight text-ink">
              {template.name}
            </h3>
            <p className="mt-1 text-sm leading-snug text-stone">
              {template.tagline}
            </p>
          </div>
          {/* Premium reads in the AA-safe deep coral; free stays quiet in stone. */}
          <span
            className={`shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
              isPremium ? "text-coral-deep" : "text-stone"
            }`}
          >
            {tierLabel}
          </span>
        </div>
      </article>
    </Link>
  );
}
