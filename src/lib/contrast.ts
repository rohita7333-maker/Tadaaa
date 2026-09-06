/**
 * WCAG contrast maths, used to keep text legible on top of a *theme* colour.
 *
 * Recipient themes live in `themes.ts`, which is byte-locked with the mobile
 * app, so accents can't be adjusted for legibility. Instead the surface picks
 * whichever foreground actually wins against the accent it was handed — the
 * reveal's Continue button measured 3.44:1 (white on gold), below the 4.5:1
 * AA floor, before this existed.
 */

/** The app's ink, from the pine identity. */
export const INK = "#1A1B18";
export const PAPER_WHITE = "#FFFFFF";

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative luminance per WCAG 2.1. */
function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const channel = v / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colours, 1–21. Unparseable input yields 1. */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return 1;
  const la = luminance(ca);
  const lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Ink or white — whichever is more readable on `background`. Ties and
 * unparseable colours fall to ink, the safer default on the light grounds
 * these themes favour.
 */
export function readableTextOn(background: string): string {
  const onInk = contrastRatio(INK, background);
  const onWhite = contrastRatio(PAPER_WHITE, background);
  return onWhite > onInk ? PAPER_WHITE : INK;
}
