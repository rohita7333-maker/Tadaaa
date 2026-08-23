import { tallyRsvps } from "../rsvp-counts";

/**
 * `invites.response_count` counts ANSWERS. RSVPs come from aggregating
 * `invite_rsvps`, exactly as web's dashboard does. These pin the grouping.
 */
describe("tallyRsvps", () => {
  it("returns an empty map for no rows", () => {
    expect(tallyRsvps([])).toEqual({});
  });

  it("counts one row per RSVP, grouped by invite", () => {
    expect(
      tallyRsvps([
        { invite_id: "a" },
        { invite_id: "b" },
        { invite_id: "a" },
        { invite_id: "a" },
      ])
    ).toEqual({ a: 3, b: 1 });
  });

  it("omits invites with no RSVPs rather than reporting zero", () => {
    // The caller renders `rsvpCounts[id] ?? 0`, so absence and zero read the
    // same on screen — but the map must not invent keys it never saw.
    expect(tallyRsvps([{ invite_id: "a" }])).not.toHaveProperty("b");
  });
});
