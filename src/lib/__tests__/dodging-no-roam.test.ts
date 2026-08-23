/**
 * D6 — the No roams the whole screen, not just its own row.
 *
 * The five handoff offsets top out at ±84px across and ±46px down, clamped to
 * the button ROW. On a phone that is a twitch, not a chase — reported as "the
 * NO button should be jumping on the entire screen".
 *
 * Everything the row-bound version guaranteed still has to hold, because each
 * one is a way to make the button either un-declinable or a mis-tap trap:
 *   - it never covers the Yes
 *   - it never leaves the safe area
 *   - it gives up after DODGE_LIMIT and becomes answerable
 *   - it never lands where it already is
 */
import {
  DODGE_LIMIT,
  INITIAL_DODGE_STATE,
  clampOffset,
  nextDodge,
  type DodgeBounds,
} from "../dodging-no";

/** iPhone-ish: 390 wide, the No resting centred in a 350 row, 300 of roam. */
const ROAM = 300;
const BOUNDS: DodgeBounds = {
  width: 350,
  buttonWidth: 88,
  buttonHeight: 40,
  padding: 20,
  yesRight: 131,
  roamHeight: ROAM,
};

function walk(steps: number, bounds: DodgeBounds = BOUNDS) {
  let s = INITIAL_DODGE_STATE;
  const seen = [];
  for (let i = 0; i < steps; i++) {
    s = nextDodge(s, bounds);
    seen.push({ ...s.offset });
  }
  return seen;
}

describe("roaming range", () => {
  it("travels further vertically than the button is tall", () => {
    // The old ceiling was buttonHeight (40px). Anything at or under that is
    // still a twitch inside the row.
    const ys = walk(DODGE_LIMIT).map((o) => Math.abs(o.y));
    expect(Math.max(...ys)).toBeGreaterThan(BOUNDS.buttonHeight * 2);
  });

  it("uses most of the height it is given", () => {
    const ys = walk(DODGE_LIMIT).map((o) => Math.abs(o.y));
    expect(Math.max(...ys)).toBeGreaterThan(ROAM * 0.3);
  });

  it("still moves horizontally", () => {
    const xs = walk(DODGE_LIMIT).map((o) => Math.abs(o.x));
    expect(Math.max(...xs)).toBeGreaterThan(40);
  });
});

describe("guarantees that must survive the bigger range", () => {
  it("never covers the Yes", () => {
    for (const o of walk(DODGE_LIMIT)) {
      expect(o.x).toBeGreaterThanOrEqual(-BOUNDS.yesRight);
    }
  });

  it("never leaves the row horizontally", () => {
    const maxX = BOUNDS.width - BOUNDS.padding - BOUNDS.buttonWidth - BOUNDS.yesRight;
    for (const o of walk(DODGE_LIMIT)) {
      expect(o.x).toBeLessThanOrEqual(maxX);
    }
  });

  it("stays inside the vertical roam it was given", () => {
    for (const o of walk(DODGE_LIMIT)) {
      expect(Math.abs(o.y)).toBeLessThanOrEqual(ROAM);
    }
  });

  it("never lands where it already was", () => {
    const seen = walk(DODGE_LIMIT);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).not.toEqual(seen[i - 1]);
    }
  });

  it("comes home and stays home once it gives up", () => {
    let s = INITIAL_DODGE_STATE;
    for (let i = 0; i < DODGE_LIMIT + 3; i++) s = nextDodge(s, BOUNDS);
    expect(s.offset).toEqual({ x: 0, y: 0 });
    expect(s.count).toBe(DODGE_LIMIT);
  });

  it("degrades safely when the screen is tiny", () => {
    const tiny: DodgeBounds = { ...BOUNDS, width: 200, yesRight: 40, roamHeight: 0 };
    for (const o of walk(DODGE_LIMIT, tiny)) {
      expect(o.y).toBe(0);
      expect(o.x).toBeGreaterThanOrEqual(-tiny.yesRight);
    }
  });

  it("treats a missing roamHeight as the old row-bound behaviour", () => {
    // Back-compat: an older caller that does not pass roamHeight must not
    // suddenly fling the button off screen.
    const legacy = { ...BOUNDS, roamHeight: undefined } as unknown as DodgeBounds;
    for (const o of walk(DODGE_LIMIT, legacy)) {
      expect(Math.abs(o.y)).toBeLessThanOrEqual(BOUNDS.buttonHeight);
    }
  });
});

describe("clampOffset", () => {
  it("clamps y to the roam height, not the button height", () => {
    expect(clampOffset({ x: 0, y: 999 }, BOUNDS).y).toBe(ROAM);
    expect(clampOffset({ x: 0, y: -999 }, BOUNDS).y).toBe(-ROAM);
  });
});
