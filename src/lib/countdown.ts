/**
 * Frame D4 — the countdown's digit groups and their unit labels.
 *
 * `CountdownClosed` was originally built from the editorial HTML mockup
 * (`bCd` in `tadaaaa-editorial.html`), which prints one unbroken
 * `DD:HH:MM:SS` run and no unit labels. Frame D4 is a different drawing:
 * `HH:MM:SS` at 62px with **Hours / Mins / Secs** beneath it. Seen rendered
 * side by side, the mockup version is four unexplained numbers.
 *
 * The one place the frame cannot be followed literally is the day field. D4 is
 * drawn for a target a few hours out and has no Days group — but a countdown
 * reveal is now reachable at any distance (the D7 waiting room used to swallow
 * every future target, which is what kept D4 off-screen entirely), so a
 * two-day countdown has to show a fourth number. It gets a fourth LABEL rather
 * than being left bare, which is the whole point of the frame's label row.
 */

export interface CountdownGroup {
  /** Zero-padded to at least two digits. */
  readonly value: string;
  /** The frame's own words: Days · Hours · Mins · Secs. */
  readonly label: string;
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Frame D4: `font:400 62px Georgia`. */
export const COUNTDOWN_SIZE_SHORT = 62;
/**
 * Four groups is three more glyphs than the frame ever draws. At 62px Georgia
 * `DD:HH:MM:SS` runs ~300pt, which clips inside the frame's 34pt gutters on a
 * 320pt phone. 52 keeps it on one line without `adjustsFontSizeToFit`, which
 * would otherwise resize each group independently once they are separate Texts.
 */
export const COUNTDOWN_SIZE_LONG = 52;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Groups for the time remaining, largest first.
 *
 * A target already past clamps to zero rather than counting up — the reveal
 * swaps itself out at zero, and a negative countdown on the way there is a
 * flash of nonsense.
 */
export function countdownGroups(remainingMs: number): CountdownGroup[] {
  const left = Math.max(0, remainingMs);
  const days = Math.floor(left / DAY);
  const groups: CountdownGroup[] = [
    { value: pad(Math.floor((left % DAY) / HOUR)), label: "Hours" },
    { value: pad(Math.floor((left % HOUR) / MIN)), label: "Mins" },
    { value: pad(Math.floor((left % MIN) / SEC)), label: "Secs" },
  ];
  // Only when it would say something. A leading "00 Days" is noise, and the
  // frame has no day field at all inside the last 24 hours.
  if (days > 0) groups.unshift({ value: pad(days), label: "Days" });
  return groups;
}

export function countdownDigitSize(groupCount: number): number {
  return groupCount > 3 ? COUNTDOWN_SIZE_LONG : COUNTDOWN_SIZE_SHORT;
}

/**
 * The spoken form. Without this VoiceOver reads the digit run literally —
 * "zero two colon zero three colon" — which is the same defect the visible
 * labels fix, one sense over.
 */
export function countdownSpoken(groups: readonly CountdownGroup[]): string {
  if (groups.every((g) => Number(g.value) === 0)) return "Opening now";
  return `Opens in ${groups.map((g) => `${g.value} ${g.label}`).join(", ")}`;
}
