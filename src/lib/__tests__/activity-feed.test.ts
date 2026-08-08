import {
  ACTIVITY_FEED_CAP,
  GUEST_NAME_MAX,
  buildActivityFeed,
  describeActivity,
  filterByFocus,
  groupByInvite,
  sanitizeGuestName,
  type ActivityEvent,
  type BuildActivityFeedInput,
} from "../activity-feed";

const OWNED = ["inv-1", "inv-2"];

function feed(overrides: Partial<BuildActivityFeedInput> = {}) {
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
    expect(sanitizeGuestName("   \t ")).toBeNull();
  });

  it("trims, collapses whitespace and strips control characters", () => {
    expect(sanitizeGuestName("  Ada   Lovelace ")).toBe("Ada Lovelace");
    expect(sanitizeGuestName("Ada\u0000\u001FLove\u007Flace")).toBe("Ada Love lace");
  });

  it("caps long names at GUEST_NAME_MAX with an ellipsis", () => {
    const result = sanitizeGuestName("A".repeat(GUEST_NAME_MAX + 25))!;
    expect(result).toHaveLength(GUEST_NAME_MAX + 1);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("buildActivityFeed", () => {
  it("merges views, RSVPs and answers newest-first", () => {
    const events = feed({
      views: [{ id: "v1", invite_id: "inv-1", viewed_at: "2026-08-01T10:00:00Z" }],
      rsvps: [
        { id: "r1", invite_id: "inv-1", responded_at: "2026-08-01T12:00:00Z", name: "Maya" },
      ],
      answers: [
        { id: "a1", question_id: "q1", answer: true, answered_at: "2026-08-01T11:00:00Z" },
      ],
      questions: [{ id: "q1", invite_id: "inv-1", question_text: "Can you make it?" }],
    });

    expect(events.map((e) => e.id)).toEqual(["rsvp:r1", "answer:a1", "view:v1"]);
    expect(events[0].name).toBe("Maya");
    expect(events[1].answer).toBe(true);
  });

  it("drops rows outside the caller's own invites", () => {
    const events = feed({
      views: [
        { id: "v1", invite_id: "inv-1", viewed_at: "2026-08-01T10:00:00Z" },
        { id: "v2", invite_id: "not-mine", viewed_at: "2026-08-01T10:30:00Z" },
      ],
      rsvps: [
        { id: "r1", invite_id: "not-mine", responded_at: "2026-08-01T12:00:00Z", name: "Leak" },
      ],
    });
    expect(events.map((e) => e.id)).toEqual(["view:v1"]);
  });

  it("drops answers whose question is unknown or foreign", () => {
    const events = feed({
      answers: [
        { id: "a1", question_id: "q-unknown", answer: true, answered_at: "2026-08-01T11:00:00Z" },
        { id: "a2", question_id: "q-foreign", answer: false, answered_at: "2026-08-01T11:30:00Z" },
      ],
      questions: [{ id: "q-foreign", invite_id: "not-mine", question_text: "Secret?" }],
    });
    expect(events).toEqual([]);
  });

  it("drops rows with no timestamp", () => {
    const events = feed({
      views: [{ id: "v1", invite_id: "inv-1", viewed_at: null }],
      rsvps: [{ id: "r1", invite_id: "inv-1", responded_at: null, name: "Ghost" }],
    });
    expect(events).toEqual([]);
  });

  it("caps at ACTIVITY_FEED_CAP, keeping the newest", () => {
    const views = Array.from({ length: ACTIVITY_FEED_CAP + 10 }, (_, i) => ({
      id: `v${i}`,
      invite_id: "inv-1",
      viewed_at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));
    const events = feed({ views });
    expect(events).toHaveLength(ACTIVITY_FEED_CAP);
    expect(events[0].id).toBe(`view:v${ACTIVITY_FEED_CAP + 9}`);
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

  it("orders groups by their newest event and keeps event order", () => {
    const groups = groupByInvite(events, invites);
    expect(groups.map((g) => g.invite.id)).toEqual(["inv-2", "inv-1"]);
    expect(groups[0].events.map((e) => e.id)).toEqual(["rsvp:r1", "view:v2"]);
  });

  it("drops events whose invite metadata is missing", () => {
    expect(groupByInvite(events, [invites[0]])).toHaveLength(1);
  });
});

describe("filterByFocus / describeActivity", () => {
  const events: ActivityEvent[] = [
    { id: "view:v1", kind: "view", inviteId: "inv-1", at: "2026-08-01T12:00:00Z", name: null, question: null, answer: null },
    { id: "rsvp:r1", kind: "rsvp", inviteId: "inv-1", at: "2026-08-01T11:00:00Z", name: "Jo", question: null, answer: null },
    { id: "rsvp:r2", kind: "rsvp", inviteId: "inv-1", at: "2026-08-01T10:30:00Z", name: null, question: null, answer: null },
    { id: "answer:a1", kind: "answer", inviteId: "inv-1", at: "2026-08-01T10:00:00Z", name: null, question: "Coming?", answer: false },
  ];

  it("filters by kind", () => {
    expect(filterByFocus(events, "all")).toHaveLength(4);
    expect(filterByFocus(events, "views")).toHaveLength(1);
    expect(filterByFocus(events, "rsvps")).toHaveLength(2);
    expect(filterByFocus(events, "answers")).toHaveLength(1);
  });

  it("writes the same copy the web feed does", () => {
    expect(describeActivity(events[0])).toBe("Someone peeked");
    expect(describeActivity(events[1])).toBe("Jo is in");
    expect(describeActivity(events[2])).toBe("Someone said they're in");
    expect(describeActivity(events[3])).toBe("No — “Coming?”");
  });
});
