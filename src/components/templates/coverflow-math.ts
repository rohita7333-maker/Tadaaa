/**
 * coverflow-math.ts — pure geometry for the /templates coverflow fan.
 *
 * Kept free of React/DOM so the transform math is unit-testable
 * (see coverflow-math.test.ts). CoverflowFan.tsx consumes these.
 */

export interface FanSlot {
  /** Horizontal shift in px (signed). */
  x: number;
  /** Depth shift in px (always ≤ 0 away from viewer). */
  z: number;
  /** Y-rotation in degrees (signed, clamped). */
  rotY: number;
  /** Uniform scale (floored). */
  scale: number;
  /** brightness() filter value. */
  brightness: number;
  /** Stacking order — center card on top. */
  zIndex: number;
  /** Cards beyond the visibility cutoff fade out and are aria-hidden. */
  visible: boolean;
}

/** Cards further than this many slots from center are hidden. */
export const MAX_VISIBLE_OFFSET = 3;

const X_STEP_CAP_PX = 150;
const TRACK_X_DIVISOR = 5.6;
const Z_STEP_PX = 60;
const ROT_Y_STEP_DEG = -26;
const ROT_Y_MAX_DEG = 52;
const SCALE_STEP = 0.13;
const SCALE_MIN = 0.62;
const BRIGHTNESS_STEP = 0.09;
const Z_INDEX_BASE = 50;

/**
 * Per-slot transform for a card at signed circular offset `offset`
 * from the active card, on a track `trackWidth` px wide.
 */
/** Normalizes -0 to +0 so signed products at the center card read as plain 0. */
const zeroSafe = (value: number): number => (value === 0 ? 0 : value);

export function fanSlot(offset: number, trackWidth: number): FanSlot {
  const abs = Math.abs(offset);
  const xStep = Math.min(X_STEP_CAP_PX, trackWidth / TRACK_X_DIVISOR);
  const rotRaw = offset * ROT_Y_STEP_DEG;

  return {
    x: zeroSafe(offset * xStep),
    z: zeroSafe(-abs * Z_STEP_PX),
    rotY: zeroSafe(Math.max(-ROT_Y_MAX_DEG, Math.min(ROT_Y_MAX_DEG, rotRaw))),
    scale: Math.max(SCALE_MIN, 1 - abs * SCALE_STEP),
    brightness: 1 - abs * BRIGHTNESS_STEP,
    zIndex: Z_INDEX_BASE - abs,
    visible: abs <= MAX_VISIBLE_OFFSET,
  };
}

/**
 * Signed circular offset of card `index` relative to `center` in a ring of
 * `count` cards. Result lies in (-count/2, count/2].
 * e.g. count=7: wrapOffset(6, 0, 7) === -1 (one step to the left).
 */
export function wrapOffset(index: number, center: number, count: number): number {
  const raw = (((index - center) % count) + count) % count;
  return raw > count / 2 ? raw - count : raw;
}
