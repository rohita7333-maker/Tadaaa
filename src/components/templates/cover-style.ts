import type { Theme } from "@/lib/themes";

/**
 * Layered cover art derived from a theme — soft accent glow + depth wash
 * stacked over the theme's own background gradient. Shared by the coverflow
 * fan and the collection cards so template covers always match their theme.
 */
export function coverBackground(theme: Theme): string {
  const { background, accent, accentLight } = theme.colors;
  return [
    `radial-gradient(120% 90% at 50% 18%, ${accentLight}59 0%, transparent 55%)`,
    `linear-gradient(160deg, transparent 45%, ${accent}33 100%)`,
    background,
  ].join(", ");
}
