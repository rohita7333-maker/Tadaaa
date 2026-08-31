/**
 * How many times the No button runs away before it lets itself be caught.
 *
 * The creator picks this per invite. `0` means it never dodges; `UNLIMITED`
 * means it can never be caught, so the guest's only reachable answer is Yes —
 * a deliberate joke, not an accident. Everything here is pure so the reveal's
 * behaviour is testable without a browser.
 */

/** Sentinel: the No button dodges forever. */
export const UNLIMITED_DODGES = -1;

/** What invites created before this setting existed have always done. */
export const DEFAULT_DODGE_LIMIT = 5;

/** A finite ceiling — a stray huge number shouldn't strand the guest. */
export const MAX_DODGE_LIMIT = 50;

export function normalizeDodgeLimit(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_DODGE_LIMIT;
  const n = Math.floor(raw);
  if (n < 0) return UNLIMITED_DODGES;
  return Math.min(n, MAX_DODGE_LIMIT);
}

/** True when the button has stopped running and can finally be clicked. */
export function isDodgeFrozen(limit: number, count: number): boolean {
  if (limit === UNLIMITED_DODGES) return false;
  return count >= limit;
}

/**
 * The line under the buttons. Returns null when dodging is off entirely —
 * there is no joke to narrate, so nothing should be said.
 */
export function dodgeHint(limit: number, count: number, noLabel: string): string | null {
  if (limit === 0) return null;
  if (isDodgeFrozen(limit, count)) return "Fine, it'll stay still now 😄";
  if (count === 0) return `Try clicking ${noLabel}... 😏`;
  if (limit === UNLIMITED_DODGES) return "It keeps running away 😂";
  return `It keeps running away 😂 (${limit - count} left)`;
}
