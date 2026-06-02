/**
 * Collage template registry.
 * Pure data module — no React, no Satori imports.
 * Templates define a canvas size, background, and an array of photo slots
 * specified as percentages of the canvas dimensions.
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
}

export interface CollageTemplate {
  id: string;
  label: string;
  width: number;
  height: number;
  /** CSS background value (solid colour or gradient string) for the board */
  background: string;
  /** Caption rendered inside the hero polaroid strip; falls back to invite title */
  heroCaption?: string;
  /** Index of the hero slot in `slots` (gets first photo + caption). Default 0 */
  heroSlotIndex?: number;
  slots: CollageSlot[];
}

export const COLLAGE_TEMPLATES: Record<string, CollageTemplate> = {
  "polaroid-scrapbook": {
    id: "polaroid-scrapbook",
    label: "Polaroid Scrapbook",
    width: 1200,
    height: 1500,
    background: "#EDE7DE",
    heroCaption: "Happy Birthday!",
    heroSlotIndex: 0,
    slots: [
      // Index 0 — hero (large centred polaroid, drawn on top)
      {
        xPct: 28, yPct: 19, wPct: 44, hPct: 53,
        rotateDeg: -2, frame: 22, captionStrip: 90, radius: 4, z: 10,
      },
      // Index 1
      { xPct: 1,  yPct: 3,  wPct: 30, hPct: 25, rotateDeg: -5, frame: 10, z: 1 },
      // Index 2
      { xPct: 25, yPct: 1,  wPct: 26, hPct: 21, rotateDeg:  4, frame: 10, z: 2 },
      // Index 3
      { xPct: 70, yPct: 2,  wPct: 28, hPct: 29, rotateDeg:  5, frame: 10, z: 1 },
      // Index 4
      { xPct: 1,  yPct: 34, wPct: 24, hPct: 25, rotateDeg: -4, frame: 10, z: 1 },
      // Index 5
      { xPct: 73, yPct: 34, wPct: 26, hPct: 25, rotateDeg:  6, frame: 10, z: 1 },
      // Index 6
      { xPct: 3,  yPct: 69, wPct: 35, hPct: 28, rotateDeg: -3, frame: 10, z: 1 },
      // Index 7
      { xPct: 56, yPct: 70, wPct: 42, hPct: 27, rotateDeg:  3, frame: 10, z: 1 },
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
