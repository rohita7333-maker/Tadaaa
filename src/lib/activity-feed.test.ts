import { describe, it, expect } from "vitest";
import {
  ACTIVITY_FEED_CAP,
  GUEST_NAME_MAX,
  buildActivityFeed,
  describeActivity,
  filterByFocus,
  groupByInvite,
  parseFocus,
  sanitizeGuestName,
  type ActivityEvent,
} from "@/lib/activity-feed";

const OWNED = ["inv-1", "inv-2"];

function feed(overrides: Partial<Parameters<typeof buildActivityFeed>[0]> = {}) {
  return buildActivityFeed({
    views: [],
    rsvps: [],
    answers: [],
    questions: [],
    ownedInviteIds: OWNED,
    ...overrides,
  });
}

describe("sanitizeGuestName", () => {
  it("returns null for empty, whitespace, and non-string input", () => {
    expect(sanitizeGuestName(null)).toBeNull();
    expect(sanitizeGuestName(undefined)).toBeNull();
    expect(sanitizeGuestName("")).toBeNull();
    expect(sanitizeGuestName("   \t  ")).toBeNull();
  });

  it("trims and collapses internal whitespace", () => {
    expect(sanitizeGuestName("  Ada   Lovelace  ")).toBe("Ada Lovelace");
  });

  it("strips control characters", () => {
    expect(sanitizeGuestName("Ada\u0000\u001FLove\u007Flace")).toBe("Ada Love lace");
  });

  it("caps long names at GUEST_NAME_MAX with an ellipsis", () => {
    const long = "A".repeat(GUEST_NAME_MAX + 25);
    const result = sanitizeGuestName(long)!;
    expect(result).toHaveLength(GUEST_NAME_MAX + 1);
    expect(result.endsWith("…")).toBe(true);
  });

  it("leaves a name exactly at the cap untouched", () => {
    const exact = "B".repeat(GUEST_NAME_MAX);
    expect(sanitizeGuestName(exact)).toBe(exact);
  });
});

