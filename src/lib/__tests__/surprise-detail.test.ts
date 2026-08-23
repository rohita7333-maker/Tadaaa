import {
  detailEyebrow,
  detailStatusLine,
  moderationSummary,
  revealStyleLabel,
  toModerationStatus,
  type PendingContributor,
} from "../surprise-detail";

const NOW = new Date("2026-08-16T12:00:00.000Z").getTime();
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

describe("revealStyleLabel", () => {
  it("names all four production reveal types", () => {
    expect(revealStyleLabel("scroll_story")).toBe("Scroll story");
    expect(revealStyleLabel("tap")).toBe("Tap to reveal");
    expect(revealStyleLabel("countdown")).toBe("Countdown");
    expect(revealStyleLabel("letters")).toBe("Open-when letters");
  });

  it("falls back to Tap to reveal for an unknown type", () => {
    // reveal_type is TEXT with a CHECK; a value added server-side before the
    // app ships must not blank the header.
    expect(revealStyleLabel("hologram")).toBe("Tap to reveal");
  });
});

describe("detailEyebrow", () => {
  it("joins occasion and reveal style with a middot", () => {
    expect(detailEyebrow("birthday", "scroll_story")).toBe("Birthday · Scroll story");
  });

  it("uses the occasion label from the shared occasion list, not the raw id", () => {
    expect(detailEyebrow("date_invite", "tap")).not.toContain("date_invite");
  });

  it("omits the occasion half rather than printing an empty segment", () => {
    expect(detailEyebrow(null, "countdown")).toBe("Countdown");
  });
});

describe("detailStatusLine", () => {
  it("renders live with a whole-day expiry count — frame B2 verbatim shape", () => {
    expect(detailStatusLine({ status: "live", expiresAt: inDays(24) }, NOW)).toBe(
      "Live · expires in 24 days"
    );
  });

  it("singularises one day", () => {
    expect(detailStatusLine({ status: "live", expiresAt: inDays(1.2) }, NOW)).toBe(
      "Live · expires in 1 day"
    );
  });

  it("says today when the link dies inside 24 hours", () => {
    expect(detailStatusLine({ status: "live", expiresAt: inDays(0.4) }, NOW)).toBe(
      "Live · expires today"
    );
  });

  it("drops the expiry clause when the link never expires", () => {
    expect(detailStatusLine({ status: "live", expiresAt: null }, NOW)).toBe("Live");
  });

  it("counts down to the open date when scheduled", () => {
    expect(
      detailStatusLine({ status: "scheduled", expiresAt: null, countdownDate: inDays(3) }, NOW)
    ).toBe("Opens in 3 days");
  });

  it("labels expired and archived without an expiry clause", () => {
    expect(detailStatusLine({ status: "expired", expiresAt: inDays(-2) }, NOW)).toBe("Expired");
    expect(detailStatusLine({ status: "archived", expiresAt: null }, NOW)).toBe("Paused");
  });
});

describe("moderationSummary", () => {
  const p = (name: string): PendingContributor => ({ name });

  it("returns null when nothing is waiting — the card must not render", () => {
    expect(moderationSummary([])).toBeNull();
  });

  it("singularises one message", () => {
    expect(moderationSummary([p("Aanya")])).toEqual({
      title: "1 message waiting on you",
      detail: "Aanya added words",
    });
  });

  it("joins two names with and — frame B2 verbatim", () => {
    expect(moderationSummary([p("Aanya"), p("Rahul")])).toEqual({
      title: "2 messages waiting on you",
      detail: "Aanya and Rahul added words",
    });
  });

  it("collapses three or more into a named pair plus a count", () => {
    expect(moderationSummary([p("Aanya"), p("Rahul"), p("Dev"), p("Mira")])?.detail).toBe(
      "Aanya, Rahul and 2 others added words"
    );
  });

  it("collapses exactly three with a singular other", () => {
    expect(moderationSummary([p("Aanya"), p("Rahul"), p("Dev")])?.detail).toBe(
      "Aanya, Rahul and 1 other added words"
    );
  });

  it("substitutes Someone for a blank contributor name", () => {
    // contributor_name is nullable in production; a blank must not render
    // " and  added words".
    expect(moderationSummary([p("   ")])?.detail).toBe("Someone added words");
  });
});

describe("toModerationStatus", () => {
  it("prefers the explicit column when it is set", () => {
    expect(toModerationStatus({ moderation_status: "rejected", approved: false })).toBe("rejected");
    expect(toModerationStatus({ moderation_status: "approved", approved: true })).toBe("approved");
  });

  it("falls back to the legacy boolean for rows written before the column existed", () => {
    expect(toModerationStatus({ moderation_status: null, approved: true })).toBe("approved");
    expect(toModerationStatus({ moderation_status: null, approved: false })).toBe("pending");
  });

  it("ignores a value outside the CHECK constraint rather than trusting it", () => {
    expect(toModerationStatus({ moderation_status: "spam", approved: true })).toBe("approved");
  });
});
