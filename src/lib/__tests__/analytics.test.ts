import {
  ANALYTICS_DAY_WINDOW,
  analyticsReportHtml,
  buildBars,
  buildFunnel,
  parseAnalytics,
  weekdayInitial,
  type InviteAnalytics,
} from "../analytics";

const FULL: InviteAnalytics = {
  full: true,
  timezone: "UTC",
  views: 42,
  loggedViews: 42,
  weekViews: 31,
  rsvps: 9,
  answers: 4,
  reactions: 3,
  days: [
    { day: "2026-08-11", count: 9 },
    { day: "2026-08-12", count: 5 },
    { day: "2026-08-13", count: 6 },
    { day: "2026-08-14", count: 3 },
    { day: "2026-08-15", count: 4 },
    { day: "2026-08-16", count: 2 },
    { day: "2026-08-17", count: 2 },
  ],
  devices: [
    { label: "iPhone", count: 20 },
    { label: "Android", count: 15 },
    { label: "Mac", count: 7 },
  ],
};

describe("weekdayInitial", () => {
  it("reads a YYYY-MM-DD key as a plain calendar date, never a local instant", () => {
    // Anchored to a real week. Read with `new Date("2026-08-16")` in a zone
    // behind UTC these would all shift back one day, which is the classic
    // off-by-one that puts Sunday's views under Saturday's bar.
    expect(
      ["2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17"].map(
        weekdayInitial
      )
    ).toEqual(["T", "W", "T", "F", "S", "S", "M"]);
  });
});

describe("buildBars", () => {
  it("keeps the server's day order and labels each with its weekday initial", () => {
    const bars = buildBars(FULL.days);
    expect(bars).toHaveLength(ANALYTICS_DAY_WINDOW);
    expect(bars.map((b) => b.label)).toEqual(["T", "W", "T", "F", "S", "S", "M"]);
    expect(bars.map((b) => b.count)).toEqual([9, 5, 6, 3, 4, 2, 2]);
  });

  it("scales height against the tallest bar, not the total", () => {
    const bars = buildBars(FULL.days);
    expect(bars[0].heightPct).toBe(100); // 9 of 9
    expect(bars[2].heightPct).toBe(67); // 6 of 9, rounded
    expect(bars[5].heightPct).toBe(22); // 2 of 9, rounded
  });

  it("paints the highest coral and the second-highest sand, per the frame", () => {
    expect(buildBars(FULL.days).map((b) => b.tone)).toEqual([
      "peak", // 9
      "base", // 5
      "second", // 6
      "base",
      "base",
      "base",
      "base",
    ]);
  });

  it("gives every day sharing the top value the same tone — no arbitrary winner", () => {
    const tied = [
      { day: "2026-08-11", count: 4 },
      { day: "2026-08-12", count: 4 },
      { day: "2026-08-13", count: 1 },
    ];
    expect(buildBars(tied).map((b) => b.tone)).toEqual(["peak", "peak", "second"]);
  });

  it("a week with no views is seven flat base bars, not a divide-by-zero", () => {
    const empty = FULL.days.map((d) => ({ ...d, count: 0 }));
    const bars = buildBars(empty);
    expect(bars.every((b) => b.heightPct === 0)).toBe(true);
    expect(bars.every((b) => b.tone === "base")).toBe(true);
  });

  it("one non-zero day has a peak but no second — there is no runner-up", () => {
    const one = [
      { day: "2026-08-16", count: 3 },
      { day: "2026-08-17", count: 0 },
    ];
    expect(buildBars(one).map((b) => b.tone)).toEqual(["peak", "base"]);
  });

  it("returns nothing for a withheld (free-tier) series rather than inventing one", () => {
    expect(buildBars([])).toEqual([]);
  });
});

