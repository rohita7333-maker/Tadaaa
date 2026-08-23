import { buildKeepsake } from "../keepsake";

const invite = {
  title: "Maya turns thirty",
  message: "Thirty looks good on you.",
  occasion_type: "birthday",
  reveal_type: "scroll_story",
  created_at: "2026-06-01T10:00:00.000Z",
} as const;

const base = {
  invite,
  contributions: [
    { name: "Aanya", message: "Remember Goa 2019?" },
    { name: "Rahul", message: "Happy thirty, legend." },
  ],
  rsvpCount: 19,
  reactionCount: 44,
  url: "https://tadaaaa.app/surprise/abc",
};

describe("buildKeepsake", () => {
  it("leads with the title and the creator's own message", () => {
    const out = buildKeepsake(base);
    expect(out.startsWith("Maya turns thirty")).toBe(true);
    expect(out).toContain("Thirty looks good on you.");
  });

  it("includes every approved contribution, attributed", () => {
    const out = buildKeepsake(base);
    expect(out).toContain("Aanya");
    expect(out).toContain("Remember Goa 2019?");
    expect(out).toContain("Rahul");
    expect(out).toContain("Happy thirty, legend.");
  });

  it("carries the counts and the link", () => {
    const out = buildKeepsake(base);
    expect(out).toContain("19 RSVPs");
    expect(out).toContain("44 reactions");
    expect(out).toContain(base.url);
  });

  it("omits the messages section entirely when nobody contributed", () => {
    const out = buildKeepsake({ ...base, contributions: [] });
    expect(out).not.toContain("Messages");
    expect(out).toContain("Maya turns thirty");
  });

  it("survives a null message and a null occasion without printing null", () => {
    const out = buildKeepsake({
      ...base,
      invite: { ...invite, message: null, occasion_type: null },
    });
    expect(out).not.toContain("null");
    expect(out).not.toContain("undefined");
  });

  it("substitutes Someone for a blank contributor name", () => {
    const out = buildKeepsake({ ...base, contributions: [{ name: "  ", message: "hi" }] });
    expect(out).toContain("Someone");
  });
});
