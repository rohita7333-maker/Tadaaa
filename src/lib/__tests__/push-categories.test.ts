import {
  MODERATION_ACTIONS,
  PUSH_CATEGORIES,
  SCHEDULED_LIVE_LEAD_MS,
  contributionActionStatus,
  notificationRoute,
  scheduledLiveReminders,
} from "../push-categories";

describe("PUSH_CATEGORIES", () => {
  it("declares the handoff's five categories, by the handoff's identifiers", () => {
    expect(PUSH_CATEGORIES.map((c) => c.identifier)).toEqual([
      "VIEW_OPENED",
      "NEW_CONTRIBUTION",
      "RSVP",
      "OCCASION_REMINDER",
      "SCHEDULED_LIVE",
    ]);
  });

  it("puts Approve and Reject only on NEW_CONTRIBUTION — the one that moderates", () => {
    for (const category of PUSH_CATEGORIES) {
      const ids = category.actions.map((a) => a.identifier);
      if (category.identifier === "NEW_CONTRIBUTION") {
        expect(ids).toEqual(["APPROVE_CONTRIBUTION", "REJECT_CONTRIBUTION"]);
      } else {
        expect(ids).toEqual([]);
      }
    }
  });

  it("does not open the app to approve, and does open it to reject", () => {
    const [approve, reject] = PUSH_CATEGORIES.find(
      (c) => c.identifier === "NEW_CONTRIBUTION"
    )!.actions;

    // "Hold to approve without opening the app" is printed on the frame.
    expect(approve.options.opensAppToForeground).toBe(false);
    // Rejecting is the destructive half; it is marked as such so iOS tints it,
    // but it still resolves in the background — the whole point of the action.
    expect(reject.options.isDestructive).toBe(true);
    expect(reject.options.opensAppToForeground).toBe(false);
  });

  it("names the two actions the way the moderation queue already does", () => {
    const actions = PUSH_CATEGORIES.find((c) => c.identifier === "NEW_CONTRIBUTION")!.actions;
    expect(actions.map((a) => a.buttonTitle)).toEqual(["Approve", "Reject"]);
  });
});

describe("contributionActionStatus", () => {
  it("maps each action identifier onto the moderation status it writes", () => {
    expect(contributionActionStatus("APPROVE_CONTRIBUTION")).toBe("approved");
    expect(contributionActionStatus("REJECT_CONTRIBUTION")).toBe("rejected");
  });

  it("returns null for the default tap and for anything unrecognised", () => {
    // `expo-notifications` sends this identifier when the body is tapped.
    expect(contributionActionStatus("expo.modules.notifications.actions.DEFAULT")).toBeNull();
    expect(contributionActionStatus("")).toBeNull();
    expect(contributionActionStatus("APPROVE")).toBeNull();
  });

  it("exposes the same two identifiers it maps, so the two cannot drift", () => {
    expect(Object.keys(MODERATION_ACTIONS).sort()).toEqual([
      "APPROVE_CONTRIBUTION",
      "REJECT_CONTRIBUTION",
    ]);
  });
});

describe("notificationRoute", () => {
  it("sends a view, an RSVP and a scheduled-live notice to that surprise", () => {
    for (const category of ["VIEW_OPENED", "RSVP", "SCHEDULED_LIVE"]) {
      expect(notificationRoute({ category, inviteId: "abc-123" })).toBe("/invite/abc-123");
    }
  });

  it("sends a contribution to the moderation queue, not to the surprise", () => {
    expect(notificationRoute({ category: "NEW_CONTRIBUTION", inviteId: "abc-123" })).toBe(
      "/activity"
    );
  });

  it("sends an occasion reminder to the wizard, which is the action it asks for", () => {
    expect(notificationRoute({ category: "OCCASION_REMINDER" })).toBe("/create");
  });

  it("refuses a route when the payload has no invite to route to", () => {
    expect(notificationRoute({ category: "VIEW_OPENED" })).toBeNull();
    expect(notificationRoute({ category: "VIEW_OPENED", inviteId: "" })).toBeNull();
  });

  it("refuses an invite id that is not a plain uuid-ish token", () => {
    // The payload is attacker-influenced in principle: it arrives from the
    // push service, not from this app. A path segment must never carry one.
    for (const bad of ["../../settings", "a/b", "abc?x=1", "abc#frag", 42, null]) {
      expect(notificationRoute({ category: "VIEW_OPENED", inviteId: bad })).toBeNull();
    }
  });

  it("refuses an unknown category rather than guessing a screen", () => {
    expect(notificationRoute({ category: "SOMETHING_NEW", inviteId: "abc-123" })).toBeNull();
    expect(notificationRoute(null)).toBeNull();
    expect(notificationRoute("nope")).toBeNull();
  });
});

describe("scheduledLiveReminders", () => {
  const NOW = new Date("2026-08-17T09:00:00Z");

  it("schedules one reminder per future scheduled surprise", () => {
    const out = scheduledLiveReminders(
      [
        { id: "a", title: "Maya turns thirty", countdown_date: "2026-08-20T18:00:00Z" },
        { id: "b", title: "Six years", countdown_date: "2026-09-01T12:00:00Z" },
      ],
      NOW
    );
    expect(out.map((r) => r.inviteId)).toEqual(["a", "b"]);
    expect(out[0].fireAt.toISOString()).toBe("2026-08-20T18:00:00.000Z");
    expect(out[0].title).toBe("Maya turns thirty");
  });

  it("drops anything already past, or due sooner than the lead time", () => {
    const out = scheduledLiveReminders(
      [
        { id: "past", title: "Gone", countdown_date: "2026-08-16T18:00:00Z" },
        {
          id: "imminent",
          title: "Any second",
          countdown_date: new Date(NOW.getTime() + SCHEDULED_LIVE_LEAD_MS - 1).toISOString(),
        },
        {
          id: "ok",
          title: "Later",
          countdown_date: new Date(NOW.getTime() + SCHEDULED_LIVE_LEAD_MS + 60_000).toISOString(),
        },
      ],
      NOW
    );
    expect(out.map((r) => r.inviteId)).toEqual(["ok"]);
  });

  it("drops rows with no date and rows whose date does not parse", () => {
    expect(
      scheduledLiveReminders(
        [
          { id: "a", title: "No date", countdown_date: null },
          { id: "b", title: "Junk", countdown_date: "not-a-date" },
        ],
        NOW
      )
    ).toEqual([]);
  });

  it("falls back to a neutral name rather than printing an empty notification", () => {
    const out = scheduledLiveReminders(
      [{ id: "a", title: "   ", countdown_date: "2026-09-01T12:00:00Z" }],
      NOW
    );
    expect(out[0].title).toBe("Your surprise");
  });

  it("orders soonest first, so a truncated schedule keeps the nearest ones", () => {
    const out = scheduledLiveReminders(
      [
        { id: "far", title: "Far", countdown_date: "2026-10-01T12:00:00Z" },
        { id: "near", title: "Near", countdown_date: "2026-08-19T12:00:00Z" },
      ],
      NOW
    );
    expect(out.map((r) => r.inviteId)).toEqual(["near", "far"]);
  });
});
