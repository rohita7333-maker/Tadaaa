/**
 * D6 — the dodging "No".
 *
 * The handoff is unusually firm about this one, and it is worth quoting:
 *
 *   "Clamp inside the safe area — it must never escape the screen or overlap
 *    Yes. AFTER FOUR DODGES IT STOPS DODGING AND ACCEPTS THE NO. A joke that
 *    traps someone isn't a joke, and an un-declinable dialog is an
 *    accessibility failure. Disable dodging entirely under Reduce Motion or
 *    when a screen reader is active."
 *
 * All of that is decided here, where it can be tested, rather than inside a
 * gesture handler where it cannot. The component only animates what this
 * module returns.
 */

/** The handoff's five offsets. Rest is one of them, so the No can come home. */
/**
 * Where the No runs to, as a FRACTION of the space it is allowed.
 *
 * These were five fixed pixel offsets (max ±84 across, ±46 down) clamped to the
 * button row, which on a phone is a twitch rather than a chase. Fractions let
 * the same deterministic walk cover whatever room the screen actually has.
 * Rest is one of them, so the No can come home.
 */
export const DODGE_OFFSETS: readonly { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: -1, y: -0.72 },
  { x: 0.9, y: 0.85 },
  { x: -0.85, y: 0.62 },
  { x: 1, y: -0.9 },
] as const;

/** Four, then it gives up. */
export const DODGE_LIMIT = 4;

export interface DodgeState {
  count: number;
  offset: { x: number; y: number };
  /** Index into DODGE_OFFSETS, so the next pick can avoid repeating. */
  slot: number;
}

export const INITIAL_DODGE_STATE: DodgeState = { count: 0, offset: { x: 0, y: 0 }, slot: 0 };

export interface DodgeBounds {
  /** Screen width available to the row. */
  width: number;
  buttonWidth: number;
  buttonHeight: number;
  /** Horizontal screen padding. */
  padding: number;
  /** The No's resting left edge — i.e. where Yes ends plus the gap. */
  yesRight: number;
  /**
   * How far up and down the No may travel from rest, in px.
   *
   * Omitted means the old row-bound behaviour (one button height), so an
   * older caller cannot accidentally fling the button off screen.
   */
  roamHeight?: number;
}

/**
 * Keep the button on screen AND off the Yes.
 *
 * The left bound is the No's own resting position, not zero: sliding left past
 * it would put "No" on top of "Yes", and a mis-tap there says the opposite of
 * what the recipient meant. That is the one failure this whole feature cannot
 * afford.
 */
export function clampOffset(
  offset: { x: number; y: number },
  bounds: DodgeBounds
): { x: number; y: number } {
  const minX = -bounds.yesRight;
  const maxX = bounds.width - bounds.padding - bounds.buttonWidth - bounds.yesRight;
  const maxY = bounds.roamHeight ?? bounds.buttonHeight;

  return {
    // `|| 0` normalises negative zero, which a fraction times a zero span
    // produces and which is NOT === 0 under Object.is — it would leak into
    // snapshots and equality checks as a phantom difference.
    x: Math.max(minX, Math.min(maxX, offset.x)) || 0,
    y: Math.max(-maxY, Math.min(maxY, offset.y)) || 0,
  };
}

export function hasGivenUp(state: DodgeState): boolean {
  return state.count >= DODGE_LIMIT;
}

/**
 * Advance one dodge. Past the limit it returns to rest and stays there, so the
 * next press lands on a stationary button and the No is accepted.
 */
export function nextDodge(state: DodgeState, bounds: DodgeBounds): DodgeState {
  if (hasGivenUp(state)) {
    return { count: DODGE_LIMIT, offset: { x: 0, y: 0 }, slot: 0 };
  }

  // Deterministic walk rather than a random pick: random can land on the slot
  // it already occupies, which reads as the button being broken.
  const slot = (state.slot + 1) % DODGE_OFFSETS.length;
  const unit = DODGE_OFFSETS[slot];

  // Fractions scaled to the room available, then clamped. Scaling FIRST is what
  // makes the button use the whole screen instead of a 46px band.
  const spanRight = Math.max(0, bounds.width - bounds.padding - bounds.buttonWidth - bounds.yesRight);
  const spanLeft = Math.max(0, bounds.yesRight);
  const spanY = bounds.roamHeight ?? bounds.buttonHeight;
  const raw = {
    x: unit.x * (unit.x < 0 ? spanLeft : spanRight),
    y: unit.y * spanY,
  };

  return {
    count: state.count + 1,
    offset: clampOffset(raw, bounds),
    slot,
  };
}

/**
 * Whether the No should run at all. Three separate ways it must not: the
 * creator turned it off, the OS asked for less motion, or a screen reader is
 * driving — where a moving target is not a joke, it is a locked door.
 */
export function shouldDodge(input: {
  enabled: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
}): boolean {
  return input.enabled && !input.reducedMotion && !input.screenReader;
}
