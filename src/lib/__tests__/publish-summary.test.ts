import { contentLine, maskPin, summaryRows } from "../publish-summary";

const AT = new Date("2026-09-12T16:00:00.000Z");

describe("maskPin", () => {
  it("shows the first two digits and hides the rest — frame C6's 'PIN 30··'", () => {
    expect(maskPin("3012")).toBe("PIN 30··");
  });

  it("never reveals the last two, whatever the PIN", () => {
    expect(maskPin("9999")).toBe("PIN 99··");
    expect(maskPin("0000")).toBe("PIN 00··");
  });

  it("returns null when there is no PIN, so the segment is dropped", () => {
    expect(maskPin("")).toBeNull();
    expect(maskPin(null)).toBeNull();
  });

  it("refuses to render a partial PIN rather than leaking a short one", () => {
    expect(maskPin("30")).toBeNull();
  });
});

describe("contentLine", () => {
  it("joins the counts with middots", () => {
    expect(
      contentLine({ photos: 3, approvedContributions: 4, musicEnabled: true, pin: "3012" })
    ).toBe("3 photos · 4 messages · music on · PIN 30··");
  });

  it("singularises both counts", () => {
    expect(
      contentLine({ photos: 1, approvedContributions: 1, musicEnabled: false, pin: null })
    ).toBe("1 photo · 1 message");
  });

  it("drops every segment that is zero or off rather than printing 0 photos", () => {
    expect(
      contentLine({ photos: 0, approvedContributions: 0, musicEnabled: false, pin: null })
    ).toBe("Just your words");
  });

  it("keeps the PIN segment even when nothing else is set", () => {
    expect(
      contentLine({ photos: 0, approvedContributions: 0, musicEnabled: false, pin: "1234" })
    ).toBe("PIN 12··");
  });
});

describe("summaryRows", () => {
  const base = {
    revealStyle: "scroll" as const,
    scheduleMode: "schedule" as const,
    scheduledAt: AT.toISOString(),
    timezone: null,
    approvedContributions: 4,
    contributionsOpen: true,
    tier: "free" as const,
  };

  it("names the four rows the frame shows, in order", () => {
    expect(summaryRows(base).map((r) => r.key)).toEqual([
      "Reveal",
      "Delivery",
      "Contributors",
      "Link lasts",
    ]);
  });

  it("uses the reveal style's display name, not its column value", () => {
    expect(summaryRows(base)[0].value).toBe("Scroll story");
    expect(summaryRows({ ...base, revealStyle: "letters" })[0].value).toBe("Open-when letters");
  });

  it("says Right away when nothing is scheduled", () => {
    expect(
      summaryRows({ ...base, scheduleMode: "now", scheduledAt: null })[1].value
    ).toBe("Right away");
  });

  it("marks recipient-local delivery as theirs", () => {
    expect(summaryRows(base)[1].value).toContain("their time");
  });

  it("names the creator's zone when they chose their own", () => {
    const row = summaryRows({ ...base, timezone: "Asia/Kolkata" })[1].value;
    expect(row).toContain("Asia/Kolkata");
    expect(row).not.toContain("their time");
  });

  it("says the door is shut when contributions are off", () => {
    expect(
      summaryRows({ ...base, contributionsOpen: false, approvedContributions: 0 })[2].value
    ).toBe("Not open");
  });

  it("counts approved contributions, singularised", () => {
    expect(summaryRows({ ...base, approvedContributions: 1 })[2].value).toBe("1 approved");
    expect(summaryRows(base)[2].value).toBe("4 approved");
  });

  it("states the link life per tier — the free cap is the thing people miss", () => {
    expect(summaryRows(base)[3].value).toBe("7 days (free)");
    expect(summaryRows({ ...base, tier: "plus" })[3].value).toBe("30 days");
    expect(summaryRows({ ...base, tier: "unlimited" })[3].value).toBe("30 days");
  });
});
