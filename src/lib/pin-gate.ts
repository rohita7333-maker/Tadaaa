/**
 * D1 — PIN gate: the rules, kept out of the component so they are testable.
 *
 * The gate protects a surprise, not a bank account, so the shape of the
 * lockout matters: three wrong tries then a 30s cooldown, per the frame. Long
 * enough to stop idle guessing at a party, short enough that the actual
 * recipient — who mistyped — is not punished.
 *
 * Verification itself is server-side (`verify_invite_pin`); the hash never
 * reaches the device. Everything here is entry state and pacing.
 */

/** Frame D1: four digits, four dots. */
export const PIN_LENGTH = 4;
/** Frame D1: "Three wrong attempts → 30s cooldown". */
export const MAX_ATTEMPTS = 3;
export const COOLDOWN_MS = 30_000;

/** The handoff's weak-PIN list, verbatim. */
export const WEAK_PINS = ["0000", "1111", "1234", "4321"] as const;

export function isWeakPin(pin: string): boolean {
  return (WEAK_PINS as readonly string[]).includes(pin);
}

export interface PinState {
  /** Digits entered so far. Never longer than PIN_LENGTH. */
  entry: string;
  /** Wrong attempts since the last success or cooldown expiry. */
  attempts: number;
  /** Epoch ms the cooldown ends, or null when not cooling down. */
  cooldownUntil: number | null;
}

export const INITIAL_PIN_STATE: PinState = {
  entry: "",
  attempts: 0,
  cooldownUntil: null,
};

export function isCoolingDown(state: PinState, now: number = Date.now()): boolean {
  return state.cooldownUntil != null && state.cooldownUntil > now;
}

/** Whole seconds left, for the countdown message. Never negative. */
export function cooldownSecondsLeft(state: PinState, now: number = Date.now()): number {
  if (state.cooldownUntil == null) return 0;
  return Math.max(0, Math.ceil((state.cooldownUntil - now) / 1000));
}

/**
 * Append a digit. Ignored while cooling down or already full — the keypad stays
 * mounted during a cooldown (the frame shows it greyed, not removed), so the
 * guard lives here rather than in the component's disabled prop alone.
 */
export function pressDigit(state: PinState, digit: string, now: number = Date.now()): PinState {
  if (isCoolingDown(state, now)) return state;
  if (!/^[0-9]$/.test(digit)) return state;
  if (state.entry.length >= PIN_LENGTH) return state;
  return { ...state, entry: state.entry + digit };
}

export function pressBackspace(state: PinState, now: number = Date.now()): PinState {
  if (isCoolingDown(state, now)) return state;
  return { ...state, entry: state.entry.slice(0, -1) };
}

export function isComplete(state: PinState): boolean {
  return state.entry.length === PIN_LENGTH;
}

/**
 * Record a wrong PIN. The third one starts the cooldown AND resets the counter,
 * so the next cooldown needs three fresh mistakes rather than triggering on
 * every subsequent attempt.
 */
export function registerWrong(state: PinState, now: number = Date.now()): PinState {
  const attempts = state.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    return { entry: "", attempts: 0, cooldownUntil: now + COOLDOWN_MS };
  }
  return { ...state, entry: "", attempts };
}

/** Clears everything — used after a correct PIN and when a cooldown expires. */
export function reset(): PinState {
  return { ...INITIAL_PIN_STATE };
}

/**
 * Message under the dots. Returns null when there is nothing to say, so the
 * component renders the creator's hint instead of an empty error slot.
 */
export function pinMessage(state: PinState, now: number = Date.now()): string | null {
  if (isCoolingDown(state, now)) {
    const s = cooldownSecondsLeft(state, now);
    return `Too many tries. Try again in ${s}s.`;
  }
  if (state.attempts === MAX_ATTEMPTS - 1) return "One more try before a short wait.";
  if (state.attempts > 0) return "Not quite. Try again.";
  return null;
}

// ---------------------------------------------------------------------------
// Server reads
// ---------------------------------------------------------------------------
import { supabase } from "./supabase";

export interface PinMeta {
  hasPin: boolean;
  hint: string | null;
}

/**
 * Is this slug PIN-locked, and what hint did the creator write?
 *
 * A separate reader from `get_invite_by_slug`, whose RETURNS TABLE signature is
 * frozen — extending it would need a DROP. Returns a boolean, never the hash.
 */
export async function getPinMeta(slug: string): Promise<PinMeta> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: { has_pin?: boolean; pin_hint?: string | null }[] | null; error: unknown }>;

  const { data, error } = await rpc("get_invite_pin_meta", { p_slug: slug });
  // Fail OPEN, not closed: a failed meta read must not lock a recipient out of
  // an unlocked surprise. A genuinely locked one is still protected — the reveal
  // payload itself is behind the same server, and verify_invite_pin is the only
  // thing that can unlock anything.
  if (error || !data || data.length === 0) return { hasPin: false, hint: null };
  return { hasPin: data[0].has_pin === true, hint: data[0].pin_hint ?? null };
}

/** Server-side check. The hash never reaches the device. */
export async function verifyPin(slug: string, pin: string): Promise<boolean> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: { ok?: boolean } | null; error: unknown }>;
  const { data, error } = await rpc("verify_invite_pin", { p_slug: slug, p_pin: pin });
  if (error) return false;
  return data?.ok === true;
}