describe("buildFunnel", () => {
  it("uses web's three step labels, in web's order", () => {
    expect(buildFunnel({ views: 42, rsvps: 9, answers: 4 }).map((r) => r.label)).toEqual([
      "Opened",
      "Said yes",
      "Answered",
    ]);
  });

  it("measures every step against opens, and opens against itself", () => {
    const rows = buildFunnel({ views: 42, rsvps: 9, answers: 4 });
    expect(rows.map((r) => r.percent)).toEqual([100, 21, 10]);
    expect(rows.map((r) => r.count)).toEqual([42, 9, 4]);
  });

  it("shows 0%, not 100%, when nothing has been opened", () => {
    expect(buildFunnel({ views: 0, rsvps: 0, answers: 0 }).map((r) => r.percent)).toEqual([0, 0, 0]);
  });

  it("clamps a step that somehow exceeds opens instead of drawing past the row", () => {
    // Views are logged by the recipient page; an RSVP posted straight to the
    // RPC is not. The bar must stay inside its track.
    expect(buildFunnel({ views: 2, rsvps: 5, answers: 0 })[1].percent).toBe(100);
  });

  it("ignores negative or non-finite counts rather than rendering them", () => {
    const rows = buildFunnel({ views: 10, rsvps: -3, answers: Number.NaN });
    expect(rows.map((r) => r.count)).toEqual([10, 0, 0]);
  });

  it("moves the percentage outside a bar too narrow to hold it", () => {
    // Seen rendered: an "Answered 0%" bar drew a 12%-wide stub and its label
    // wrapped to "0 / %" spilling over the edge. A label that does not fit
    // inside its own bar belongs beside it.
    const rows = buildFunnel({ views: 100, rsvps: 60, answers: 3 });
    expect(rows.map((r) => r.labelInside)).toEqual([true, true, false]);
  });

  it("keeps the label inside from the width where it actually fits", () => {
    expect(buildFunnel({ views: 100, rsvps: 22, answers: 21 }).map((r) => r.labelInside)).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("deepens the fill ink -> sand -> coral as the funnel narrows", () => {
    expect(buildFunnel({ views: 1, rsvps: 1, answers: 1 }).map((r) => r.tone)).toEqual([
      "ink",
      "sand",
      "coral",
    ]);
  });
});

describe("parseAnalytics", () => {
  it("passes a full owner payload through with every number intact", () => {
    const parsed = parseAnalytics({
      ok: true,
      full: true,
      timezone: "Asia/Kolkata",
      views: 42,
      loggedViews: 40,
      weekViews: 31,
      rsvps: 9,
      answers: 4,
      reactions: 3,
      days: [{ day: "2026-08-17", count: 2 }],
      devices: [{ label: "iPhone", count: 20 }],
    });
    expect(parsed).toEqual({
      ok: true,
      data: {
        full: true,
        timezone: "Asia/Kolkata",
        views: 42,
        loggedViews: 40,
        weekViews: 31,
        rsvps: 9,
        answers: 4,
        reactions: 3,
        days: [{ day: "2026-08-17", count: 2 }],
        devices: [{ label: "iPhone", count: 20 }],
      },
    });
  });

  it("reports the server's refusal as forbidden, not as an empty screen", () => {
    expect(parseAnalytics({ ok: false, error: "forbidden" })).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("treats null, a string, or a missing ok flag as unavailable", () => {
    for (const bad of [null, undefined, "nope", 7, {}, { ok: 1 }]) {
      expect(parseAnalytics(bad)).toEqual({ ok: false, error: "unavailable" });
    }
  });

  it("a free-tier payload keeps its totals and carries empty panels", () => {
    const parsed = parseAnalytics({
      ok: true,
      full: false,
      timezone: "UTC",
      views: 5,
      loggedViews: 5,
      weekViews: 5,
      rsvps: 0,
      answers: 0,
      reactions: 1,
      days: [],
      devices: [],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("unreachable");
    expect(parsed.data.full).toBe(false);
    expect(parsed.data.views).toBe(5);
    expect(parsed.data.days).toEqual([]);
  });

  it("drops malformed day and device rows instead of rendering NaN bars", () => {
    const parsed = parseAnalytics({
      ok: true,
      full: true,
      views: 1,
      days: [{ day: "2026-08-17", count: 2 }, { day: 5, count: 1 }, { day: "x" }, null],
      devices: [{ label: "iPhone", count: 3 }, { label: "", count: 2 }, { count: 9 }],
    });
    if (!parsed.ok) throw new Error("unreachable");
    expect(parsed.data.days).toEqual([{ day: "2026-08-17", count: 2 }]);
    expect(parsed.data.devices).toEqual([{ label: "iPhone", count: 3 }]);
  });
});

describe("analyticsReportHtml", () => {
  const html = analyticsReportHtml({
    title: 'Maya & "friends" <b>turn thirty</b>',
    url: "https://tadaaaa.app/surprise/maya",
    generatedAt: new Date("2026-08-17T09:41:00Z"),
    data: FULL,
  });

  it("escapes the surprise title — it is user input on its way into a renderer", () => {
    expect(html).not.toContain("<b>turn thirty</b>");
    expect(html).toContain("&lt;b&gt;turn thirty&lt;/b&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;friends&quot;");
  });

  it("carries every headline number the screen shows", () => {
    for (const value of ["42", "31", "9", "4", "3"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain("Opened");
    expect(html).toContain("Said yes");
    expect(html).toContain("Answered");
  });

  it("lists the day series and the device split", () => {
    expect(html).toContain("2026-08-11");
    expect(html).toContain("iPhone");
    expect(html).toContain("Android");
  });

  it("omits the gated panels entirely on a free-tier report", () => {
    const free = analyticsReportHtml({
      title: "Small one",
      url: "https://tadaaaa.app/surprise/small",
      generatedAt: new Date("2026-08-17T09:41:00Z"),
      data: { ...FULL, full: false, days: [], devices: [] },
    });
    expect(free).not.toContain("Views, last 7 days");
    expect(free).not.toContain("What they opened it on");
    // …and says so, rather than looking like a surprise with no data.
    expect(free).toContain("Full analytics are part of Premium");
  });

  it("says so when the dated rows lag the counter, instead of letting them disagree", () => {
    const lagging = analyticsReportHtml({
      title: "Older surprise",
      url: "https://tadaaaa.app/surprise/older",
      generatedAt: new Date("2026-08-17T09:41:00Z"),
      data: { ...FULL, views: 42, loggedViews: 30 },
    });
    expect(lagging).toContain("12 of these opens predate per-open logging");
    // …and stays quiet when they agree.
    expect(html).not.toContain("predate per-open logging");
  });

  it("is a complete document — expo-print will not repair a fragment", () => {
    expect(html.trimStart().startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });
});
