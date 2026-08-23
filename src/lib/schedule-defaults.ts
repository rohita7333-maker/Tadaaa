/**
 * C5 — the schedule row must STORE what it SHOWS.
 *
 * Picking "Schedule it" rendered a date immediately but left `scheduledAt`
 * null, because the value only reached the draft when the picker fired
 * `onChange`. Pressing Continue without touching the spinner failed with
 * "Pick the date and time." while a date sat plainly on screen.
 *
 * On web it was worse: `@react-native-community/datetimepicker` ships no web
 * build, so `Platform.OS !== "ios"` took the Android branch, nothing rendered,
 * and step 5 could never be passed at all.
 *
 * Quick picks exist because they are better on a phone than a spinner for the
 * three cases that cover most surprises, and because they give every platform
 * — including the web export used for verification — a way to set a date.
 */
export type QuickPickId = "tonight" | "tomorrow" | "weekend";

export interface QuickPick {
  id: QuickPickId;
  label: string;
}

export const QUICK_PICKS: readonly QuickPick[] = [
  { id: "tonight", label: "Tonight" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "This weekend" },
] as const;

const TONIGHT_HOUR = 20;
const MORNING_HOUR = 9;
const WEEKEND_HOUR = 10;
const SATURDAY = 6;

function at(base: Date, hour: number): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function quickPickIso(id: QuickPickId, now: number = Date.now()): string {
  const base = new Date(now);
  if (id === "tonight") {
    const tonight = at(base, TONIGHT_HOUR);
    // Past 8pm already, so "tonight" can only mean the next one.
    return (tonight.getTime() > now ? tonight : at(addDays(base, 1), TONIGHT_HOUR)).toISOString();
  }
  if (id === "tomorrow") {
    return at(addDays(base, 1), MORNING_HOUR).toISOString();
  }
  // Always the COMING Saturday. On a Saturday that means the next one, never
  // today — "this weekend" for something already happening reads as a mistake.
  const ahead = ((SATURDAY - base.getDay() + 7) % 7) || 7;
  return at(addDays(base, ahead), WEEKEND_HOUR).toISOString();
}

/**
 * The value the schedule row should hold the moment it appears.
 *
 * Keeps a date the creator already picked; otherwise seeds tomorrow morning.
 * A stored date that has since passed is replaced, because step 5 rejects a
 * past moment and would otherwise block Continue on a value nobody chose.
 */
export function defaultScheduledAt(
  current: string | null,
  now: number = Date.now()
): string {
  if (current) {
    const t = new Date(current).getTime();
    if (Number.isFinite(t) && t > now) return current;
  }
  return quickPickIso("tomorrow", now);
}