describe("buildActivityFeed", () => {
  it("merges all three sources newest-first", () => {
    const events = feed({
      views: [{ id: "v1", invite_id: "inv-1", viewed_at: "2026-08-01T10:00:00Z" }],
      rsvps: [
        {
          id: "r1",
          invite_id: "inv-1",
          responded_at: "2026-08-01T12:00:00Z",
          name: "Maya",
        },
      ],
      answers: [
        {
          id: "a1",
          question_id: "q1",
          answer: true,
          answered_at: "2026-08-01T11:00:00Z",
        },
      ],
      questions: [{ id: "q1", invite_id: "inv-1", question_text: "Can you make it?" }],
    });

    expect(events.map((e) => e.id)).toEqual(["rsvp:r1", "answer:a1", "view:v1"]);
    expect(events[0].name).toBe("Maya");
    expect(events[1].question).toBe("Can you make it?");
    expect(events[1].answer).toBe(true);
  });

  it("drops rows belonging to invites the caller does not own", () => {
    const events = feed({
      views: [
        { id: "v1", invite_id: "inv-1", viewed_at: "2026-08-01T10:00:00Z" },
        { id: "v2", invite_id: "someone-elses", viewed_at: "2026-08-01T10:30:00Z" },
      ],
      rsvps: [
        {
          id: "r1",
          invite_id: "someone-elses",
          responded_at: "2026-08-01T12:00:00Z",
          name: "Leak",
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("view:v1");
  });

  it("drops answers whose question is not one of the caller's", () => {
    const events = feed({
      answers: [
        { id: "a1", question_id: "q-unknown", answer: true, answered_at: "2026-08-01T11:00:00Z" },
        { id: "a2", question_id: "q-foreign", answer: false, answered_at: "2026-08-01T11:30:00Z" },
      ],
      questions: [{ id: "q-foreign", invite_id: "someone-elses", question_text: "Secret?" }],
    });

    expect(events).toEqual([]);
  });

  it("drops rows with a missing timestamp", () => {
    const events = feed({
      views: [{ id: "v1", invite_id: "inv-1", viewed_at: null }],
      rsvps: [{ id: "r1", invite_id: "inv-1", responded_at: null, name: "Ghost" }],
    });
    expect(events).toEqual([]);
  });

  it("sanitizes RSVP names and nulls out unnamed guests", () => {
    const events = feed({
      rsvps: [
        { id: "r1", invite_id: "inv-1", responded_at: "2026-08-01T12:00:00Z", name: "   " },
        { id: "r2", invite_id: "inv-1", responded_at: "2026-08-01T11:00:00Z", name: " Jo  Lin " },
      ],
    });
    expect(events[0].name).toBeNull();
    expect(events[1].name).toBe("Jo Lin");
  });

  it("caps the feed at ACTIVITY_FEED_CAP by default, keeping the newest", () => {
    const views = Array.from({ length: ACTIVITY_FEED_CAP + 20 }, (_, i) => ({
      id: `v${i}`,
      invite_id: "inv-1",
      // i = 0 is oldest.
      viewed_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));
    const events = feed({ views });

    expect(events).toHaveLength(ACTIVITY_FEED_CAP);
    expect(events[0].id).toBe(`view:v${ACTIVITY_FEED_CAP + 19}`);
  });

  it("honours an explicit cap", () => {
    const views = Array.from({ length: 5 }, (_, i) => ({
      id: `v${i}`,
      invite_id: "inv-1",
      viewed_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));
    expect(feed({ views, cap: 2 })).toHaveLength(2);
  });

  it("truncates very long question text", () => {
    const events = feed({
      answers: [{ id: "a1", question_id: "q1", answer: true, answered_at: "2026-08-01T11:00:00Z" }],
      questions: [{ id: "q1", invite_id: "inv-1", question_text: "Q".repeat(200) }],
    });
    expect(events[0].question!.endsWith("…")).toBe(true);
    expect(events[0].question!.length).toBeLessThanOrEqual(91);
  });
});

describe("groupByInvite", () => {
  const invites = [
    { id: "inv-1", title: "Maya's birthday", slug: "maya" },
    { id: "inv-2", title: "Anniversary", slug: "anniv" },
  ];

  const events: ActivityEvent[] = [
    { id: "rsvp:r1", kind: "rsvp", inviteId: "inv-2", at: "2026-08-01T13:00:00Z", name: "Jo", question: null, answer: null },
    { id: "view:v1", kind: "view", inviteId: "inv-1", at: "2026-08-01T12:00:00Z", name: null, question: null, answer: null },
    { id: "view:v2", kind: "view", inviteId: "inv-2", at: "2026-08-01T11:00:00Z", name: null, question: null, answer: null },
  ];

  it("groups per invite, ordered by each group's newest event", () => {
    const groups = groupByInvite(events, invites);
    expect(groups.map((g) => g.invite.id)).toEqual(["inv-2", "inv-1"]);
    expect(groups[0].events.map((e) => e.id)).toEqual(["rsvp:r1", "view:v2"]);
    expect(groups[1].events).toHaveLength(1);
  });

  it("drops events whose invite is missing from the metadata", () => {
    const groups = groupByInvite(events, [invites[0]]);
    expect(groups).toHaveLength(1);
    expect(groups[0].invite.id).toBe("inv-1");
  });

  it("returns an empty array for an empty feed", () => {
    expect(groupByInvite([], invites)).toEqual([]);
  });
});

describe("parseFocus / filterByFocus", () => {
  const events: ActivityEvent[] = [
    { id: "view:v1", kind: "view", inviteId: "inv-1", at: "2026-08-01T12:00:00Z", name: null, question: null, answer: null },
    { id: "rsvp:r1", kind: "rsvp", inviteId: "inv-1", at: "2026-08-01T11:00:00Z", name: "Jo", question: null, answer: null },
    { id: "answer:a1", kind: "answer", inviteId: "inv-1", at: "2026-08-01T10:00:00Z", name: null, question: "Coming?", answer: false },
  ];

  it("coerces unknown focus values to all", () => {
    expect(parseFocus(undefined)).toBe("all");
    expect(parseFocus("nonsense")).toBe("all");
    expect(parseFocus("../../etc")).toBe("all");
    expect(parseFocus("rsvps")).toBe("rsvps");
  });

  it("filters to the focused kind", () => {
    expect(filterByFocus(events, "all")).toHaveLength(3);
    expect(filterByFocus(events, "views").map((e) => e.id)).toEqual(["view:v1"]);
    expect(filterByFocus(events, "rsvps").map((e) => e.id)).toEqual(["rsvp:r1"]);
    expect(filterByFocus(events, "answers").map((e) => e.id)).toEqual(["answer:a1"]);
  });
});

describe("describeActivity", () => {
  const base = { inviteId: "inv-1", at: "2026-08-01T12:00:00Z" } as const;

  it("keeps views anonymous", () => {
    expect(
      describeActivity({ ...base, id: "view:v1", kind: "view", name: null, question: null, answer: null })
    ).toBe("Someone peeked");
  });

  it("names RSVPs when a name was given, stays anonymous otherwise", () => {
    expect(
      describeActivity({ ...base, id: "rsvp:r1", kind: "rsvp", name: "Jo", question: null, answer: null })
    ).toBe("Jo is in");
    expect(
      describeActivity({ ...base, id: "rsvp:r2", kind: "rsvp", name: null, question: null, answer: null })
    ).toBe("Someone said they're in");
  });

  it("renders the yes/no verdict with the question", () => {
    expect(
      describeActivity({ ...base, id: "answer:a1", kind: "answer", name: null, question: "Coming?", answer: true })
    ).toBe("Yes — “Coming?”");
    expect(
      describeActivity({ ...base, id: "answer:a2", kind: "answer", name: null, question: "Coming?", answer: false })
    ).toBe("No — “Coming?”");
  });
});
