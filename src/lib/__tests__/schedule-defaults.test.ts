/**
 * C5 — the schedule row must store what it shows.
 *
 * Picking "Schedule it" displayed "Tue, Aug 18, 1:32 PM" while `scheduledAt`
 * stayed null, because the date only reached the draft when the spinner fired
 * `onChange`. Pressing Continue without scrolling the spinner failed with
 * "Pick the date and time." while a date was plainly on screen. Verified in a
 * browser: `mode "schedule" · scheduledAt null`.
 *
 * On web it was worse — `@react-native-community/datetimepicker` has no web
 * build, so nothing rendered at all and step 5 could never be passed.
 */
import { QUICK_PICKS, defaultScheduledAt, quickPickIso } from "../schedule-defaults";

/** Fixed clock: Mon 17 Aug 2026, 14:00 local. */
const NOW = new Date(2026, 7, 17, 14, 0, 0, 0).getTime();

describe("defaultScheduledAt", () => {
  it("keeps a date the creator already chose", () => {
    const chosen = new Date(2030, 0, 1).toISOString();
    expect(defaultScheduledAt(chosen, NOW)).toBe(chosen);
  });

  it("seeds tomorrow morning when nothing is chosen yet", () => {
    const d = new Date(defaultScheduledAt(null, NOW));
    expect(d.getDate()).toBe(18);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it("never seeds a moment in the past", () => {
    // Step 5 rejects a past date, so a default that is already gone would block
    // Continue on a value the creator never picked.
    expect(new Date(defaultScheduledAt(null, NOW)).getTime()).toBeGreaterThan(NOW);
  });

  it("replaces a stored date that has since passed", () => {
    const stale = new Date(2020, 0, 1).toISOString();
    const out = defaultScheduledAt(stale, NOW);
    expect(out).not.toBe(stale);
    expect(new Date(out).getTime()).toBeGreaterThan(NOW);
  });

  it("ignores junk instead of propagating an Invalid Date", () => {
    expect(new Date(defaultScheduledAt("not-a-date", NOW)).getTime()).toBeGreaterThan(NOW);
  });
});

describe("quickPickIso", () => {
  it("tonight is 8pm today when the evening has not passed", () => {
    const d = new Date(quickPickIso("tonight", NOW));
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(20);
  });

  it("tonight rolls to tomorrow once 8pm is gone", () => {
    const late = new Date(2026, 7, 17, 21, 30).getTime();
    const d = new Date(quickPickIso("tonight", late));
    expect(d.getDate()).toBe(18);
    expect(d.getHours()).toBe(20);
  });

  it("tomorrow is 9am the next day", () => {
    const d = new Date(quickPickIso("tomorrow", NOW));
    expect(d.getDate()).toBe(18);
    expect(d.getHours()).toBe(9);
  });

  it("this weekend is the coming Saturday at 10am", () => {
    // 17 Aug 2026 is a Monday, so Saturday is the 22nd.
    const d = new Date(quickPickIso("weekend", NOW));
    expect(d.getDay()).toBe(6);
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(10);
  });

  it("on a Saturday, 'this weekend' means next Saturday, never today", () => {
    const sat = new Date(2026, 7, 22, 12, 0).getTime();
    const d = new Date(quickPickIso("weekend", sat));
    expect(d.getDay()).toBe(6);
    expect(d.getDate()).toBe(29);
  });

  it("every quick pick is in the future", () => {
    for (const q of QUICK_PICKS) {
      expect(new Date(quickPickIso(q.id, NOW)).getTime()).toBeGreaterThan(NOW);
    }
  });
});
