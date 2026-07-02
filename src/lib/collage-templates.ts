/**
 * Collage template registry.
 * Pure data module — no React, no Satori imports.
 * Templates define a canvas size, background, and an array of slots
 * specified as percentages of the canvas dimensions. Slots are either
 * photo slots or a single text caption slot (`caption: true`).
 *
 * Templates are bucketed by `photoCount` (number of photo slots) so a
 * download can pick a layout that exactly matches the number of uploaded
 * photos — never leaving an empty hole. Multiple templates may share a
 * count; the route random-picks one per download for variety.
 */

export interface CollageSlot {
  /** Percentages of canvas width/height, top-left origin (0–100) */
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  rotateDeg: number;
  /** White photo-frame thickness in px (0 = no frame) */
  frame: number;
  /** Extra bottom frame px for polaroid caption strip (0 = none) */
  captionStrip?: number;
  /** Border radius in px (default 4) */
  radius?: number;
  /** Stacking order; higher = front (default 1) */
  z?: number;
  /** When true this slot renders the caption text, not a photo. */
  caption?: boolean;
}

export interface CollageTemplate {
  id: string;
  label: string;
  width: number;
  height: number;
  /** CSS background value (solid colour or gradient string) for the board */
  background: string;
  /** Number of photo slots (slots where `caption` is not true). */
  photoCount: number;
  /** Caption rendered inside the hero polaroid strip; falls back to invite title */
  heroCaption?: string;
  /** Index of the hero slot in `slots` (gets first photo + caption). Default 0 */
  heroSlotIndex?: number;
  slots: CollageSlot[];
}

/** Shared warm-cream board dimensions for the count-bucketed layouts. */
const BOARD_W = 1080;
const BOARD_H = 1350;
const BOARD_BG = "#EDE7DE";

/** Caption band shared by the count-bucketed layouts (bottom, full width). */
const CAPTION_SLOT: CollageSlot = {
  xPct: 6,
  yPct: 83,
  wPct: 88,
  hPct: 13,
  rotateDeg: 0,
  frame: 0,
  radius: 12,
  caption: true,
};

/**
 * Build a count-bucketed template from a set of photo-slot rects.
 * Applies shared frame/radius defaults and appends the caption slot.
 */
function board(
  id: string,
  label: string,
  photoRects: Array<Pick<CollageSlot, "xPct" | "yPct" | "wPct" | "hPct">>
): CollageTemplate {
  const photoSlots: CollageSlot[] = photoRects.map((r) => ({
    ...r,
    rotateDeg: 0,
    frame: 12,
    radius: 8,
    z: 1,
  }));
  return {
    id,
    label,
    width: BOARD_W,
    height: BOARD_H,
    background: BOARD_BG,
    photoCount: photoSlots.length,
    heroSlotIndex: 0,
    slots: [...photoSlots, CAPTION_SLOT],
  };
}

