import { describe, expect, it } from "vitest";
import { inviteToStoryConfig, type InviteForStory } from "./from-invite";

/** Minimal invite fixture — only the fields the adapter reads. */
function makeInvite(overrides: Partial<InviteForStory> = {}): InviteForStory {
  return {
    slug: "warm-abc123",
    title: "Maya",
    message: "Give me one golden evening — just us and the good light.",
    countdown_date: null,
    is_paid: false,
    photos: [],
    ...overrides,
  };
}

describe("inviteToStoryConfig", () => {
  it("maps recipient from the invite title", () => {
    const config = inviteToStoryConfig(makeInvite({ title: "Priya" }), {});
    expect(config.recipient).toBe("Priya");
  });

  it("uses a fixed eyebrow", () => {
    const config = inviteToStoryConfig(makeInvite(), {});
    expect(config.eyebrow).toBe("a surprise for");
  });

  it("passes the message through unchanged", () => {
    const invite = makeInvite({ message: "Happy thirtieth, love." });
    expect(inviteToStoryConfig(invite, {}).message).toBe("Happy thirtieth, love.");
  });

  it("carries the slug through for the deterministic seed", () => {
    const config = inviteToStoryConfig(makeInvite({ slug: "golden-xyz" }), {});
    expect(config.slug).toBe("golden-xyz");
  });

  it("starts with no timeline events when the column is absent", () => {
    expect(inviteToStoryConfig(makeInvite(), {}).events).toEqual([]);
  });

  it("maps events from the invite.events jsonb column", () => {
    const invite = makeInvite({
      events: [
        {
          label: "When",
          title: "Saturday, October 24",
          detail: "golden hour",
          mapsQuery: "Sunset Terrace, Hyderabad",
        },
        { label: "Where", title: "The rooftop" },
      ],
    });
    expect(inviteToStoryConfig(invite, {}).events).toEqual([
      {
        label: "When",
        title: "Saturday, October 24",
        detail: "golden hour",
        mapsQuery: "Sunset Terrace, Hyderabad",
      },
      { label: "Where", title: "The rooftop" },
    ]);
  });

  it("falls back to an empty array when events is null", () => {
    const invite = makeInvite();
    (invite as { events?: unknown }).events = null;
    expect(inviteToStoryConfig(invite, {}).events).toEqual([]);
  });

  it("filters out malformed event entries", () => {
    const invite = makeInvite({
      events: [
        null,
        "not an object",
        { label: "When" }, // missing title
        { title: "The rooftop" }, // missing label
        { label: "", title: "Empty label" }, // blank label
        { label: "Where", title: "The rooftop" }, // valid — survives
      ],
    });
    expect(inviteToStoryConfig(invite, {}).events).toEqual([
      { label: "Where", title: "The rooftop" },
    ]);
  });

  it("returns an empty photo array when the invite has no photos", () => {
    expect(inviteToStoryConfig(makeInvite({ photos: [] }), {}).photos).toEqual([]);
  });

  it("remaps invite photos to story photos (url→src, caption, rotation)", () => {
    const invite = makeInvite({
      photos: [
        { url: "https://cdn/1.jpg", caption: "us, obviously", rotation_deg: -6 },
        { url: "https://cdn/2.jpg", caption: undefined, rotation_deg: 5 },
      ],
    });
    expect(inviteToStoryConfig(invite, {}).photos).toEqual([
      { src: "https://cdn/1.jpg", caption: "us, obviously", rotationDeg: -6 },
      { src: "https://cdn/2.jpg", caption: undefined, rotationDeg: 5 },
    ]);
  });

  it("leaves countdownTo undefined when the invite has no countdown date", () => {
    expect(inviteToStoryConfig(makeInvite({ countdown_date: null }), {}).countdownTo).toBeUndefined();
  });

  it("carries the countdown date into countdownTo when present", () => {
    const invite = makeInvite({ countdown_date: "2026-10-24T17:30:00.000Z" });
    expect(inviteToStoryConfig(invite, {}).countdownTo).toBe("2026-10-24T17:30:00.000Z");
  });

  it("leaves sender undefined when no sender name is provided", () => {
    expect(inviteToStoryConfig(makeInvite(), {}).sender).toBeUndefined();
  });

  it("uses the provided sender name", () => {
    const config = inviteToStoryConfig(makeInvite(), { senderName: "Dev" });
    expect(config.sender).toBe("Dev");
  });

  it("sets occasionLine from the provided occasion label", () => {
    const config = inviteToStoryConfig(makeInvite(), { occasionLabel: "Birthday Wish" });
    expect(config.occasionLine).toBe("Birthday Wish");
  });

  it("defaults occasionLine to an empty string when no label is provided", () => {
    expect(inviteToStoryConfig(makeInvite(), {}).occasionLine).toBe("");
  });

  it("marks the tier paid when is_paid is true", () => {
    expect(inviteToStoryConfig(makeInvite({ is_paid: true }), {}).tier).toBe("paid");
  });

  it("marks the tier free when is_paid is false", () => {
    expect(inviteToStoryConfig(makeInvite({ is_paid: false }), {}).tier).toBe("free");
  });

  it("defaults the tier to free when is_paid is absent", () => {
    const invite = makeInvite();
    delete (invite as { is_paid?: boolean }).is_paid;
    expect(inviteToStoryConfig(invite, {}).tier).toBe("free");
  });
});
