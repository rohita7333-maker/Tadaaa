import {
  COUNTDOWN_SIZE_LONG,
  COUNTDOWN_SIZE_SHORT,
  countdownDigitSize,
  countdownGroups,
  countdownSpoken,
} from "../countdown";

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("countdownGroups", () => {
  it("is the frame's three groups inside the last day", () => {
    // Frame D4 draws HH:MM:SS with Hours / Mins / Secs beneath.
    expect(countdownGroups(3 * HOUR + 59 * MIN + 41 * SEC)).toEqual([
      { value: "03", label: "Hours" },
      { value: "59", label: "Mins" },
      { value: "41", label: "Secs" },
    ]);
  });

  it("adds a Days group once there is more than a day left", () => {
    // The frame is drawn for a target hours away and has no day field. A
    // countdown two days out has to show one, and an unlabelled fourth number
    // is exactly the gap this closes.
    expect(countdownGroups(2 * DAY + 3 * HOUR + 59 * MIN + 41 * SEC)).toEqual([
      { value: "02", label: "Days" },
      { value: "03", label: "Hours" },
      { value: "59", label: "Mins" },
      { value: "41", label: "Secs" },
    ]);
  });

  it("drops the Days group the moment it would read 00", () => {
    expect(countdownGroups(DAY).map((g) => g.label)).toEqual(["Days", "Hours", "Mins", "Secs"]);
    expect(countdownGroups(DAY - SEC).map((g) => g.label)).toEqual(["Hours", "Mins", "Secs"]);
  });

  it("zero-pads to two digits, and does not truncate a long wait", () => {
    expect(countdownGroups(9 * SEC)).toEqual([
      { value: "00", label: "Hours" },
      { value: "00", label: "Mins" },
      { value: "09", label: "Secs" },
    ]);
    expect(countdownGroups(120 * DAY)[0]).toEqual({ value: "120", label: "Days" });
  });

  it("clamps a target already past to all zeroes rather than counting up", () => {
    expect(countdownGroups(-5000)).toEqual([
      { value: "00", label: "Hours" },
      { value: "00", label: "Mins" },
      { value: "00", label: "Secs" },
    ]);
  });
});

describe("countdownDigitSize", () => {
  it("is the frame's 62px for three groups", () => {
    expect(countdownDigitSize(3)).toBe(COUNTDOWN_SIZE_SHORT);
    expect(COUNTDOWN_SIZE_SHORT).toBe(62);
  });

  it("steps down for four, so DD:HH:MM:SS still fits a 320pt phone", () => {
    expect(countdownDigitSize(4)).toBe(COUNTDOWN_SIZE_LONG);
    expect(COUNTDOWN_SIZE_LONG).toBeLessThan(COUNTDOWN_SIZE_SHORT);
  });
});

describe("countdownSpoken", () => {
  it("reads the groups as words, so VoiceOver never says 'oh two colon'", () => {
    expect(countdownSpoken(countdownGroups(2 * DAY + 3 * HOUR + 4 * MIN + 5 * SEC))).toBe(
      "Opens in 02 Days, 03 Hours, 04 Mins, 05 Secs"
    );
  });

  it("says so plainly at zero", () => {
    expect(countdownSpoken(countdownGroups(0))).toBe("Opening now");
  });
});