export const COLLAGE_TEMPLATES: Record<string, CollageTemplate> = {
  // ── 1 photo ──────────────────────────────────────────────────────────
  "photos-1a": board("photos-1a", "Single", [
    { xPct: 3, yPct: 3, wPct: 94, hPct: 77 },
  ]),

  // ── 2 photos ─────────────────────────────────────────────────────────
  "photos-2a": board("photos-2a", "Duo Side", [
    { xPct: 3, yPct: 3, wPct: 46, hPct: 77 },
    { xPct: 51, yPct: 3, wPct: 46, hPct: 77 },
  ]),
  "photos-2b": board("photos-2b", "Duo Stack", [
    { xPct: 3, yPct: 3, wPct: 94, hPct: 37.5 },
    { xPct: 3, yPct: 42.5, wPct: 94, hPct: 37.5 },
  ]),

  // ── 3 photos ─────────────────────────────────────────────────────────
  "photos-3a": board("photos-3a", "Hero + Two", [
    { xPct: 3, yPct: 3, wPct: 56, hPct: 77 },
    { xPct: 61, yPct: 3, wPct: 36, hPct: 37.5 },
    { xPct: 61, yPct: 42.5, wPct: 36, hPct: 37.5 },
  ]),
  "photos-3b": board("photos-3b", "Three Columns", [
    { xPct: 3, yPct: 3, wPct: 30, hPct: 77 },
    { xPct: 35, yPct: 3, wPct: 30, hPct: 77 },
    { xPct: 67, yPct: 3, wPct: 30, hPct: 77 },
  ]),

  // ── 4 photos ─────────────────────────────────────────────────────────
  "photos-4a": board("photos-4a", "Quad Grid", [
    { xPct: 3, yPct: 3, wPct: 46, hPct: 37.5 },
    { xPct: 51, yPct: 3, wPct: 46, hPct: 37.5 },
    { xPct: 3, yPct: 42.5, wPct: 46, hPct: 37.5 },
    { xPct: 51, yPct: 42.5, wPct: 46, hPct: 37.5 },
  ]),

  // ── 5 photos ─────────────────────────────────────────────────────────
  "photos-5a": board("photos-5a", "Two + Three", [
    { xPct: 3, yPct: 3, wPct: 46, hPct: 37.5 },
    { xPct: 51, yPct: 3, wPct: 46, hPct: 37.5 },
    { xPct: 3, yPct: 42.5, wPct: 30, hPct: 37.5 },
    { xPct: 35, yPct: 42.5, wPct: 30, hPct: 37.5 },
    { xPct: 67, yPct: 42.5, wPct: 30, hPct: 37.5 },
  ]),

  // ── 6 photos ─────────────────────────────────────────────────────────
  "photos-6a": board("photos-6a", "Three by Two", [
    { xPct: 3, yPct: 3, wPct: 30, hPct: 37.5 },
    { xPct: 35, yPct: 3, wPct: 30, hPct: 37.5 },
    { xPct: 67, yPct: 3, wPct: 30, hPct: 37.5 },
    { xPct: 3, yPct: 42.5, wPct: 30, hPct: 37.5 },
    { xPct: 35, yPct: 42.5, wPct: 30, hPct: 37.5 },
    { xPct: 67, yPct: 42.5, wPct: 30, hPct: 37.5 },
  ]),
  "photos-6b": board("photos-6b", "Two by Three", [
    { xPct: 3, yPct: 3, wPct: 46, hPct: 24.33 },
    { xPct: 51, yPct: 3, wPct: 46, hPct: 24.33 },
    { xPct: 3, yPct: 29.33, wPct: 46, hPct: 24.33 },
    { xPct: 51, yPct: 29.33, wPct: 46, hPct: 24.33 },
    { xPct: 3, yPct: 55.66, wPct: 46, hPct: 24.33 },
    { xPct: 51, yPct: 55.66, wPct: 46, hPct: 24.33 },
  ]),

  // ── 7 photos ─────────────────────────────────────────────────────────
  "photos-7a": board("photos-7a", "Three + Two + Two", [
    { xPct: 3, yPct: 3, wPct: 30, hPct: 24.33 },
    { xPct: 35, yPct: 3, wPct: 30, hPct: 24.33 },
    { xPct: 67, yPct: 3, wPct: 30, hPct: 24.33 },
    { xPct: 3, yPct: 29.33, wPct: 46, hPct: 24.33 },
    { xPct: 51, yPct: 29.33, wPct: 46, hPct: 24.33 },
    { xPct: 3, yPct: 55.66, wPct: 46, hPct: 24.33 },
    { xPct: 51, yPct: 55.66, wPct: 46, hPct: 24.33 },
  ]),

  // ── 8 photos ─────────────────────────────────────────────────────────
  "photos-8a": board("photos-8a", "Four by Two", [
    { xPct: 3, yPct: 3, wPct: 22, hPct: 37.5 },
    { xPct: 27, yPct: 3, wPct: 22, hPct: 37.5 },
    { xPct: 51, yPct: 3, wPct: 22, hPct: 37.5 },
    { xPct: 75, yPct: 3, wPct: 22, hPct: 37.5 },
    { xPct: 3, yPct: 42.5, wPct: 22, hPct: 37.5 },
    { xPct: 27, yPct: 42.5, wPct: 22, hPct: 37.5 },
    { xPct: 51, yPct: 42.5, wPct: 22, hPct: 37.5 },
    { xPct: 75, yPct: 42.5, wPct: 22, hPct: 37.5 },
  ]),

  // ── 9 photos ─────────────────────────────────────────────────────────
  "photos-9a": board("photos-9a", "Three by Three", [
    { xPct: 3, yPct: 3, wPct: 30, hPct: 24.33 },
    { xPct: 35, yPct: 3, wPct: 30, hPct: 24.33 },
    { xPct: 67, yPct: 3, wPct: 30, hPct: 24.33 },
    { xPct: 3, yPct: 29.33, wPct: 30, hPct: 24.33 },
    { xPct: 35, yPct: 29.33, wPct: 30, hPct: 24.33 },
    { xPct: 67, yPct: 29.33, wPct: 30, hPct: 24.33 },
    { xPct: 3, yPct: 55.66, wPct: 30, hPct: 24.33 },
    { xPct: 35, yPct: 55.66, wPct: 30, hPct: 24.33 },
    { xPct: 67, yPct: 55.66, wPct: 30, hPct: 24.33 },
  ]),

  // ── Signature scrapbook (8 photos, hero polaroid + caption strip) ─────
  "polaroid-scrapbook": {
    id: "polaroid-scrapbook",
    label: "Polaroid Scrapbook",
    width: 1200,
    height: 1500,
    background: "#EDE7DE",
    photoCount: 8,
    heroCaption: "Happy Birthday!",
    heroSlotIndex: 0,
    slots: [
      // Index 0 — hero (large centred polaroid, drawn on top)
      {
        xPct: 28, yPct: 19, wPct: 44, hPct: 53,
        rotateDeg: -2, frame: 22, captionStrip: 90, radius: 4, z: 10,
      },
      { xPct: 1, yPct: 3, wPct: 30, hPct: 25, rotateDeg: -5, frame: 10, z: 1 },
      { xPct: 25, yPct: 1, wPct: 26, hPct: 21, rotateDeg: 4, frame: 10, z: 2 },
      { xPct: 70, yPct: 2, wPct: 28, hPct: 29, rotateDeg: 5, frame: 10, z: 1 },
      { xPct: 1, yPct: 34, wPct: 24, hPct: 25, rotateDeg: -4, frame: 10, z: 1 },
      { xPct: 73, yPct: 34, wPct: 26, hPct: 25, rotateDeg: 6, frame: 10, z: 1 },
      { xPct: 3, yPct: 69, wPct: 35, hPct: 28, rotateDeg: -3, frame: 10, z: 1 },
      { xPct: 56, yPct: 70, wPct: 42, hPct: 27, rotateDeg: 3, frame: 10, z: 1 },
    ],
  },
};

/**
 * Look up a template by id. Returns null for unknown or missing ids.
 */
export function getCollageTemplate(
  id: string | null | undefined
): CollageTemplate | null {
  if (!id) return null;
  return COLLAGE_TEMPLATES[id] ?? null;
}

/**
 * All templates whose photo-slot count equals `count`.
 * Empty array when no template matches (e.g. count 0 or out of range).
 */
export function getCollageTemplatesForCount(count: number): CollageTemplate[] {
  return Object.values(COLLAGE_TEMPLATES).filter((t) => t.photoCount === count);
}

/**
 * Random-pick a template matching `count`. `rng` (default Math.random)
 * is injectable for deterministic tests. Returns null when none match.
 */
export function pickCollageTemplateForCount(
  count: number,
  rng: () => number = Math.random
): CollageTemplate | null {
  const list = getCollageTemplatesForCount(count);
  if (list.length === 0) return null;
  const idx = Math.min(list.length - 1, Math.floor(rng() * list.length));
  return list[idx];
}
