import { groupByRecency, isUnread, moderationLine } from "../activity-read";

const NOW = new Date("2026-08-17T20:00:00.000Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe("isUnread", () => {
  it("treats everything as unread the first time, when nothing has been read", () => {
    expect(isUnread(ago(HOUR), null)).toBe(true);
  });

  it("marks an event newer than the last read as unread", () => {
    expect(isUnread(ago(MINUTE), NOW - HOUR)).toBe(true);
  });

  it("marks an event older than the last read as read", () => {
    expect(isUnread(ago(2 * HOUR), NOW - HOUR)).toBe(false);
  });

  it("treats an event exactly at the mark as read — Mark all read must clear the list", () => {
    // Strictly-greater, not >=: otherwise the newest row stays coral forever
    // and the button looks broken.
    const at = ago(HOUR);
    expect(isUnread(at, new Date(at).getTime())).toBe(false);
  });

  it("treats an unparseable timestamp as read rather than permanently coral", () => {
    expect(isUnread("not a date", NOW - HOUR)).toBe(false);
  });
});

describe("groupByRecency", () => {
  const events = [
    { at: ago(18 * MINUTE), id: "a" },
    { at: ago(3 * HOUR), id: "b" },
    { at: ago(30 * HOUR), id: "c" },
    { at: ago(9 * DAY), id: "d" },
  ];

  it("splits into Today and Earlier, in the frame's order", () => {
    const out = groupByRecency(events, NOW);
    expect(out.map((g) => g.title)).toEqual(["Today", "Earlier"]);
  });

  it("puts everything inside 24 hours in Today", () => {
    const [today] = groupByRecency(events, NOW);
    expect(today.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("puts everything older in Earlier", () => {
    const [, earlier] = groupByRecency(events, NOW);
    expect(earlier.items.map((i) => i.id)).toEqual(["c", "d"]);
  });

  it("omits an empty group rather than printing a header with nothing under it", () => {
    expect(groupByRecency([{ at: ago(MINUTE), id: "a" }], NOW).map((g) => g.title)).toEqual([
      "Today",
    ]);
    expect(groupByRecency([{ at: ago(5 * DAY), id: "z" }], NOW).map((g) => g.title)).toEqual([
      "Earlier",
    ]);
  });

  it("returns nothing at all for an empty feed", () => {
    expect(groupByRecency([], NOW)).toEqual([]);
  });

  it("keeps each group newest-first", () => {
    const shuffled = [
      { at: ago(3 * HOUR), id: "b" },
      { at: ago(18 * MINUTE), id: "a" },
    ];
    expect(groupByRecency(shuffled, NOW)[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("moderationLine", () => {
  it("reads as frame B4's attribution", () => {
    expect(
      moderationLine({ name: "Aanya", photoCount: 2, createdAt: ago(11 * MINUTE) }, NOW)
    ).toBe("Aanya · 2 photos attached · 11 min ago");
  });

  it("singularises one photo", () => {
    expect(
      moderationLine({ name: "Aanya", photoCount: 1, createdAt: ago(11 * MINUTE) }, NOW)
    ).toBe("Aanya · 1 photo attached · 11 min ago");
  });

  it("drops the photo segment entirely when there are none", () => {
    expect(moderationLine({ name: "Aanya", photoCount: 0, createdAt: ago(2 * HOUR) }, NOW)).toBe(
      "Aanya · 2h ago"
    );
  });

  it("substitutes Someone for a blank contributor name", () => {
    expect(moderationLine({ name: "  ", photoCount: 0, createdAt: ago(MINUTE) }, NOW)).toContain(
      "Someone"
    );
  });

  it("says just now under a minute rather than 0 min ago", () => {
    expect(moderationLine({ name: "Aanya", photoCount: 0, createdAt: ago(5_000) }, NOW)).toBe(
      "Aanya · just now"
    );
  });

  it("falls back to days once it is past a day", () => {
    expect(moderationLine({ name: "Aanya", photoCount: 0, createdAt: ago(50 * HOUR) }, NOW)).toBe(
      "Aanya · 2d ago"
    );
  });
});
