/// <reference types="jest" />
import { inviteToStoryConfig, type InviteForStory } from "../from-invite";

function baseInvite(overrides: Partial<InviteForStory> = {}): InviteForStory {
  return {
    slug: "maya-30th",
    title: "Maya",
    message: "Thirty years of you making every room warmer.",
    countdown_date: "2026-10-24T17:30:00",
    is_paid: false,
    photos: [],
    ...overrides,
  };
}

describe("inviteToStoryConfig", () => {
  it("maps recipient, occasion, sender, and message onto the story config", () => {
    const invite = baseInvite();

    const config = inviteToStoryConfig(invite, {
      senderName: "Dev",
      occasionLabel: "Birthday Wish",
    });

    expect(config.slug).toBe("maya-30th");
    expect(config.recipient).toBe("Maya");
    expect(config.eyebrow).toBe("a surprise for");
    expect(config.occasionLine).toBe("Birthday Wish");
    expect(config.sender).toBe("Dev");
    expect(config.message).toBe(invite.message);
    expect(config.events).toEqual([]);
  });

  it("returns an empty photos array when the invite has no photos", () => {
    const invite = baseInvite({ photos: [] });

    const config = inviteToStoryConfig(invite, {});

    expect(config.photos).toEqual([]);
  });

  it("leaves countdownTo undefined when countdown_date is null", () => {
    const invite = baseInvite({ countdown_date: null });

    const config = inviteToStoryConfig(invite, {});

    expect(config.countdownTo).toBeUndefined();
  });

  it("remaps photo url/caption/rotation_deg to src/caption/rotationDeg in order", () => {
    const invite = baseInvite({
      photos: [
        { url: "https://example.com/a.jpg", caption: "the rooftop", rotation_deg: -6 },
        { url: "https://example.com/b.jpg", rotation_deg: 5 },
      ],
    });

    const config = inviteToStoryConfig(invite, {});

    expect(config.photos).toEqual([
      { src: "https://example.com/a.jpg", caption: "the rooftop", rotationDeg: -6 },
      { src: "https://example.com/b.jpg", caption: undefined, rotationDeg: 5 },
    ]);
  });

  it("defaults sender and occasionLine when no sender name is supplied", () => {
    const invite = baseInvite();

    const config = inviteToStoryConfig(invite, {});

    expect(config.sender).toBeUndefined();
    expect(config.occasionLine).toBe("");
  });

  it("derives tier from is_paid — true maps to paid, false/undefined maps to free", () => {
    expect(inviteToStoryConfig(baseInvite({ is_paid: true }), {}).tier).toBe("paid");
    expect(inviteToStoryConfig(baseInvite({ is_paid: false }), {}).tier).toBe("free");
    expect(inviteToStoryConfig(baseInvite({ is_paid: undefined }), {}).tier).toBe("free");
  });

  it("maps invite.events jsonb into StoryEvent[], carrying optional detail/mapsQuery", () => {
    const invite = baseInvite({
      events: [
        {
          label: "When",
          title: "Saturday, October 24 · 5:30 PM",
          detail: "golden hour",
          mapsQuery: "Sunset Terrace, Hyderabad",
        },
        { label: "Dress code", title: "Something gold" },
      ],
    });

    const config = inviteToStoryConfig(invite, {});

    expect(config.events).toEqual([
      {
        label: "When",
        title: "Saturday, October 24 · 5:30 PM",
        detail: "golden hour",
        mapsQuery: "Sunset Terrace, Hyderabad",
      },
      { label: "Dress code", title: "Something gold", detail: undefined, mapsQuery: undefined },
    ]);
  });

  it("falls back to an empty events array when events is null or not an array", () => {
    expect(inviteToStoryConfig(baseInvite({ events: null }), {}).events).toEqual([]);
    expect(inviteToStoryConfig(baseInvite({ events: undefined }), {}).events).toEqual([]);
    expect(inviteToStoryConfig(baseInvite({ events: "not-an-array" }), {}).events).toEqual([]);
    expect(inviteToStoryConfig(baseInvite({ events: { label: "x", title: "y" } }), {}).events).toEqual([]);
  });

  it("filters out malformed event items, keeping only well-formed ones", () => {
    const invite = baseInvite({
      events: [
        { label: "Good", title: "Kept" },
        { label: "Missing title" },
        { title: "Missing label" },
        { label: "", title: "Empty label" },
        null,
        "a string",
        { label: 42, title: "Non-string label" },
        { label: "Second good", title: "Also kept", detail: 99 },
      ],
    });

    const config = inviteToStoryConfig(invite, {});

    expect(config.events).toEqual([
      { label: "Good", title: "Kept", detail: undefined, mapsQuery: undefined },
      { label: "Second good", title: "Also kept", detail: undefined, mapsQuery: undefined },
    ]);
  });
});
