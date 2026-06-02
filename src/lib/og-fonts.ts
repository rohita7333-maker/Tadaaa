/**
 * OG font loader for Satori/next-og.
 * Satori only accepts ttf/otf/woff — NOT woff2.
 * Fetches from jsDelivr fontsource CDN. Cached at module scope (fetch once).
 * Falls back gracefully if CDN is unavailable.
 */

const FRAUNCES_600 =
  "https://cdn.jsdelivr.net/fontsource/fonts/fraunces@latest/latin-600-normal.ttf";
const INTER_400 =
  "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf";
const INTER_700 =
  "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf";

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
}

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

// Cache the Promise so parallel calls share a single fetch sequence.
let _fontsPromise: Promise<OgFont[]> | null = null;

async function loadFonts(): Promise<OgFont[]> {
  const [fraunces, inter400, inter700] = await Promise.all([
    fetchFont(FRAUNCES_600),
    fetchFont(INTER_400),
    fetchFont(INTER_700),
  ]);

  const fonts: OgFont[] = [];
  if (fraunces) fonts.push({ name: "Fraunces", data: fraunces, weight: 600, style: "normal" });
  if (inter400) fonts.push({ name: "Inter", data: inter400, weight: 400, style: "normal" });
  if (inter700) fonts.push({ name: "Inter", data: inter700, weight: 700, style: "normal" });
  return fonts;
}

/**
 * Returns fonts array for ImageResponse. Falls back to [] on CDN failure
 * (Satori then uses system-ui — card still renders, just without custom fonts).
 */
export function getOgFonts(): Promise<OgFont[]> {
  if (!_fontsPromise) {
    _fontsPromise = loadFonts();
  }
  return _fontsPromise;
}
